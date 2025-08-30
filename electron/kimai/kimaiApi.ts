import dateFormat from "dateformat"
import { midnight } from "../util"
import { Note, TimeEntry } from "../types"

export class KimaiAPI {
    private url: string
    private authToken: string

    public constructor(url: string, authToken: string) {
        this.url = url.endsWith("/") ? url.slice(0, -1) : url
        this.authToken = authToken
    }

    // util

    private async request(method: "GET" | "POST" | "DELETE", path: string, body?: unknown) {
        const response = await fetch(this.url + path, {
            method,
            headers: {
                "Authorization": `Bearer ${this.authToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        })
        if (!response.ok) {
            throw new Error(`Error fetching ${path}: ${response.statusText}`)
        }
        return response
    }

    private async get<T>(path: string) {
        return (await this.request("GET", path, undefined)).json() as T
    }
    private async post<T>(path: string, body?: unknown) {
        return (await this.request("POST", path, body)).json() as T
    }
    private async delete(path: string) {
        await this.request("DELETE", path, undefined)
    }

    // endpoints

    public async fetchCurrentUser() {
        return await this.get<{ alias: string }>("/api/users/me")
    }

    public async fetchThymeTimesheets(day: Date) {
        const start = formatDate(midnight(day, false))
        const end = formatDate(midnight(day, true))
        return await this.get<{id: string}[]>(`/api/timesheets?begin=${start}&end=${end}&tags%5B%5D=thyme`)
    }

    public async createThymeTimesheet(projectId: number, activityId: number, entry: TimeEntry, notes: Note[]) {
        return await this.post<{ id: number }>("/api/timesheets", {
            project: projectId,
            activity: activityId,
            begin: formatDate(entry.startTime),
            end: formatDate(entry.endTime),
            description: notes.map(note => `${dateFormat(note.time, "HH:mm")}: ${note.text}`).join("\n"),
            tags: ["thyme"].join(","),
        })
    }

    public async deleteTimesheet(id: number) {
        return await this.delete(`/api/timesheets/${id}`)
    }

    // todo: validate response data
}

function formatDate(date: Date) {
    return dateFormat(date, "yyyy-mm-dd") + "T" + dateFormat(date, "HH:MM:ss")
}
