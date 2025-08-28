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
    "closePage",
    "getKimaiUsername",
] as const

export const ipcPullChannels = [
    "state",
    "timelineDay",
] as const