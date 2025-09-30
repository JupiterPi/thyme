import dateFormat from "dateformat"
import { pad2, useEphemeralState } from "./util"
import icon from "./assets/icon.svg"
import classNames from "classnames"
import { useContext, useEffect, useState } from "react"
import { StateContext } from "./main"
import ipc from "./ipc"
import { getLatestVersion } from "./updates"
import { version } from "./buildInfo"
import { actions } from "../electron/schema"
import { useDebounce } from "@uidotdev/usehooks"

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

    return <>

        {/* icon */}
        <div className={classNames("w-20 h-20 rounded-xl bg-green-300 cursor-pointer", {"grayscale-100": !isActive})} onClick={() => { ipc.dispatch(actions.toggleActive()) }}>
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

        {state.kimai === undefined ? <SelectActivityNormal /> : <SelectActivityKimai />}
        <div className="-mt-8"></div> {/* less spacing */}
        <AddNote />

        {/* navigation buttons */}
        <div className="flex gap-2">
            <button className="_button" onClick={() => ipc.openPage("history")}>History</button>
            <button className="_button" onClick={() => ipc.openPage("settings")}>
                Settings
                {isUpdateAvailable && <div className="bg-red-400 size-[10px] rounded-full absolute translate-y-[-30px] translate-x-[61px] animate-[ping_1432ms_infinite]"></div>}
                {isUpdateAvailable && <div className="bg-red-400 size-[10px] rounded-full absolute translate-y-[-30px] translate-x-[61px]"></div>}
            </button>
        </div>
    </>
}

function SelectActivityNormal() {
    const state = useContext(StateContext)
    const isActive = state.activeStartTime !== null

    const [activityInput, setActivityInput] = useState("")
    const debouncedActivityInput = useDebounce(activityInput, 200)
    const [hasHadInput, setHasHadInput] = useState(false)
    const debouncedHasHadInput = useDebounce(hasHadInput, 200)
    useEffect(() => {
        if (debouncedActivityInput.length === 0) {
            if (debouncedHasHadInput) {
                ipc.dispatch(actions.setActivity(null))
            }
        } else {
            if (debouncedActivityInput !== state.activity?.name) {
                ipc.dispatch(actions.setActivity({ name: debouncedActivityInput }))
            }
        }
    }, [debouncedActivityInput, debouncedHasHadInput, state.activity])
    useEffect(() => {
        if (state.activity) setActivityInput(state.activity?.name ?? "")
    }, [state.activity])

    return <div className="flex w-43">
        <input
            disabled={isActive}
            className="py-0.5 px-1.5 border border-green-400 bg-green-300 focus:border-1.5 focus:outline-none rounded-md p-2 flex-1 w-full font-regular text-center"
            placeholder="(No Activity)"
            value={activityInput}
            onChange={e => { setActivityInput(e.target.value); setHasHadInput(true) }}
        />
    </div>
}

function SelectActivityKimai() {
    const state = useContext(StateContext)
    const isActive = state.activeStartTime !== null

    return <div className="flex w-43">
        <button
            className={classNames("py-0.5 px-1.5 border border-green-400 bg-green-300 focus:border-1.5 focus:outline-none rounded-md p-2 flex-1 w-full font-regular text-center whitespace-nowrap overflow-hidden text-ellipsis", { "grayscale-100": isActive, "cursor-pointer": !isActive })}
            onClick={() => !isActive && ipc.openPage("selectKimaiActivityDialog")}
        >
            {state.activity?.name || "No activity"}
        </button>
    </div>
}

function AddNote() {
    const state = useContext(StateContext)
    const isActive = state.activeStartTime !== null

    const [noteInput, setNoteInput] = useState("")
    const [showNoteInputSuccessMessage, setShowNoteInputSuccessMessage] = useEphemeralState(false, 1000)
    const submitNote = () => {
        ipc.dispatch(actions.createNote({ text: noteInput }))
        setNoteInput("")
        setShowNoteInputSuccessMessage(true)
    }

    return (
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
    )
}