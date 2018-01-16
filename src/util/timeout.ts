
export interface Delay<T> {
    cancel();
    completed : Promise<T>;
}

export function delay(ms : number, value? : any): Delay<any>
export function delay<T>(ms : number, value? : T): Delay<T> {
    let timeout;
    let completed = new Promise<T>((resolve, reject) => {
        timeout = setTimeout(() => resolve(value), ms);
    })

    return {
        cancel: () => clearTimeout(timeout),
        completed
    };
}
