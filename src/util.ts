import { useEffect, useState } from "react"

export function getDuration(a: Date, b: Date, nonNegative: boolean = false) {
    const duration = a.getTime() > b.getTime() && nonNegative ? 0 : b.getTime() - a.getTime()
    const hours = Math.floor(duration / 1000 / 60 / 60)
    const minutes = Math.floor((duration / 1000 / 60) % 60)
    const seconds = Math.floor((duration / 1000) % 60)
    return { hours, minutes, seconds }
}

export function pad2(num: number) {
    return num < 10 ? `0${num}` : `${num}`
}

export function useCurrentTime() {
    const [currentTime, setCurrentTime] = useState(new Date())
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])
    return currentTime
}