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

export const mergeThreshold = 1 * 60 * 1000
