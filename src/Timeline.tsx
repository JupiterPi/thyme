import { useContext, useEffect, useState } from "react"
import ipc from "./ipc"
import { StateContext } from "./main"
import { formatOnlyDate, getFractionalHours, pad2 } from "./util"
import { TimeEntry } from "../electron/types"
import { useMeasure } from "@uidotdev/usehooks"

export function Timeline() {
    const state = useContext(StateContext)
    const [timelineDay, setTimelineDay] = useState<string | null>(null)
    const [entries, setEntries] = useState<TimeEntry[]>([])
    useEffect(() => {
        const subscription = ipc.timelineDay.subscribe(date => {
            setTimelineDay(date)
            setEntries(state.timeEntries.filter(entry => formatOnlyDate(entry.startTime) === date))
        })
        return () => subscription.unsubscribe()
    }, [state])

    const [containerRef, { height: uiHeight }] = useMeasure()
    const position = (hour: number) => (uiHeight ?? 0) * (hour / 24)

    return <>
        <div className="">{timelineDay}</div>
        <div className="flex flex-col border-2 border-green-400 rounded w-full h-full relative">
            <div className="relative flex-1 m-2" ref={containerRef}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map(hour => <>
                    <div style={{ position: "absolute", top: position(hour) }} className="border-t-1 border-gray-500 w-full"></div>
                    <div style={{ position: "absolute", top: position(hour) }} className="text-[12px] text-gray-500">{pad2(hour)}:00</div>
                </>)}
                {entries.map(entry => (
                    <div style={{ position: "absolute", top: position(getFractionalHours(entry.startTime)), height: position(getFractionalHours(entry.endTime)) - position(getFractionalHours(entry.startTime)) }} className="bg-green-500 opacity-50 rounded-lg w-1/2"></div>
                ))}
                <div style={{ position: "absolute", top: position(24) }} className="border-t-1 w-full"></div>
            </div>
        </div>
    </>
}