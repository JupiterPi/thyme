import { combineLatest, filter, firstValueFrom, map, shareReplay, switchMap } from "rxjs"
import { PersistentState } from "../persistentState"
import { KimaiAPI } from "./kimaiApi"
import { TimeEntry } from "../types"
import { formatOnlyDate, generateHash } from "../util"

export function makeKimaiIntegration(persistentState: PersistentState) {
    const api$ = persistentState.getKimai().pipe(
        map(kimai => kimai.connection !== undefined ? new KimaiAPI(kimai.connection.url, kimai.connection.authToken) : undefined),
        shareReplay(1)
    )

    const username$ = api$.pipe(
        filter(api => api !== undefined),
        switchMap(async api => (await api.fetchCurrentUser()).alias),
        shareReplay(1)
    )

    const overview$ = combineLatest([persistentState.getTimeEntries(), persistentState.getKimai()]).pipe(
        map(([timeEntries, kimai]) => {
            const timeEntriesByDay = Object.values(Object.groupBy(timeEntries.slice().reverse(), ({startTime}) => startTime.toLocaleDateString())) as TimeEntry[][]
            return timeEntriesByDay.map(entries => {
                const day = entries[0]!.startTime.toLocaleDateString()
                const dayFormatted = formatOnlyDate(entries[0]!.startTime)
                const duration = entries.reduce((acc, entry) => acc + (entry.endTime.getTime() - entry.startTime.getTime()), 0)
                
                const uploadedChecksum = kimai.uploadedEntries.find(data => data.day === day)?.checksum
                const currentChecksum = generateHashFromEntries(entries)
                const isUploaded = uploadedChecksum !== undefined && uploadedChecksum === currentChecksum

                return { date: entries[0]!.startTime, dayFormatted, duration, isUploaded }
            })
        }),
        shareReplay(1)
    )

    const uploadEntriesForDay = async (date: Date) => {
        const api = await firstValueFrom(api$)
        if (api === undefined) return
        const day = date.toLocaleDateString()
        const entries = (await firstValueFrom(persistentState.getTimeEntries())).filter(entry => entry.startTime.toLocaleDateString() === day)
        const allNotes = await firstValueFrom(persistentState.getNotes())

        // delete any previously uploaded entries
        const existingTimesheets = await api.fetchThymeTimesheets(date)
        const deleteTimesheetPromises = []
        for (const existingTimesheet of existingTimesheets) {
            deleteTimesheetPromises.push(api.deleteTimesheet(existingTimesheet.id))
        }
        await Promise.all(deleteTimesheetPromises)

        // create new entries
        const projectId = 3; const activityId = 2; // todo: make these real
        const createTimesheetPromises = []
        for (const entry of entries) {
            const notes = allNotes.filter(note => entry.startTime.getTime() <= note.time.getTime() && note.time.getTime() <= entry.endTime.getTime())
            createTimesheetPromises.push(api.createThymeTimesheet(projectId, activityId, entry, notes))
        }
        await Promise.all(createTimesheetPromises)

        // update uploadedEntries
        persistentState.putKimaiUploadedEntry(day, generateHashFromEntries(entries))
    }

    return { api$, username$, overview$, uploadEntriesForDay }
}

function generateHashFromEntries(entries: TimeEntry[]) {
    return generateHash(JSON.stringify(entries.toSorted((a, b) => a.id.localeCompare(b.id))))
}