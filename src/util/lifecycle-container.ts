export interface LifecycleContainer {
    addEventListener(eventName : string, handler : Function);
    fireEvent(eventName : string);
}