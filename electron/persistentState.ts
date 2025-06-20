import { auditTime, BehaviorSubject, combineLatest, first, map, Observable, shareReplay, skip } from "rxjs"
import { randomUUID } from "node:crypto"
import { PathLike } from "node:fs"
import fs from "node:fs/promises"
import { exists, getDuration, pad2, parseDateReviver } from "./util"
import { mergeThreshold, Note, NotesAction, nullState, State, TimeEntriesAction, TimeEntry } from "./types"
import dateFormat from "dateformat"
import { formatOnlyDate } from "../src/util"

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
                    switch (action.action) {
                        case "create":
                            return [...timeEntries, { id: randomUUID(), ...action.entry }]
                        case "update":
                            return timeEntries.map(timeEntry => timeEntry.id === action.entry.id ? action.entry : timeEntry)
                        case "delete":
                            return timeEntries.filter(timeEntry => timeEntry.id !== action.id)
                    }
                }), timeEntries)
                this.timeEntries$.next(normalizeTimeEntries(updatedTimeEntries))
                resolve()
            })
        })
    }

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

    public deleteAllTimeEntriesAndNotes() {
        return new Promise<void>(resolve => {
            this.timeEntries$.next([])
            this.notes$.next([])
            resolve()
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
            const state = JSON.parse(file, parseDateReviver)
            return { ...nullState, ...state } as State
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

    public async exportCSV(file: string, type: "byDay" | "allEntries") {
        return new Promise<void>(resolve => {
            this.state$.pipe(first()).subscribe(({ timeEntries: entries, notes }) => {
                const csv = (() => {
                    if (type === "byDay") {
                        const entriesByDay = Object.values(Object.groupBy(entries.slice(), ({startTime}) => formatOnlyDate(startTime))) as TimeEntry[][]
                        return entriesByDay.map(dailyEntries => {
                            const date = dateFormat(dailyEntries[0].startTime, "yyyy-mm-dd")
                            const totalTime = dailyEntries.reduce((total, entry) => total + entry.endTime.getTime() - entry.startTime.getTime(), 0)
                            const totalTimeDuration = getDuration(new Date(0), new Date(totalTime))
                            const totalTimeStr = `${pad2(totalTimeDuration.hours)}:${pad2(totalTimeDuration.minutes)}`
                            const notesStr = notes.filter(note => formatOnlyDate(note.time) === formatOnlyDate(dailyEntries[0].startTime))
                                .map(note => note.text.replace(/;/g, ",").replace(/\n/, "  ")).join(" -- ")
                            return [date, totalTimeStr, notesStr].join(";")
                        }).join("\n")
                    } else if (type === "allEntries") {
                        return entries.map(entry => {
                            const startTime = dateFormat(entry.startTime, "yyyy-mm-dd HH:MM:ss")
                            const endTime = dateFormat(entry.endTime, "yyyy-mm-dd HH:MM:ss")
                            const duration = getDuration(entry.startTime, entry.endTime)
                            const durationStr = `${pad2(duration.hours)}:${pad2(duration.minutes)}`
                            return [startTime, endTime, durationStr].join(";")
                        }).join("\n")
                    }
                    throw Error("Invalid export type")
                })()
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