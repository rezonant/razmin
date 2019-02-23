
export interface Delay<T> extends Promise<T> {
    cancel();
}

export function delay(ms : number, value? : any): Delay<any>
export function delay<T>(ms : number, value? : T): Delay<T> {
    let timeout;
    return Object.assign(
        new Promise<T>(resolve => timeout = setTimeout(() => resolve(value), ms)),
        { cancel: () => clearTimeout(timeout) }
    );
}
