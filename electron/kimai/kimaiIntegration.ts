import { KimaiAPI } from "./kimaiApi";

export class KimaiIntegration {
    private api: KimaiAPI

    public constructor(url: string, authToken: string) {
        this.api = new KimaiAPI(url, authToken)
    }

    private username: string | null = null
    public async getUsername() {
        if (this.username === null) {
            this.username = (await this.api.fetchCurrentUser()).alias
        }
        return this.username!
    }
}