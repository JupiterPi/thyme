import { useContext, useState } from "react"
import { StateContext } from "./main"
import dateFormat from "dateformat"
import { mergeThreshold, TimeEntry } from "../electron/types"
import { getDuration, midnight, pad2, useEphemeralState } from "./util"
import classNames from "classnames"
import ipc from "./ipc"
import { isDev } from "./buildInfo"

export function History() {
    const state = useContext(StateContext)

    const [expandedId, setExpandedId] = useState<string | null>(state.timeEntries[0]?.id ?? null)

    const formatOnlyDate = (date: Date) => `${dateFormat(date, "DDDD") /* (e.g. "today") */}, ${date.toLocaleDateString()}`
    const timeEntriesGrouped = Object.values(Object.groupBy(state.timeEntries.slice().reverse(), ({startTime}) => formatOnlyDate(startTime))) as TimeEntry[][]

    const [confirmingDeleteAll, setConfirmingDeleteAll] = useEphemeralState(false, 2000)
    
    return <>
        <div className="flex justify-center">
            <div className="flex flex-col w-full gap-6 items-center" onMouseLeave={() => setExpandedId(null)}>
                {timeEntriesGrouped.map(entries => (
                    <div className="flex flex-col gap-2 w-full items-center" key={entries[0]!.startTime.toLocaleDateString()}>
                        <div className="text-green-700">{formatOnlyDate(entries[0]!.startTime)}</div>

                        {(() => {
                            const pauseElementId = "pause:undefined"
                            return expandedId === pauseElementId
                                ? <PauseExpanded key={pauseElementId} previousEntry={entries[0]!} nextEntry={undefined} />
                                : <PauseCollapsed key={pauseElementId} previousEntry={entries[0]!} nextEntry={undefined} onExpand={() => setExpandedId(pauseElementId)} />
                        })()}
                        
                        {entries.map((_, i) => {
                            const entry = entries[i]
                            const previousEntry: TimeEntry | undefined = entries[i + 1]
                            const nextEntry: TimeEntry | undefined = entries[i - 1]
                            const entryElementId = `entry:${entry.id}`
                            const pauseElementId = `pause:${entry.id}`
                            return <>
                                {expandedId === entryElementId
                                    ? <TimeEntryExpanded key={entryElementId} timeEntry={entry} previousEntry={previousEntry} nextEntry={nextEntry} />
                                    : <TimeEntryCollapsed key={entryElementId} timeEntry={entry} onExpand={() => setExpandedId(entryElementId)} />}
                                {expandedId === pauseElementId
                                    ? <PauseExpanded key={pauseElementId} previousEntry={previousEntry} nextEntry={entry} />
                                    : <PauseCollapsed key={pauseElementId} previousEntry={previousEntry} nextEntry={entry} onExpand={() => setExpandedId(pauseElementId)} />}
                            </>
                        })}
                    </div>
                ))}
                {state.timeEntries.length === 0 && <div className="text-green-700">No entries</div>}
                {state.timeEntries.length > 0 && <div className="_button text-sm" onClick={() => {
                    if (confirmingDeleteAll) {
                        ipc.deleteAllTimeEntries()
                        setConfirmingDeleteAll(false)
                    } else {
                        setConfirmingDeleteAll(true)
                    }
                }}>{confirmingDeleteAll ? "confirm" : "delete all"}</div>}
                {isDev && <div className="_button text-sm -mt-5" onClick={() => ipc.loadMockData()}>load mock data (dev)</div>}
            </div>
        </div>
    </>
}

function TimeEntryCollapsed({ timeEntry, onExpand }: { timeEntry: TimeEntry, onExpand: () => void }) {
    const duration = getDuration(timeEntry.startTime, timeEntry.endTime)
    return (
        <div className="_container bg-green-200! hover:border-green-800! transition-[border] cursor-pointer w-fit p-1.5! flex items-center gap-3" onMouseEnter={onExpand}>
            <div className="bg-green-300 px-1.5 rounded-lg font-mono">{dateFormat(timeEntry.startTime, "HH:MM")}</div>
            <div className="bg-green-300 px-1.5 rounded-lg font-mono">{pad2(duration.hours)}:{pad2(duration.minutes)}h</div>
            <div className="bg-green-300 px-1.5 rounded-lg font-mono">{dateFormat(timeEntry.endTime, "HH:MM") === "00:00" ? "24:00" : dateFormat(timeEntry.endTime, "HH:MM")}</div>
        </div>
    )
}

function TimeEntryExpanded({ timeEntry, previousEntry, nextEntry }: { timeEntry: TimeEntry, previousEntry?: TimeEntry, nextEntry?: TimeEntry }) {
    const [startTime, setStartTime] = useState(timeEntry.startTime)
    const [endTime, setEndTime] = useState(timeEntry.endTime)

    const [editingField, setEditingField] = useState<"start" | "end" | null>(null)

    const editField = (delta: number) => {
        const clamp = (lowerLimits: (Date | undefined)[], upperLimits: (Date | undefined)[], value: Date) => {
            let date = value.getTime()
            lowerLimits.forEach(limit => limit !== undefined && (date = Math.max(date, limit.getTime())))
            upperLimits.forEach(limit => limit !== undefined && (date = Math.min(date, limit.getTime())))
            return new Date(date)
        }
        if (editingField === "start") {
            const newStartTime = new Date(startTime.getTime() + delta * 60 * 1000)
            setStartTime(clamp([midnight(startTime, false), previousEntry?.endTime], [endTime], newStartTime))
        } else if (editingField === "end") {
            const newEndTime = new Date(endTime.getTime() + delta * 60 * 1000)
            setEndTime(clamp([startTime], [midnight(startTime, true), nextEntry?.startTime], newEndTime))
        }
    }
    const saveChanges = () => {
        ipc.reduceTimeEntries({ type: "updateEntry", entry: { ...timeEntry, startTime, endTime } })
        setEditingField(null)
    }

    const insertPause = () => {
        const [pauseStart, pauseEnd] = splitTimeEquallyWithinMergeThreshold(timeEntry.startTime, timeEntry.endTime)
        ipc.reduceTimeEntries(
            { type: "deleteEntry", id: timeEntry.id },
            { type: "createEntry", startTime: timeEntry.startTime, endTime: pauseStart },
            { type: "createEntry", startTime: pauseEnd, endTime: timeEntry.endTime },
        )
    }

    const deleteEntry = () => {
        ipc.reduceTimeEntries({ type: "deleteEntry", id: timeEntry.id })
    }

    const duration = getDuration(startTime, endTime)

    return (
        <div className="flex flex-col gap-0 items-center">
            <div className="_container bg-green-200! w-fit p-1.5! pt-0.5! flex items-center gap-2">
                {[
                    {label: "start", editable: editingField === null, hoursStr: dateFormat(startTime, "HH"), minutesStr: dateFormat(startTime, "MM")},
                    {label: "duration", editable: false, hoursStr: pad2(duration.hours), minutesStr: pad2(duration.minutes)},
                    {label: "end", editable: editingField === null, hoursStr: dateFormat(endTime, "HH") === "00" ? "24" : dateFormat(endTime, "HH"), minutesStr: dateFormat(endTime, "MM")},
                ].map(clock => (
                    <div key={clock.label} className="flex flex-col items-center">
                        <div className="text-green-600 font-medium text-sm">{clock.label}</div>
                        <div className={classNames("bg-green-300 px-2 rounded-lg group outline-1 outline-transparent", {"hover:outline-green-600 transition-[outline-color] duration-300ms cursor-pointer": clock.editable, "outline-green-600!": editingField === clock.label})} onClick={() => clock.label !== "duration" && setEditingField(clock.label as "start" | "end")}>
                            <div className={classNames("font-mono font-bold text-green-900 text-2xl", {"group-hover:animate-[pulse_1s_ease-in-out_infinite]": clock.editable})}>
                                {clock.hoursStr}
                                <span className="text-green-600">:</span>
                                {clock.minutesStr}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className={classNames("_container bg-green-200! w-fit p-1! flex items-center gap-2 border-t-transparent! rounded-t-[0]!", {"border-b-transparent! rounded-b-[0]!": editingField !== null})}>
                <div className="_button text-sm" onClick={insertPause}>insert pause</div>
                <div className="_button text-sm" onClick={deleteEntry}>delete</div>
            </div>
            {editingField !== null && (
                <div className="_container bg-green-200! w-fit p-1! flex items-center gap-1">
                    {[-60, -20, -5, -1, +1, +5, +20, +60].map(delta => (
                        <div key={delta} className="_button font-mono text-sm" onClick={() => editField(delta)}>{delta === -60 ? "-1h" : delta === +60 ? "+1h" : (delta > 0 ? `+${delta}` : delta)}</div>
                    ))}
                    <div className="w-1"></div>
                    <div className="_button font-mono text-sm" onClick={() => saveChanges()}>OK</div>
                </div>
            )}
        </div>
    )
}

function PauseCollapsed({ previousEntry, nextEntry, onExpand }: { previousEntry?: TimeEntry, nextEntry?: TimeEntry, onExpand: () => void }) {
    if (previousEntry === undefined && nextEntry === undefined) return null
    const previousTime = previousEntry?.endTime ?? midnight(nextEntry!.startTime, false)
    const nextTime = nextEntry?.startTime ?? midnight(previousEntry!.startTime, true)
    const duration = getDuration(previousTime, nextTime)
    if (duration.hours === 0 && duration.minutes === 0) return <></>
    return (
        <div className="_container text-green-700 text-sm bg-gray-200! border-gray-300! p-1.5! font-mono" onMouseEnter={onExpand}>{pad2(duration.hours)}:{pad2(duration.minutes)}h</div>
    )
}

function PauseExpanded({ previousEntry, nextEntry }: { previousEntry?: TimeEntry, nextEntry?: TimeEntry }) {
    if (previousEntry === undefined && nextEntry === undefined) return null
    const previousTime = previousEntry?.endTime ?? midnight(nextEntry!.startTime, false)
    const nextTime = nextEntry?.startTime ?? midnight(previousEntry!.startTime, true)
    const duration = getDuration(previousTime, nextTime)

    const insertEntry = () => {
        const [entryStart, entryEnd] = splitTimeEquallyWithinMergeThreshold(previousTime, nextTime)
        ipc.reduceTimeEntries({ type: "createEntry", startTime: entryStart, endTime: entryEnd })
    }

    const deletePause = () => {
        if (nextEntry !== undefined) {
            ipc.reduceTimeEntries({ type: "updateEntry", entry: { ...nextEntry, startTime: previousTime } })
        } else {
            ipc.reduceTimeEntries({ type: "updateEntry", entry: { ...previousEntry!, endTime: nextTime, } })
        }
    }

    return (
        <div className="flex flex-col gap-0 items-center">
            <div className="_container bg-gray-200! border-gray-400! w-fit p-1.5! pt-0.5! flex items-center gap-2 border-b-transparent! rounded-b-[0]!">
                <div className="flex flex-col items-center">
                        <div className="text-gray-600 font-medium text-sm">pause</div>
                        <div className="bg-gray-300 px-2 rounded-lg group outline-1 outline-transparent">
                            <div className="font-mono font-bold text-green-900 text-2xl">
                                {pad2(duration.hours)}
                                <span className="text-gray-600">:</span>
                                {pad2(duration.minutes)}
                            </div>
                        </div>
                    </div>
            </div>
            <div className="_container bg-gray-200! border-gray-400! w-fit p-1! flex items-center gap-2">
                <div className="_button text-sm" onClick={insertEntry}>insert entry</div>
                <div className="_button text-sm" onClick={deletePause}>{(previousEntry !== undefined && nextEntry !== undefined) ? "merge entries" : "delete"}</div>
            </div>
        </div>
    )
}

function splitTimeEquallyWithinMergeThreshold(startTime: Date, endTime: Date): [Date, Date] {
    const timeEntryDuration = endTime.getTime() - startTime.getTime()
    const pauseStart = Math.max(startTime.getTime() + mergeThreshold + 1, startTime.getTime() + timeEntryDuration * 0.333)
    const pauseEnd = Math.min(endTime.getTime() - mergeThreshold - 1, startTime.getTime() + timeEntryDuration * 0.666)
    return [new Date(pauseStart), new Date(pauseEnd)]
}