export const ipcPushChannels = [
    "toggleActive",
    "reduceTimeEntries",
    "reduceNotes",
    "deleteAllTimeEntriesAndNotes",
    "setKimai",
    "loadMockData",
    "openJSON",
    "exportCSV",
    "setTimelineDay",
    "openPage",
    "closePage"
] as const

export const ipcPullChannels = [
    "state",
    "timelineDay"
] as const