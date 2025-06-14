export const ipcPushChannels = [
    "toggleActive",
    "reduceTimeEntries",
    "deleteAllTimeEntries",
    "loadMockData",
    "openJSON",
    "exportCSV",
    "openPage",
    "closePage"
] as const

export const ipcPullChannels = [
    "state"
] as const