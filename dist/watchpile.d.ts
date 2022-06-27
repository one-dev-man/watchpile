/// <reference types="node" />
import EventEmitter from "events";
declare type WatchPile_Events = "start" | "compile" | "error" | "stop";
export default class WatchPile extends EventEmitter {
    #private;
    constructor();
    addListener(eventName: WatchPile_Events, listener: (...args: any[]) => void): this;
    emit(eventName: WatchPile_Events, ...args: any[]): boolean;
    listenerCount(eventName: WatchPile_Events): number;
    listeners(eventName: WatchPile_Events): Function[];
    off(eventName: WatchPile_Events, listener: (...args: any[]) => void): this;
    on(eventName: WatchPile_Events, listener: (...args: any[]) => void): this;
    once(eventName: WatchPile_Events, listener: (...args: any[]) => void): this;
    prependListener(eventName: WatchPile_Events, listener: (...args: any[]) => void): this;
    prependOnceListener(eventName: WatchPile_Events, listener: (...args: any[]) => void): this;
    rawListeners(eventName: WatchPile_Events): Function[];
    removeAllListeners(event?: WatchPile_Events): this;
    removeListener(eventName: WatchPile_Events, listener: (...args: any[]) => void): this;
    get workdir(): string;
    get outdir(): string;
    start(workdir: string, outdir: string, options: {
        tsconfig: string;
        filter?: RegExp;
        firstCompileAll?: boolean;
    }): void;
    stop(): void;
}
export {};
