export const ipcPushChannels = [
    "toggleActive",
    "reduceTimeEntries",
    "deleteAllTimeEntries",
    "reduceNotes",
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