export const ipcPushChannels = [
    "toggleActive",
    "reduceTimeEntries",
    "reduceNotes",
    "deleteAllTimeEntriesAndNotes",
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