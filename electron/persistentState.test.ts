import { describe, expect, test } from "vitest"
import { normalizeTimeEntries } from "./persistentState"
import { mergeThreshold } from "./types"

describe("normalizeTimeEntries()", () => {

    const time = (hours: number, minutes: number) => {
        const date = new Date("1970-01-01T00:00:00Z")
        date.setHours(hours, minutes)
        return date
    }

    test("leave unproblematic entries unchanged", () => {
        const entries = [
            { id: "1", startTime: time(14,0), endTime: time(14,5) },
            { id: "2", startTime: time(14,10), endTime: time(14,15) },
        ]
        expect(normalizeTimeEntries(entries)).toEqual(entries)
    })

    test("sort entries", () => {
        const entries = [
            { id: "1", startTime: time(14,0), endTime: time(14,5) },
            { id: "2", startTime: time(14,10), endTime: time(14,15) },
        ]
        expect(normalizeTimeEntries([entries[1], entries[0]])).toEqual(entries)
    })

    test("join overlapping entries", () => {
        const entries = [
            { id: "1", startTime: time(14,0), endTime: time(14,10) },
            { id: "2", startTime: time(14,5), endTime: time(14,15) },
        ]
        const result = normalizeTimeEntries(entries)
        expect(result.length).toBe(1)
        expect(result[0].startTime).toEqual(entries[0].startTime)
        expect(result[0].endTime).toEqual(entries[1].endTime)
    })

    test("join entries blow the threshold apart", () => {
        const entries = [
            { id: "1", startTime: time(14,0), endTime: time(14,5) },
            { id: "2", startTime: new Date(time(14,5).getTime() + mergeThreshold), endTime: time(14,15) },
        ]
        const result = normalizeTimeEntries(entries)
        expect(result.length).toBe(1)
        expect(result[0].startTime).toEqual(entries[0].startTime)
        expect(result[0].endTime).toEqual(entries[1].endTime)
    })

    test("discard negative duration entries", () => {
        const entries = [
            { id: "1", startTime: time(14,10), endTime: time(14,5) },
        ]
        expect(normalizeTimeEntries(entries).length).toBe(0)
    })

    test("split entries that go over midnight", () => {
        const entries = [
            { id: "1", startTime: new Date(time(23,55).getTime() - 24*60*60*1000), endTime: time(0,5) },
        ]
        const expected = [
            { startTime: entries[0].startTime, endTime: time(0,0) },
            { startTime: time(0,0), endTime: entries[0].endTime },
        ]
        const result = normalizeTimeEntries(entries)
        expect(result).toMatchObject(expected)
    })

    test("don't split entries that go exactly to midnight", () => {
        const entries = [
            { id: "1", startTime: new Date(time(23,55).getTime() - 24*60*60*1000), endTime: time(0,0) },
        ]
        expect(normalizeTimeEntries(entries)).toEqual(entries)
    })

    test("split entries that go over multiple midnights", () => {
        const entries = [
            { id: "1", startTime: new Date(time(23,55).getTime() - 24*60*60*1000), endTime: new Date(time(0,5).getTime() + 24*60*60*1000) },
        ]
        const expected = [
            { startTime: entries[0].startTime, endTime: time(0,0) },
            { startTime: time(0,0), endTime: new Date(time(0,0).getTime() + 24*60*60*1000) },
            { startTime: new Date(time(0,0).getTime() + 24*60*60*1000), endTime: new Date(entries[0].endTime.getTime()) },
        ]
        const result = normalizeTimeEntries(entries)
        expect(result).toMatchObject(expected)
    })

    test("don't merge over midnight", () => {
        const entries = [
            { id: "1", startTime: new Date(time(23,55).getTime() - 24*60*60*1000), endTime: new Date(time(0,0).getTime() - 30*1000) },
            { id: "2", startTime: time(0,0), endTime: time(0,5) },
        ]
        expect(normalizeTimeEntries(entries)).toEqual(entries)
    })

})