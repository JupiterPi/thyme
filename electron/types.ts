export type State = {
    activeStartTime: Date | null,
    timeEntries: TimeEntry[],
}

export const nullState = {
    activeStartTime: null,
    timeEntries: [],
}

export type TimeEntry = {
    id: string,
    startTime: Date,
    endTime: Date,
}

export type TimeEntriesAction = {
    type: "createEntry",
    startTime: Date,
    endTime: Date,
} | {
    type: "updateEntry",
    entry: TimeEntry,
} | {
    type: "deleteEntry",
    id: string,
}

export const mergeThreshold = 1 * 60 * 1000
