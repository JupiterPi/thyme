export class KimaiAPI {
    private url: string
    private authToken: string

    public constructor(url: string, authToken: string) {
        this.url = url.endsWith("/") ? url.slice(0, -1) : url
        this.authToken = authToken
    }

    // util

    private async request<T>(method: "GET" | "POST", path: string, body?: unknown) {
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
        return response.json() as T
    }

    private get<T>(path: string, body?: unknown) {
        return this.request<T>("GET", path, body)
    }

    private post<T>(path: string, body?: unknown) {
        return this.request<T>("POST", path, body)
    }

    // endpoints

    public async fetchCurrentUser() {
        return await this.get<{ alias: string }>("/api/users/me")
    }
}
