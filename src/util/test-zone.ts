/**
 * Copyright Google Inc. All Rights Reserved.
 * Copyright William Lahti
 * 
 * Derived from Angular's NgZone
 * https://github.com/angular/angular/blob/6.0.0/packages/core/src/zone/ng_zone.ts
 * 
 */

import { Observable, Subject } from 'rxjs';

export class TestZone {
    public constructor(name : string, properties : any = {}) {
        let self = this;

        this._outside = Zone.current;
        this._zone = Zone.current.fork({
            name,
            properties: Object.assign({
                isTestCoreZone: true
            }, properties),

            onInvoke(delegate, current, target, callback, applyThis, applyArgs, source) {
                return self.innerInvoke(() => delegate.invoke(target, callback, applyThis, applyArgs, source));
            },
            
            onInvokeTask(delegate: ZoneDelegate, current: Zone, target: Zone, task: Task, applyThis: any, applyArgs: any) {
                return self.innerInvoke(() => delegate.invokeTask(target, task, applyThis, applyArgs));
            },

            onCancelTask(pz, cz, tz, task) {
                pz.cancelTask(tz, task);
            },

            onHasTask(delegate, current, target, hasTaskState) {

                //console.log(`onHasTask: ${JSON.stringify(hasTaskState)}`);
                delegate.hasTask(target, hasTaskState);

                if (hasTaskState.change == 'microTask') {
                    if (hasTaskState.microTask) {
                        if (!self._zonesWithPendingMicrotasks.includes(target))
                            self._zonesWithPendingMicrotasks.push(target);
                    } else {
                        self._zonesWithPendingMicrotasks = self._zonesWithPendingMicrotasks.filter(x => x !== target);
                    }

                    self._hasPendingMicrotasks = hasTaskState.microTask;
                } else if (hasTaskState.change == 'macroTask') {
                    self._hasPendingMacrotasks = hasTaskState.macroTask;
                    
                    if (hasTaskState.macroTask) {
                        if (!self._zonesWithPendingMacrotasks.includes(target))
                            self._zonesWithPendingMacrotasks.push(target);
                    } else {
                        self._zonesWithPendingMacrotasks = self._zonesWithPendingMacrotasks.filter(x => x !== target);
                    }
                }

                self.checkStable();
            },
            
            onHandleError(delegate, current, target, error) {
                self.runOutside(() => self._onError.next(error));
                return false;
            }
        });
    }

    private _zonesWithPendingMicrotasks : Zone[] = [];
    private _zonesWithPendingMacrotasks : Zone[] = [];

    private _outside : Zone;
    private _nesting : number = 0;
    private _hasPendingMicrotasks : boolean = false;
    private _hasPendingMacrotasks : boolean = false;
    private _zone : Zone;
    private _onError : Subject<Error> = new Subject<Error>();
    private _isStable : boolean;
    private _onMicrotaskEmpty : Subject<void> = new Subject<void>();
    private _onStable : Subject<void> = new Subject<void>();

    public get zone(): Zone {
        return this._zone;
    }

    public get onMicrotaskEmpty(): Observable<void> {
        return this._onMicrotaskEmpty;
    }

    public get onStable(): Observable<void> {
        return this._onStable;
    }

    public get onError(): Observable<Error> {
        return this._onError;
    }

    public checkStable() {

        //console.log(`checkStable: nesting=${this._nesting}, macro=${this._hasPendingMacrotasks}, micro=${this._hasPendingMicrotasks}, stable=${this._isStable}`);

        if (this._nesting > 0 || this._hasPendingMacrotasks || this._hasPendingMicrotasks || this._isStable)
            return;

        if (this._zonesWithPendingMicrotasks.length > 0 || this._zonesWithPendingMacrotasks.length > 0)
            return;
        
        try {
            this._nesting++;
            this._onMicrotaskEmpty.next();
        } finally {
            this._nesting--;
        }

        if (this._hasPendingMicrotasks)
            return;

        // stable 
        //console.log(`stable!!`);

        try {
            this.runOutside(() => this._onStable.next(null));
        } finally {
            this._isStable = true;
        }
    }

    public runOutside(runnable) {
        this._outside.run(runnable);
    }

    public invoke(callback : () => void) {
        this._zone.runGuarded(() => this.innerInvoke(callback));
    }

    private innerInvoke(callback : () => void) {
        this.onEnter();

        let caughtError = false;
        try {
            return callback();
        } catch (e) {
            caughtError = true;
            throw e;
        } finally {
            this.onLeave();
            if (!caughtError)
                this.checkStable();
        }
    }

    public onEnter() {
        //console.log(`onEnter: depth ${this._nesting} -> ${this._nesting + 1}`);
        this._nesting += 1;
    }

    public onLeave() {
        //console.log(`onLeave: depth ${this._nesting} -> ${this._nesting - 1}`);
        this._nesting -= 1;
    }
}