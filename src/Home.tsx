import dateFormat from "dateformat"
import { getDuration, pad2, useCurrentTime } from "./util"
import icon from "./assets/icon.svg"
import classNames from "classnames"
import { useState } from "react"

export function Home({ startTime }: { startTime: Date }) {
    const now = useCurrentTime()
    const duration = getDuration(startTime, now)

    const [isActive, setActive] = useState(false)

    return <>
        <div className={classNames("w-20 h-20 rounded-xl bg-green-300 cursor-pointer", {"grayscale-100": !isActive})} onClick={() => setActive(!isActive)}>
            <img src={icon} className="h-full p-2"></img>
        </div>
        <div className="flex gap-5">
            <div className={classNames("rounded-xl p-3 border-1 bg-green-300 border-green-400", {"grayscale-100": !isActive})}>
                <div className="text-green-800 font-medium">start time:</div>
                <div className="font-mono font-bold text-green-900 text-3xl">
                    {dateFormat(startTime, "HH")}
                    <span className="text-green-600">:</span>
                    {dateFormat(startTime, "MM")}
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
        
    </>
}

export default Home