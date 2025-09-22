import { BehaviorSubject, filter, Observable } from "rxjs"

type _ActionReducer<State> = (state: State) => State
type _Actions<State> = Record<string, (...args: never[]) => _ActionReducer<State>>
type _Action<State, actions extends _Actions<State>, action extends keyof actions> = { action: action, args: Parameters<actions[action]> }
type _ActionResolver<State, actions extends _Actions<State>> = <action extends keyof actions>(action: _Action<State, actions, action>) => _ActionReducer<State>

export const createStore = <State, actions extends _Actions<State>>(
    initialState: State | (() => Promise<State>),
    actionResolver: _ActionResolver<State, actions>,
) => {
    type ActionReducer = _ActionReducer<State>
    type Action<action extends keyof actions> = _Action<State, actions, action>

    const state$ = new BehaviorSubject<State | undefined>(undefined)

    const resolveAction = <action extends keyof actions>(action: Action<action>) => actionResolver(action)
    
    const unhandledActionsBeforeInitialization: ActionReducer[] = []
    if (typeof initialState === "object") {
        state$.next(initialState as State)
    } else {
        (initialState as () => Promise<State>)().then(state => {
            unhandledActionsBeforeInitialization.forEach(actionReducer => {
                state = actionReducer(state)
            })
            state$.next(state)
        })
    }

    return {
        state$: state$.asObservable().pipe(filter(state => state !== undefined)) as Observable<State>,
        dispatch: (...actions: Action<keyof actions>[]) => {
            const state = state$.getValue()
            if (state === undefined) {
                unhandledActionsBeforeInitialization.push(...actions.map(action => resolveAction(action)))
            } else {
                let nextState = state as State
                for (const action of actions) {
                    nextState = resolveAction(action)(nextState)
                }
                state$.next(nextState)
            }
        }
    }
}

export const createActions = <State>() => <actions extends _Actions<State>>(actions: actions) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionsObj: any = {}
    for (const key in actions) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        actionsObj[key] = (...args: any[]) => ({ action: key, args })
    }
    const _actions = actionsObj as { [K in keyof actions]: (...args: Parameters<typeof actions[K]>) => _Action<State, actions, K> }
    const actionResolver: _ActionResolver<State, actions> = <action extends keyof actions>(action: _Action<State, actions, action>) => actions[action.action](...action.args)
    return { actions: _actions, actionResolver }
}

export const stateAssertion = <State>(validator: (state: State) => boolean, msg: string) => (state: State) => {
    if (!validator(state)) throw new Error(`Invalid state: ${msg}`)
    return state
}