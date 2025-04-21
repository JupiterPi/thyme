import { useContext, useState } from "react"
import { StateContext } from "./main"
import dateFormat from "dateformat"
import { TimeEntry } from "../electron/types"
import { getDuration, pad2 } from "./util"
import classNames from "classnames"

export function History() {
    const state = useContext(StateContext)

    const [expandedId, setExpandedId] = useState<string | null>(state.timeEntries[0]?.id ?? null)
    
    return <>
        <div className="text-green-700 font-semibold text-xl">History:</div>
        <div className="flex flex-col w-full gap-2 items-center">
            {state.timeEntries.map(entry => {
                return entry.id === expandedId
                    ? <TimeEntryExpanded key={entry.id} timeEntry={entry} updateTimeEntry={timeEntry => alert("update:" + JSON.stringify(timeEntry))} />
                    : <TimeEntryCollapsed key={entry.id} timeEntry={entry} onExpand={() => setExpandedId(entry.id)} />
            })}
            {state.timeEntries.length === 0 && <div className="text-green-700 mt-[-5px]">No entries</div>}
        </div>
    </>
}

function TimeEntryCollapsed({ timeEntry, onExpand }: { timeEntry: TimeEntry, onExpand: () => void }) {
    const duration = getDuration(timeEntry.startTime, timeEntry.endTime)
    return (
        <div className="_container bg-green-200! hover:border-green-800! transition-[border] cursor-pointer w-fit p-1.5! flex items-center gap-3" onClick={onExpand}>
            <div className="bg-green-300 px-1.5 rounded-lg font-mono">{dateFormat(timeEntry.startTime, "HH:MM")}</div>
            <div className="bg-green-300 px-1.5 rounded-lg font-mono">{pad2(duration.hours)}:{pad2(duration.minutes)}h</div>
            <div className="bg-green-300 px-1.5 rounded-lg font-mono">{dateFormat(timeEntry.endTime, "HH:MM")}</div>
        </div>
    )
}

function TimeEntryExpanded({ timeEntry, updateTimeEntry }: { timeEntry: TimeEntry, updateTimeEntry: (entry: TimeEntry) => void }) {
    const [startTime, setStartTime] = useState(timeEntry.startTime)
    const [endTime, setEndTime] = useState(timeEntry.endTime)

    const [editingField, setEditingField] = useState<"start" | "end" | null>(null)

    const editField = (delta: number) => {
        if (editingField === "start") {
            setStartTime(new Date(startTime.getTime() + delta * 60 * 1000))
        } else if (editingField === "end") {
            setEndTime(new Date(endTime.getTime() + delta * 60 * 1000))
        }
    }
    const saveChanges = () => {
        updateTimeEntry({ ...timeEntry, startTime: startTime, endTime: endTime })
        setEditingField(null)
    }

    const duration = getDuration(startTime, endTime)

    return (
        <div className="flex flex-col gap-0 items-center">
            <div className={classNames("_container bg-green-200! w-fit p-1.5! flex items-center gap-3", {"border-b-transparent! rounded-b-[0]!": editingField !== null})}>
                {[
                    {label: "start", editable: editingField === null, hoursStr: dateFormat(startTime, "HH"), minutesStr: dateFormat(startTime, "MM")},
                    {label: "duration", editable: false, hoursStr: pad2(duration.hours), minutesStr: pad2(duration.minutes)},
                    {label: "end", editable: editingField === null, hoursStr: dateFormat(endTime, "HH"), minutesStr: dateFormat(endTime, "MM")},
                ].map(clock => (
                    <div className="flex flex-col items-center">
                        <div className="text-green-600 font-medium text-sm">{clock.label}</div>
                        <div className={classNames("bg-green-300 px-2 rounded-lg group outline-1 outline-transparent", {"hover:outline-green-600 transition-[outline-color] duration-300ms cursor-pointer": clock.editable, "outline-green-600!": editingField === clock.label})} onClick={() => setEditingField(clock.label as "start" | "end")}>
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
                        <div className="_button font-mono text-sm" onClick={() => editField(delta)}>{delta === -60 ? "-1h" : delta === +60 ? "+1h" : (delta > 0 ? `+${delta}` : delta)}</div>
                    ))}
                    <div className="w-1"></div>
                    <div className="_button font-mono text-sm" onClick={() => saveChanges()}>OK</div>
                </div>
            )}
        </div>
    )
}