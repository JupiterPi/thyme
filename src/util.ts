import { useState } from "react"

export function getDuration(a: Date, b: Date) {
    const duration = a.getTime() > b.getTime() ? 0 : b.getTime() - a.getTime()
    const hours = Math.floor(duration / 1000 / 60 / 60)
    const minutes = Math.floor((duration / 1000 / 60) % 60)
    const seconds = Math.floor((duration / 1000) % 60)
    return { hours, minutes, seconds }
}

export function pad2(num: number) {
    return num < 10 ? `0${num}` : `${num}`
}

export function midnight(baseTime: Date, addOneDay: boolean) {
    const midnight = new Date(baseTime)
    midnight.setHours(0, 0, 0, 0)
    addOneDay && midnight.setTime(midnight.getTime() + 24*60*60*1000)
    return midnight
}

export function useEphemeralState<T>(initialValue: T, timeout: number): [T, (value: T) => void] {
  const [state, setStateInternal] = useState<T>(initialValue)
  const [timeoutReference, setTimeoutReference] = useState<NodeJS.Timeout | null>(null)
  const setState = (value: T) => {
    setStateInternal(value)
    if (timeoutReference) clearTimeout(timeoutReference)
    setTimeoutReference(setTimeout(() => setStateInternal(initialValue), timeout))
  }
  return [state, setState]
}