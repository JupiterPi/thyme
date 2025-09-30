import { auditTime, distinctUntilChanged, filter, map, shareReplay, switchMap } from "rxjs"
import { PersistentState } from "../persistentState"
import { KimaiAPI } from "./kimaiApi"
import { actions, Kimai } from "../schema"
import { showGlobalError } from "../main"

export function makeKimaiIntegration(persistentState: PersistentState) {
    const api$ = persistentState.getState().pipe(
        map(state => state.kimai === undefined ? undefined : new KimaiAPI(state.kimai!.url, state.kimai!.authToken)),
        shareReplay(1)
    )

    const username$ = api$.pipe(
        filter(api => api !== undefined),
        switchMap(async api => {
            try {
                const user = (await api.fetchCurrentUser())
                return user.alias ?? user.username
            } catch (e) {
                showGlobalError("Failed to fetch Kimai user", e)
                return undefined
            }
        }),
        filter(username => username !== undefined),
        shareReplay(1)
    )

    const projectsAndActivities$ = api$.pipe(
        filter(api => api !== undefined),
        switchMap(async api => {
            const [projects, activities] = await Promise.all([
                api.fetchProjects(),
                api.fetchActivities()
            ])
            return projects.map(project => ({
                project: { id: project.id, name: project.name },
                activities: activities
                    .filter(activity => activity.project === project.id || (project.globalActivities && activity.project === null))
                    .map(activity => ({ id: activity.id, name: activity.name }))
            }))
        }),
        shareReplay(1)
    )

    // sync entries
    persistentState.getState().pipe(
        distinctUntilChanged((previous, current) => {
            return JSON.stringify(previous) === JSON.stringify(current)
        }),
        auditTime(1000),
        switchMap(async state => {
            if (state.kimai === undefined) return
            const kimai = state.kimai!
            const api = new KimaiAPI(kimai.url, kimai.authToken)

            // compute entries to compare, handling cutoff and ignoring those without Kimai activity fields
            const currentEntries = state.timeEntries
                .filter(entry => entry.startTime.getTime() >= kimai.cutoff.getTime())
                .filter(entry => entry.activity?.kimai !== undefined)
                .map(entry => {
                    const entryNotes = state.notes.filter(note => entry.startTime.getTime() <= note.time.getTime() && note.time.getTime() <= entry.endTime.getTime())
                    return { entry, entryNotes }
                })
            const uploadedEntries = kimai.uploadedEntries.filter(entry => entry.entry.startTime.getTime() >= kimai.cutoff.getTime())

            const promises: Promise<Kimai["uploadedEntries"][0] | undefined>[] = []

            // write current entries
            for (const currentEntry of currentEntries) {
                promises.push((async () => {
                    const uploadedEntry = uploadedEntries.find(uploadedEntry => uploadedEntry.entry.id === currentEntry.entry.id)
                    if (uploadedEntry === undefined || JSON.stringify(currentEntry.entry) !== JSON.stringify(uploadedEntry.entry) || JSON.stringify(currentEntry.entryNotes) !== JSON.stringify(uploadedEntry.notes)) {
                        if (uploadedEntry !== undefined) {
                            try {
                                await api.deleteTimesheet(uploadedEntry.timesheetId)
                                console.log("Deleted outdated entry: ", uploadedEntry.entry.startTime)
                            } catch (e) {
                                showGlobalError("Failed to delete Kimai entry", e)
                            }
                        }
                        const kimaiActivity = currentEntry.entry.activity!.kimai! // filtered before
                        try {
                            const { id: timesheetId } = await api.createThymeTimesheet(kimaiActivity.projectId, kimaiActivity.activityId, currentEntry.entry, currentEntry.entryNotes)
                            console.log("Created entry: ", currentEntry.entry.startTime)
                            return { entry: currentEntry.entry, notes: currentEntry.entryNotes, timesheetId }
                        } catch (e) {
                            showGlobalError("Failed to create Kimai entry", e)
                            return uploadedEntry
                        }
                    } else {
                        return uploadedEntry // keep existing uploaded entry
                    }
                })())
            }

            // delete uploaded entries that don't exist
            for (const uploadedEntry of uploadedEntries) {
                promises.push((async () => {
                    const currentEntry = currentEntries.find(currentEntry => currentEntry.entry.id === uploadedEntry.entry.id)
                    if (currentEntry === undefined) {
                        try {
                            await api.deleteTimesheet(uploadedEntry.timesheetId)
                            console.log("Deleted entry: ", uploadedEntry.entry.startTime)
                        } catch (e) {
                            showGlobalError("Failed to delete Kimai entry", e)
                        }
                    }
                    return undefined
                })())
            }

            return (await Promise.all(promises)).filter(entry => entry !== undefined)
        })
    ).subscribe(newUploadedEntries => {
        if (newUploadedEntries !== undefined) persistentState.dispatch(actions.updateKimaiUploadedEntries(newUploadedEntries))
    })

    return { api$, projectsAndActivities$, username$ }
}
