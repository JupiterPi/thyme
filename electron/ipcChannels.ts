export const ipcPushChannels = [
    "toggleActive",
    "updateTimeEntry",
    "openHistory",
    "closePage"
] as const

export const ipcPullChannels = [
    "state"
] as const