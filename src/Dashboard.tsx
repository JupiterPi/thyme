import dateFormat from "dateformat"
import { pad2 } from "./util"
import icon from "./assets/icon.svg"
import classNames from "classnames"
import { useContext, useEffect, useState } from "react"
import { StateContext } from "./main"
import ipc from "./ipc"

export function Dashboard() {
    const state = useContext(StateContext)
    const isActive = state.activeStartTime !== null
    const activeStartTime = state.activeStartTime

    const [durationSeconds, setDurationSeconds] = useState(0)
    useEffect(() => {
        setDurationSeconds(Math.floor((new Date().getTime() - (activeStartTime?.getTime() ?? 0)) / 1000))
        const interval = setInterval(() => {
            setDurationSeconds(d => d + 1)
        }, 1000)
        return () => clearInterval(interval)
    }, [isActive])

    const duration = isActive
        ? { hours: Math.floor(durationSeconds / (60*60)), minutes: Math.floor((durationSeconds % (60*60)) / 60), seconds: durationSeconds % 60 }
        : { hours: 0, minutes: 0, seconds: 0 }

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

        <div className="_button" onClick={() => ipc.openHistory()}>History</div>
        
    </>
}