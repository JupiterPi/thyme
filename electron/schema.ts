import dateFormat from "dateformat"
import z from "zod"
import { v4 as randomUUID } from "uuid"
import { createActions, stateAssertion } from "./store"

// schema

export const Activity = z.object({
    name: z.string(),
    kimai: z.object({
        projectId: z.number().int().nonnegative(),
        activityId: z.number().int().nonnegative(),
    }).optional()
})
export type Activity = z.infer<typeof Activity>

export const TimeEntry = z.object({
    id: z.uuid().default(() => randomUUID()),
    startTime: z.date(),
    endTime: z.date(),
    activity: Activity.optional(),
})
export type TimeEntry = z.infer<typeof TimeEntry>

export const Note = z.object({
    id: z.uuid().default(() => randomUUID()),
    time: z.date().default(() => new Date()),
    text: z.string(),
})
export type Note = z.infer<typeof Note>

export const Kimai = z.object({
    url: z.url({ protocol: /^https?$/, hostname: z.regexes.hostname }),
    authToken: z.string().regex(/^[a-zA-Z0-9]{25}$/),
    cutoff: z.date().default(() => new Date()),
    kimaiActivity: z.object({ projectId: z.number().int().nonnegative(), activityId: z.number().int().nonnegative() }).optional(),
    uploadedEntries: z.array(z.object({
        entry: TimeEntry,
        notes: z.array(Note),
        kimaiTimesheetId: z.number().int().nonnegative(),
    })).default([]),
})
export type Kimai = z.infer<typeof Kimai>

export const State = z.object({
    activeStartTime: z.date().nullable().default(null),
    activity: Activity.nullable().default(null),
    timeEntries: z.array(TimeEntry).default([]),
    notes: z.array(Note).default([]),
    kimai: Kimai.optional(),
})
export type State = z.infer<typeof State>
export const defaultState = State.parse({})

const stateWithAssertion = {
    isNotActive: stateAssertion<State>(state => state.activeStartTime === null, "Timer is active"),
    isKimaiEnabled: stateAssertion<State>(state => state.kimai !== undefined, "Kimai is not enabled"),
    isKimaiDisabled: stateAssertion<State>(state => state.kimai === undefined, "Kimai is not disabled"),
}

// actions

export const { actions, actionResolver } = createActions<State>()({
    toggleActive: () => state => state.activeStartTime === null
        ? { ...state, activeStartTime: new Date() }
        : { ...state, activeStartTime: null, timeEntries: [...state.timeEntries, TimeEntry.parse({ startTime: state.activeStartTime, endTime: new Date(), activity: state.activity ?? undefined } satisfies Omit<TimeEntry, "id">)] },
    setActivity: (activity: Activity | null) => state => ({ ...stateWithAssertion.isNotActive(state), activity: activity === null ? null : Activity.parse(activity) }),
    createTimeEntry: (entry: Omit<TimeEntry, "id">) => state => ({ ...state, timeEntries: [...state.timeEntries, TimeEntry.parse(entry)] }),
    updateTimeEntry: (entry: TimeEntry) => state => ({ ...state, timeEntries: [...state.timeEntries.filter(e => e.id !== entry.id), TimeEntry.parse(entry)] }),
    deleteTimeEntry: (entry: TimeEntry) => state => ({ ...state, timeEntries: state.timeEntries.filter(e => e.id !== entry.id) }),
    createNote: (note: Omit<Note, "id" | "time">) => state => ({ ...state, notes: [...state.notes, Note.parse(note)] }),
    updateNote: (note: Note) => state => ({ ...state, notes: [...state.notes.filter(n => n.id !== note.id), Note.parse(note)] }),
    deleteNote: (note: Note) => state => ({ ...state, notes: state.notes.filter(n => n.id !== note.id) }),
    deleteAllTimeEntriesAndNotes: () => state => ({ ...state, timeEntries: [], notes: [] }),
    enableKimai: (url: string, authToken: string) => state => ({ ...stateWithAssertion.isKimaiDisabled(state), kimai: Kimai.parse({ url, authToken }) }),
    updateKimaiUploadedEntries: (uploadedEntries: Kimai["uploadedEntries"]) => state => ({ ...stateWithAssertion.isKimaiEnabled(state), kimai: { ...state.kimai!, uploadedEntries } }),
    disableKimai: () => state => ({ ...stateWithAssertion.isKimaiEnabled(state), kimai: undefined }),
})

// todo: it seems liek normalizeTimeEntries is not used anymore, fix that!
export const mergeThreshold = 1 * 60 * 1000
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