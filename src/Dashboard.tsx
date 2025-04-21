import dateFormat from "dateformat"
import { getDuration, pad2, useCurrentTime } from "./util"
import icon from "./assets/icon.svg"
import classNames from "classnames"
import { useContext } from "react"
import { StateContext } from "./main"
import ipc from "./ipc"

export function Dashboard() {
    const state = useContext(StateContext)
    const isActive = state.activeStartTime !== null
    const activeStartTime = state.activeStartTime

    const now = useCurrentTime()
    const duration = isActive ? getDuration(activeStartTime!, now) : { hours: 0, minutes: 0, seconds: 0 }

    const displayStartTime = isActive ? activeStartTime! : new Date()

    return <>

        {/* icon */}
        <div className={classNames("w-20 h-20 rounded-xl bg-green-300 cursor-pointer", {"grayscale-100": !isActive})} onClick={() => ipc.toggleActive()}>
            <img src={icon} className="h-full p-2"></img>
        </div>

        {/* current timer */}
        <div className="flex gap-5">
            <div className={classNames("_container", {"grayscale-100": !isActive})}>
                <div className="text-green-800 font-medium">start time:</div>
                <div className="font-mono font-bold text-green-900 text-3xl">
                    {dateFormat(displayStartTime, "HH")}
                    <span className="text-green-600">:</span>
                    {dateFormat(displayStartTime, "MM")}
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

        <div className="_button" onClick={() => ipc.openHistory()}>History</div>
        
    </>
}