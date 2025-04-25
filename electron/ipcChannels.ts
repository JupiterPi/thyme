export const ipcPushChannels = [
    "toggleActive",
    "reduceTimeEntries",
    "deleteAllTimeEntries",
    "loadMockData",
    "openHistory",
    "closePage"
] as const

export const ipcPullChannels = [
    "state"
] as const