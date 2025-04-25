export const ipcPushChannels = [
    "toggleActive",
    "createTimeEntry",
    "updateTimeEntry",
    "deleteTimeEntry",
    "deleteAllTimeEntries",
    "loadMockData",
    "openHistory",
    "closePage"
] as const

export const ipcPullChannels = [
    "state"
] as const