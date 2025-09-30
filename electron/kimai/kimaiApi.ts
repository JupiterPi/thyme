import dateFormat from "dateformat"
import { midnight } from "../util"
import { Note, TimeEntry } from "../schema"
import z from "zod"

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
            throw new Error(`Error fetching ${method} ${path}: ${response.statusText}\nBody: ${body ?? "none"}\nResponse: ${await response.text()}`)
        }
        return response
    }

    private async get<T>(path: string, schema?: z.ZodType<T>) {
        const response = await (await this.request("GET", path, undefined)).json() as T
        if (schema) return schema.parse(response)
        return response
    }
    private async post<T>(path: string, body?: unknown) {
        return (await this.request("POST", path, body)).json() as T
    }
    private async delete(path: string) {
        await this.request("DELETE", path, undefined)
    }

    // endpoints

    public async fetchCurrentUser() {
        return await this.get("/api/users/me", z.object({
            alias: z.string(),
            username: z.string(),
        }))
    }

    public async fetchProjects() {
        return await this.get("/api/projects", z.array(z.object({
            id: z.number(),
            name: z.string(),
            globalActivities: z.boolean()
        })))
    }

    public async fetchActivities() {
        return await this.get("/api/activities", z.array(z.object({
            id: z.number(),
            name: z.string(),
            project: z.number().nullable()
        })))
    }

    public async fetchThymeTimesheets(day: Date) {
        const start = formatDate(midnight(day, false))
        const end = formatDate(midnight(day, true))
        return await this.get(`/api/timesheets?begin=${start}&end=${end}&tags%5B%5D=thyme`, z.array(z.object({
            id: z.string()
        })))
    }

    public async createThymeTimesheet(projectId: number, activityId: number, entry: TimeEntry, notes: Note[]) {
        return await this.post<{ id: number }>("/api/timesheets", {
            project: projectId,
            activity: activityId,
            begin: formatDate(entry.startTime),
            end: formatDate(entry.endTime),
            description: notes.map(note => `${dateFormat(note.time, "HH:MM")}: ${note.text}`).join("\n"),
            tags: ["thyme"].join(","),
        })
    }

    public async deleteTimesheet(id: number) {
        return await this.delete(`/api/timesheets/${id}`)
    }
}

function formatDate(date: Date) {
    return dateFormat(date, "yyyy-mm-dd") + "T" + dateFormat(date, "HH:MM:ss")
}
