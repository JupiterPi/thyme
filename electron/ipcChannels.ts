export const ipcPushChannels = [
    "dispatch",
    "openJSON",
    "exportCSV",
    "setTimelineDay",
    "openPage",
    "closePage",
] as const

export const ipcPullChannels = [
    "errors",
    "state",
    "timelineDay",
    "kimaiUsername",
] as const