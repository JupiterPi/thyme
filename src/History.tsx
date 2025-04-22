import { useContext, useState } from "react"
import { StateContext } from "./main"
import dateFormat from "dateformat"
import { TimeEntry } from "../electron/types"
import { getDuration, pad2 } from "./util"
import classNames from "classnames"
import ipc from "./ipc"

export function History() {
    const state = useContext(StateContext)

    const [expandedId, setExpandedId] = useState<string | null>(state.timeEntries[0]?.id ?? null)

    const formatOnlyDate = (date: Date) => `${dateFormat(date, "DDDD") /* (e.g. "today") */}, ${date.toLocaleDateString()}`
    const timeEntriesGrouped = Object.values(Object.groupBy(state.timeEntries.slice().reverse(), ({startTime}) => formatOnlyDate(startTime))) as TimeEntry[][]
    
    return <>
        <div className="flex flex-col w-full gap-2 items-center">
            {timeEntriesGrouped.length > 0 && <div className="-mb-5"></div>}
            {timeEntriesGrouped.map(entries => {
                return <>
                    <div className="text-green-700 mt-5">{formatOnlyDate(entries[0]!.startTime)}</div>
                    {entries.map((_, i) => {
                        const entry = entries[i]
                        const previousEntry: TimeEntry | undefined = entries[i + 1]
                        const nextEntry: TimeEntry | undefined = entries[i - 1]
                        return entry.id === expandedId
                        ? <TimeEntryExpanded key={entry.id} timeEntry={entry} previousEntry={previousEntry} nextEntry={nextEntry} />
                        : <TimeEntryCollapsed key={entry.id} timeEntry={entry} onExpand={() => setExpandedId(entry.id)} />
                    })}
                </>
            })}
            {state.timeEntries.length === 0 && <div className="text-green-700">No entries</div>}
        </div>
    </>
}

function TimeEntryCollapsed({ timeEntry, onExpand }: { timeEntry: TimeEntry, onExpand: () => void }) {
    const duration = getDuration(timeEntry.startTime, timeEntry.endTime)
    return (
        <div className="_container bg-green-200! hover:border-green-800! transition-[border] cursor-pointer w-fit p-1.5! flex items-center gap-3" onClick={onExpand}>
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
        const midnight = (addOneDay: boolean) => {
            const midnight = new Date(startTime)
            addOneDay && midnight.setDate(midnight.getDate() + 1)
            midnight.setHours(0, 0, 0, 0)
            return midnight
        }
        if (editingField === "start") {
            const newStartTime = new Date(startTime.getTime() + delta * 60 * 1000)
            setStartTime(clamp([midnight(false), previousEntry?.endTime], [endTime], newStartTime))
        } else if (editingField === "end") {
            const newEndTime = new Date(endTime.getTime() + delta * 60 * 1000)
            setEndTime(clamp([startTime], [midnight(true), nextEntry?.startTime], newEndTime))
        }
    }
    const saveChanges = () => {
        ipc.updateTimeEntry({ ...timeEntry, startTime: startTime, endTime: endTime })
        setEditingField(null)
    }

    const duration = getDuration(startTime, endTime)

    return (
        <div className="flex flex-col gap-0 items-center">
            <div className={classNames("_container bg-green-200! w-fit p-1.5! pt-0.5! flex items-center gap-2", {"border-b-transparent! rounded-b-[0]!": editingField !== null})}>
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