export const ipcPushChannels = [
    "toggleActive",
    "updateTimeEntry",
    "deleteTimeEntry",
    "deleteAllTimeEntries",
    "openHistory",
    "closePage"
] as const

export const ipcPullChannels = [
    "state"
] as const