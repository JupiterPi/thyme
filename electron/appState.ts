import { BehaviorSubject, first } from "rxjs"

export class AppState {
    private isActive = new BehaviorSubject<boolean>(false)

    public getActive() {
        return this.isActive.asObservable()
    }

    public setActive(isActive: boolean) {
        this.isActive.next(isActive)
    }

    public toggleActive() {
        this.isActive.pipe(first()).subscribe(isActive => this.isActive.next(!isActive))
    }

    constructor() {
        this.isActive.subscribe(isActive => {
            console.log("isActive", isActive)
        })
    }
}