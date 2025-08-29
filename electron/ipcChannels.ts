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
    "kimaiUploadEntriesForDay",
] as const

export const ipcPullChannels = [
    "state",
    "timelineDay",
    "kimaiUsername",
    "kimaiOverview",
] as const