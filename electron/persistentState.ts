import { auditTime, BehaviorSubject, combineLatest, first, map, Observable, shareReplay, skip } from "rxjs"
import { randomUUID } from "node:crypto"
import { PathLike } from "node:fs"
import fs from "node:fs/promises"
import { exists, getDuration, pad2, parseDateReviver } from "./util"
import { mergeThreshold, Note, NotesAction, nullState, State, TimeEntriesAction, TimeEntry } from "./types"
import dateFormat from "dateformat"

export class PersistentState {
    // state

    private activeStartTime$ = new BehaviorSubject<Date | null>(null)

    public getActiveStartTime() {
        return this.activeStartTime$.asObservable()
    }

    public setActiveStartTime(startTime: Date | null) {
        this.activeStartTime$.next(startTime)
    }

    private timeEntries$ = new BehaviorSubject<TimeEntry[]>([])

    public getTimeEntries() {
        return this.timeEntries$.asObservable()
    }

    public reduceTimeEntries(actions: TimeEntriesAction[]) {
        return new Promise<void>(resolve => {
            this.timeEntries$.pipe(first()).subscribe(timeEntries => {
                const updatedTimeEntries = actions.reduce(((timeEntries: TimeEntry[], action: TimeEntriesAction) => {
                    switch (action.type) {
                        case "createEntry":
                            return [...timeEntries, { id: randomUUID(), startTime: action.startTime, endTime: action.endTime }]
                        case "updateEntry":
                            return timeEntries.map(timeEntry => timeEntry.id === action.entry.id ? action.entry : timeEntry)
                        case "deleteEntry":
                            return timeEntries.filter(timeEntry => timeEntry.id !== action.id)
                    }
                }), timeEntries)
                this.timeEntries$.next(normalizeTimeEntries(updatedTimeEntries))
                resolve()
            })
        })
    }

    public addTimeEntry(startTime: Date, endTime: Date) {
        return new Promise<TimeEntry>(resolve => {
            const newTimeEntry = { id: randomUUID(), startTime, endTime }
            this.timeEntries$.pipe(first()).subscribe(timeEntries => {
                const updatedEntries = [...timeEntries, newTimeEntry]
                this.timeEntries$.next(normalizeTimeEntries(updatedEntries))
                resolve(newTimeEntry)
            })
        })
    }

    public updateTimeEntry(updatedTimeEntry: TimeEntry) {
        return new Promise<TimeEntry>(resolve => {
            this.timeEntries$.pipe(first()).subscribe(timeEntries => {
                const updatedEntries = timeEntries.map(timeEntry => timeEntry.id === updatedTimeEntry.id ? updatedTimeEntry : timeEntry)
                this.timeEntries$.next(normalizeTimeEntries(updatedEntries))
                resolve(updatedTimeEntry)
            })
        })
    }

    public deleteTimeEntry(id: string) {
        return new Promise<void>(resolve => {
            this.timeEntries$.pipe(first()).subscribe(timeEntries => {
                const updatedEntries = timeEntries.filter(timeEntry => timeEntry.id !== id)
                this.timeEntries$.next(updatedEntries)
                resolve()
            })
        })
    }

    public deleteAllTimeEntries() {
        return new Promise<void>(resolve => {
            this.timeEntries$.next([])
            resolve()
        })
    }
    
    // todo: modernize time entries handling (remove manual actions and only leave reducer, make addTimeEntry type an Omit<...> type)

    private notes$ = new BehaviorSubject<Note[]>([])
    public getNotes() {
        return this.notes$.asObservable()
    }

    public reduceNotes(actions: NotesAction[]) {
        return new Promise<void>(resolve => {
            this.notes$.pipe(first()).subscribe(notes => {
                const updatedNotes = actions.reduce(((notes: Note[], action: NotesAction) => {
                    switch (action.action) {
                        case "create":
                            return [...notes, { id: randomUUID(), ...action.note }]
                        case "update":
                            return notes.map(note => note.id === action.note.id ? action.note : note)
                        case "delete":
                            return notes.filter(note => note.id !== action.id)
                    }
                }), notes)
                this.notes$.next(updatedNotes)
                resolve()
            })
        })
    }

    private state$ = combineLatest([this.activeStartTime$, this.timeEntries$, this.notes$]).pipe(
        map(([activeStartTime, timeEntries, notes]) => ({ activeStartTime, timeEntries, notes } satisfies State)),
        shareReplay(1) /* like BehaviorSubject */
    ) as Observable<State>

    public getState() {
        return this.state$
    }

    public loadMockData() {
        return new Promise<void>(resolve => {
            const time = (hours: number, minutes: number) => {
                const date = new Date("2000-01-01T00:00:00Z")
                date.setHours(hours, minutes)
                return date
            }
            const mockData: TimeEntry[] = [
                { id: "1", startTime: time(14,0), endTime: time(14,5) },
                { id: "2", startTime: time(14,10), endTime: time(14,15) },
            ]
            this.timeEntries$.next(mockData)
            resolve()
        })
    }

    // persistence

    constructor(private persistentFile: PathLike) {
        this.readStateFromFile().then(state => {
            this.activeStartTime$.next(state.activeStartTime)
            this.timeEntries$.next(state.timeEntries)
            this.notes$.next(state.notes)

            this.state$.pipe(skip(1), auditTime(500), /* write state when it's settled */).subscribe(state => this.writeStateToFile(state))
        })
    }

    private async readStateFromFile() {
        if (await exists(this.persistentFile)) {
            const file = await fs.readFile(this.persistentFile, "utf-8")
            return JSON.parse(file, parseDateReviver) as State
        } else {
            await this.writeStateToFile(nullState)
            return nullState
        }
    }

    private async writeStateToFile(state: State) {
        const file = JSON.stringify(state, null, 2)
        await fs.writeFile(this.persistentFile, file, { encoding: "utf-8", flag: "w" })
    }

    public forceWrite() {
        return new Promise(resolve => {
            this.state$.pipe(first()).subscribe(state => {
                this.writeStateToFile(state).then(resolve)
            })
        })
    }

    public async exportCSV(file: string) {
        return new Promise<void>(resolve => {
            this.timeEntries$.pipe(first()).subscribe(entries => {
                const csv = entries.map(entry => {
                    const startTime = dateFormat(entry.startTime, "yyyy-mm-dd HH:MM:ss")
                    const endTime = dateFormat(entry.endTime, "yyyy-mm-dd HH:MM:ss")
                    const duration = getDuration(entry.startTime, entry.endTime)
                    const durationStr = `${pad2(duration.hours)}:${pad2(duration.minutes)}`
                    return [startTime, endTime, durationStr].join(";")
                }).join("\n")
                fs.writeFile(file, csv).then(resolve)
            })
        })
    }
}

export function normalizeTimeEntries(entries: TimeEntry[]) {
    const mergeEntries = (a: TimeEntry, b: TimeEntry): TimeEntry => {
        const timeBounds = [a.startTime, a.endTime, b.startTime, b.endTime].map(t => t.getTime()).toSorted()
        const startTime = new Date(timeBounds[0])
        const endTime = new Date(timeBounds[3])
        return { id: randomUUID(), startTime, endTime }
    }
    const splitEntry = (entry: TimeEntry, splitTime: Date): [TimeEntry, TimeEntry] => {
        return [
            { id: randomUUID(), startTime: entry.startTime, endTime: new Date(splitTime.getTime()) },
            { id: randomUUID(), startTime: new Date(splitTime.getTime()), endTime: entry.endTime },
        ]
    }

    entries = entries
        .filter(entry => {
            // discard negative duration entries
            return entry.startTime.getTime() < entry.endTime.getTime()
        })
        .flatMap(entry => {
            // split entries that go over midnight
            const goesOverMidnight = (entry: TimeEntry) => entry.startTime.toLocaleDateString() !== entry.endTime.toLocaleDateString() && dateFormat(entry.endTime, "HH:MM:ss.l") !== "00:00:00.000"
            if (goesOverMidnight(entry)) {
                const entries: TimeEntry[] = []
                let currentEntry: TimeEntry = entry
                const midnight = new Date(entry.startTime)
                while (goesOverMidnight(currentEntry)) {
                    midnight.setHours(24, 0, 0, 0) // set to the start of the next day
                    const [a, b] = splitEntry(currentEntry, midnight)
                    entries.push(a)
                    currentEntry = b
                }
                entries.push(currentEntry)
                return entries
            } else {
                return entry
            }
        })

    // sort entries
    const sortedEntries = entries.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    
    const mergedEntries: TimeEntry[] = []
    let currentEntry: TimeEntry | undefined = undefined
    for (const entry of sortedEntries) {
        if (currentEntry === undefined) {
            currentEntry = entry
            continue
        }
        if (
            // if the entries are overlapping, merge them
            // if the entries are below the threshold apart, merge them
            entry.startTime.getTime() - currentEntry.endTime.getTime() <= mergeThreshold
            // don't merge over midnight
            && currentEntry.startTime.toLocaleDateString() === entry.startTime.toLocaleDateString()
        ) {
            currentEntry = mergeEntries(currentEntry, entry)
        } else {
            // otherwise push the current entry and start a new one
            mergedEntries.push(currentEntry)
            currentEntry = entry
        }
    }
    if (currentEntry) {
        mergedEntries.push(currentEntry)
    }
    
    return mergedEntries
}