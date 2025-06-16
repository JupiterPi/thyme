import { useContext, useEffect, useState } from "react"
import ipc from "./ipc"
import { StateContext } from "./main"
import { formatOnlyDate, getFractionalHours, pad2 } from "./util"
import { Note, TimeEntry } from "../electron/types"
import { useMeasure } from "@uidotdev/usehooks"
import dateFormat from "dateformat"
import classNames from "classnames"

export function Timeline() {
    const state = useContext(StateContext)
    const [timelineDay, setTimelineDay] = useState<string | null>(null)
    const [entries, setEntries] = useState<TimeEntry[]>([])
    const [notes, setNotes] = useState<Note[]>([])
    useEffect(() => {
        const subscription = ipc.timelineDay.subscribe(date => {
            setTimelineDay(date)
            setEntries(state.timeEntries.filter(entry => formatOnlyDate(entry.startTime) === date))
            setNotes(state.notes.filter(note => formatOnlyDate(note.time) === date))
        })
        return () => subscription.unsubscribe()
    }, [state])

    const [containerRef, { height: uiHeight }] = useMeasure()
    const position = (hour: number) => (uiHeight ?? 0) * (hour / 24)

    const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null)

    return <>
        <div className="">{timelineDay}</div>
        <div className="w-full h-full flex">
            <div className="flex flex-col w-1/2 h-full relative">
                <div className="relative flex-1 m-2" ref={containerRef}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map(hour => <>
                        <div style={{ position: "absolute", top: position(hour) }} className="border-t-1 border-gray-400 w-full"></div>
                        <div style={{ position: "absolute", top: position(hour) }} className="text-[12px] text-gray-500">{pad2(hour)}:00</div>
                    </>)}
                    {entries.map(entry => (
                        <div style={{ position: "absolute", left: 50, right: 10, top: position(getFractionalHours(entry.startTime)), height: position(getFractionalHours(entry.endTime)) - position(getFractionalHours(entry.startTime)) }} className="bg-green-500 opacity-75 rounded-lg"></div>
                    ))}
                    {notes.map(note => (
                        <div style={{ position: "absolute", right: 0, top: position(getFractionalHours(note.time)) }} className={classNames("bg-gray-500 animate-pulse rounded-full w-3 h-3", { "invisible": highlightedNoteId !== note.id })}></div>
                    ))}
                    <div style={{ position: "absolute", top: position(24) }} className="border-t-1 border-gray-400 w-full"></div>
                </div>
            </div>
            <div className="flex flex-col flex-1 gap-1">
                {notes.map(note => (
                    <div className={classNames("_container bg-gray-200! border-gray-400! py-1! px-1.5! text-sm text-gray-700 outline-2 outline-transparent transition-[outline-color]", { "outline-gray-400!": highlightedNoteId === note.id })} key={note.id} onMouseEnter={() => setHighlightedNoteId(note.id)} onMouseLeave={() => setHighlightedNoteId(null)}>
                        <span className="font-mono text-gray-600 mr-2">{dateFormat(note.time, "HH:MM")}</span>
                        <span>{note.text}</span>
                    </div>
                ))}
                {notes.length === 0 && <div className="text-green-700 px-3 py-2">No notes</div>}
            </div>
        </div>
    </>
}