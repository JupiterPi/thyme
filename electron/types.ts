export type State = {
    activeStartTime: Date | null,
    timeEntries: TimeEntry[],
    notes: Note[],
    kimai: Kimai | undefined,
}

export const defaultState: State = {
    activeStartTime: null,
    timeEntries: [],
    notes: [],
    kimai: undefined,
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

export type Kimai = {
    url: string,
    authToken: string,
    cutoff: Date,
    uploadedEntries: {
        entry: TimeEntry,
        notes: Note[],
        timesheetId: number
    }[]
}

export const defaultKimai = (url: string, authToken: string): Kimai => ({
    url,
    authToken,
    cutoff: new Date(),
    uploadedEntries: []
})