import { auditTime, BehaviorSubject, combineLatest, first, map, Observable, shareReplay, skip } from "rxjs"
import { randomUUID } from "node:crypto"
import { PathLike } from "node:fs"
import fs from "node:fs/promises"
import { exists, parseDateReviver } from "./util"
import { mergeThreshold, State, TimeEntry } from "./types"
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

    private state$ = combineLatest([this.activeStartTime$, this.timeEntries$]).pipe(
        map(([activeStartTime, timeEntries]) => ({ activeStartTime, timeEntries } satisfies State)),
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

            this.state$.pipe(skip(1), auditTime(500), /* write state when it's settled */).subscribe(state => this.writeStateToFile(state))
        })
    }

    private async readStateFromFile() {
        if (await exists(this.persistentFile)) {
            const file = await fs.readFile(this.persistentFile, "utf-8")
            return JSON.parse(file, parseDateReviver) as State
        } else {
            const state = { activeStartTime: null, timeEntries: [] }
            await this.writeStateToFile(state)
            return state
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
                let midnight = new Date(entry.startTime)
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