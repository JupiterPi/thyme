export const ipcPushChannels = [
    "toggleActive",
    "reduceTimeEntries",
    "deleteAllTimeEntries",
    "loadMockData",
    "openPage",
    "closePage"
] as const

export const ipcPullChannels = [
    "state"
] as const