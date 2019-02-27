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

            onHasTask(delegate, current, target, hasTaskState) {
                delegate.hasTask(target, hasTaskState);

                if (hasTaskState.change == 'microTask') {
                    self._hasPendingMicrotasks = hasTaskState.microTask;
                } else if (hasTaskState.change == 'macroTask') {
                    self._hasPendingMacrotasks = hasTaskState.macroTask;
                }

                self.checkStable();
            },
            
            onHandleError(delegate, current, target, error) {
                self.runOutside(() => self._onError.next(error));
                return false;
            }
        });
    }

    private _outside : Zone;
    private _nesting : number = 0;
    private _hasPendingMicrotasks : boolean;
    private _hasPendingMacrotasks : boolean;
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
        if (this._nesting > 0 || this._hasPendingMacrotasks || this._hasPendingMicrotasks || this._isStable)
            return;

        try {
            this._nesting++;
            this._onMicrotaskEmpty.next(null);
        } finally {
            this._nesting--;

            if (!this._hasPendingMicrotasks) {
                try {
                    this.runOutside(() => this._onStable.next(null));
                } finally {
                    this._isStable = true;
                }
            }
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
        try {
            return callback();
        } finally {
            this.onLeave();
        }
    }

    public onEnter() {
        this._nesting += 1;
    }

    public onLeave() {
        this._nesting -= 1;
    }
}