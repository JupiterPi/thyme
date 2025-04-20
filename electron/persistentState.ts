import { auditTime, BehaviorSubject, combineLatest, first, map, Observable, shareReplay, skip } from "rxjs"
import { randomUUID } from "node:crypto"
import { PathLike } from "node:fs"
import fs from "node:fs/promises"
import { exists } from "./util"
import { State, TimeEntry } from "./types"

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
                this.timeEntries$.next([...timeEntries, newTimeEntry])
                resolve(newTimeEntry)
            })
        })
    }

    public updateTimeEntry(updatedTimeEntry: TimeEntry) {
        return new Promise<TimeEntry>(resolve => {
            this.timeEntries$.pipe(first()).subscribe(timeEntries => {
                const updatedEntries = timeEntries.map(timeEntry => timeEntry.id === updatedTimeEntry.id ? updatedTimeEntry : timeEntry)
                this.timeEntries$.next(updatedEntries)
                resolve(updatedTimeEntry)
            })
        })
    }

    private state$ = combineLatest([this.activeStartTime$, this.timeEntries$]).pipe(
        map(([activeStartTime, timeEntries]) => ({ activeStartTime, timeEntries } satisfies State)),
        shareReplay(1) /* like BehaviorSubject */
    ) as Observable<State>

    public getState() {
        return this.state$
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
            return JSON.parse(file) as State
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