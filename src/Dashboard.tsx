import dateFormat from "dateformat"
import { pad2, useEphemeralState } from "./util"
import icon from "./assets/icon.svg"
import classNames from "classnames"
import { useContext, useEffect, useState } from "react"
import { StateContext } from "./main"
import ipc from "./ipc"
import { getLatestVersion } from "./updates"
import { version } from "./buildInfo"

export function Dashboard() {
    const state = useContext(StateContext)
    const isActive = state.activeStartTime !== null
    const activeStartTime = state.activeStartTime

    const [durationSeconds, setDurationSeconds] = useState(0)
    useEffect(() => {
        const currentDuration = Math.floor((new Date().getTime() - (activeStartTime?.getTime() ?? 0)) / 1000)
        setDurationSeconds(currentDuration === 0 ? 1 : currentDuration)
        const interval = setInterval(() => {
            setDurationSeconds(d => d + 1)
        }, 1000)
        return () => clearInterval(interval)
    }, [isActive, activeStartTime])

    const duration = isActive
        ? { hours: Math.floor(durationSeconds / (60*60)), minutes: Math.floor((durationSeconds % (60*60)) / 60), seconds: durationSeconds % 60 }
        : { hours: 0, minutes: 0, seconds: 0 }
    
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)
    useEffect(() => {
        getLatestVersion().then(latestVersion => {
            setIsUpdateAvailable(latestVersion !== version)
        })
    }, [])

    const [noteInput, setNoteInput] = useState("")
    const [showNoteInputSuccessMessage, setShowNoteInputSuccessMessage] = useEphemeralState(false, 1000)
    const submitNote = () => {
        ipc.reduceNotes({ action: "create", note: { text: noteInput, time: new Date() } })
        setNoteInput("")
        setShowNoteInputSuccessMessage(true)
    }

    return <>

        {/* icon */}
        <div className={classNames("w-20 h-20 rounded-xl bg-green-300 cursor-pointer", {"grayscale-100": !isActive})} onClick={() => ipc.toggleActive()}>
            <img src={icon} className={classNames("h-full p-2", {"animate-clock": isActive})}></img>
        </div>

        {/* current timer */}
        <div className="flex gap-5">
            <div className={classNames("_container", {"grayscale-100": !isActive})}>
                <div className="text-green-800 font-medium">start time:</div>
                <div className="font-mono font-bold text-green-900 text-3xl">
                    {dateFormat((isActive ? activeStartTime! : new Date()), "HH")}
                    <span className="text-green-600">:</span>
                    {dateFormat((isActive ? activeStartTime! : new Date()), "MM")}
                </div>
                <div className="h-2"></div>
                <div className="text-green-800 font-medium">duration:</div>
                <div className="font-mono font-bold text-green-900 text-3xl">
                    {pad2(duration.hours)}
                    <span className="text-green-600">:</span>
                    {pad2(duration.minutes)}
                    <span className="text-green-600">:</span>
                    {pad2(duration.seconds)}
                </div>
            </div>
        </div>

        {/* quick add note */}
        <div className="flex gap-1 w-43">
            <input
                disabled={!isActive}
                className={classNames("py-0.5 px-1.5 border border-green-400 bg-green-300 focus:border-1.5 focus:outline-none rounded-md p-2 flex-1 w-full font-regular", { "text-center": noteInput.length === 0, "grayscale-100": !isActive })}
                placeholder={showNoteInputSuccessMessage ? "Added" : "Add a Note"}
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitNote() }}
            />
            {noteInput.length > 0 && <button className="_button" onClick={submitNote}>Note</button>}
        </div>

        {/* navigation buttons */}
        <div className="flex gap-2">
            <button className="_button" onClick={() => ipc.openPage("history")}>History</button>
            <button className="_button" onClick={() => ipc.openPage("settings")}>
                About
                {isUpdateAvailable && <div className="bg-red-400 size-[10px] rounded-full absolute translate-y-[-30px] translate-x-[48px] animate-[ping_1432ms_infinite]"></div>}
                {isUpdateAvailable && <div className="bg-red-400 size-[10px] rounded-full absolute translate-y-[-30px] translate-x-[48px]"></div>}
            </button>
        </div>
        
    </>
}