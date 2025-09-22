import { auditTime, firstValueFrom, skip } from "rxjs"
import { PathLike } from "node:fs"
import fs from "node:fs/promises"
import { exists, getDuration, pad2, parseDateReviver } from "./util"
import dateFormat from "dateformat"
import { formatOnlyDate } from "../src/util"
import { defaultState, State, TimeEntry, actionResolver } from "./schema"
import { createStore } from "./store"

export class PersistentState {
    private store

    public getState() {
        return this.store.state$
    }

    public async getCurrentState() {
        return await firstValueFrom(this.store.state$)
    }

    public get dispatch() {
        return this.store.dispatch
    }

    // persistence

    constructor(private persistentFile: PathLike) {
        this.store = createStore(async () => this.readStateFromFile(), actionResolver)
        this.store.state$.pipe(
            skip(2), // skip initial default state and read state
            auditTime(500), // write state when it's settled
        ).subscribe(state => this.writeStateToFile(state))
    }

    private async readStateFromFile() {
        if (await exists(this.persistentFile)) {
            const file = await fs.readFile(this.persistentFile, "utf-8")
            const state = JSON.parse(file, parseDateReviver)
            const parseResult = State.safeParse(state)
            if (parseResult.success) {
                return parseResult.data
            } else {
                return defaultState
            }
        } else {
            await this.writeStateToFile(defaultState)
            return defaultState
        }
    }

    private async writeStateToFile(state: State) {
        const file = JSON.stringify(state, null, 2)
        await fs.writeFile(this.persistentFile, file, { encoding: "utf-8", flag: "w" })
    }

    public async forceWrite() {
        const state = await this.getCurrentState()
        await this.writeStateToFile(state)
    }

    // export

    public async exportCSV(file: string, type: "byDay" | "allEntries") {
        const { timeEntries: entries, notes } = await this.getCurrentState()
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
        await fs.writeFile(file, csv)
    }
}
