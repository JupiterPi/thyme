export type State = {
    activeStartTime: Date | null,
    timeEntries: TimeEntry[],
    notes: Note[],
}

export const nullState = {
    activeStartTime: null,
    timeEntries: [],
    notes: [],
}

export type TimeEntry = {
    id: string,
    startTime: Date,
    endTime: Date,
}

export type TimeEntriesAction = {
    action: "create",
    entry: Omit<TimeEntry, "id">,
} | {
    action: "update",
    entry: TimeEntry,
} | {
    action: "delete",
    id: string,
}

export type Note = {
    id: string,
    time: Date,
    text: string,
}

export type NotesAction = {
    action: "create",
    note: Omit<Note, "id">,
} | {
    action: "update",
    note: Note,
} | {
    action: "delete",
    id: string,
}

export const mergeThreshold = 1 * 60 * 1000
