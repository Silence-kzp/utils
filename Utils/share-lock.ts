class SharedLock {

    storageKey: string;
    storage: any;
    pollIntervalMS: number;
    timeoutMS: number;
    keyX: string;
    keyY: string;
    keyZ: string;

    constructor(key: string, options?: any) {
        options = options || {};

        this.storageKey = key;
        this.storage = options.storage || window.localStorage;
        this.pollIntervalMS = options.pollIntervalMS || 100;
        this.timeoutMS = options.timeoutMS || 2000;

        
        this.keyX = `${this.storageKey}:X`;
        this.keyY = `${this.storageKey}:Y`;
        this.keyZ = `${this.storageKey}:Z`;
    }

    private delay(startTime: number,
                  callback: (flag: boolean) => void) {
        if ((new Date().getTime() - startTime) > this.timeoutMS) {
            this.storage.removeItem(this.keyZ);
            this.storage.removeItem(this.keyY);
            return callback(true);
        }
        setTimeout(function () {
            callback && callback(false);
        }, this.pollIntervalMS * (Math.random() + 0.1));
    }


    private waitFor(pid: string,
                    startTime: number,
                    predicate: () => boolean, 
                    callback: () => void) {
        if (predicate()) return callback();
        const that = this;
        const args: any = arguments;
        this.delay(startTime, function(flag) {
            if (flag) return that.loop(pid, startTime, callback);
            that.waitFor.apply(that, args);
        });
    }

    private loop(pid: string, startTime: number, callback: () => void) {
        const that = this;
        this.storage.setItem(this.keyX, pid);

        const perdicate = function() {
            const valY = that.storage.getItem(that.keyX);
            if (valY && valY !== pid) { // if Y == i then this process already has the lock (useful for test cases)
                return false;
            } else {
                that.storage.setItem(that.keyX, pid);
                if (that.storage.getItem(that.keyX) === pid) {
                    return true;
                } else {
                    return false;
                }
            }
        }

        this.waitFor(pid, startTime, perdicate, function() {
            if (that.storage.getItem(that.keyX) === pid) {
                return that.criticalSection(pid, callback);
            }
            that.delay(startTime, function(flag: boolean) {
                if (flag || that.storage.getItem(that.keyY) !== pid) {
                    return that.loop(pid, startTime, callback);
                }

                const method = function() {
                    return !that.storage.getItem(that.keyZ);
                };
                that.waitFor(pid, 
                             startTime, 
                             method, 
                             that.criticalSection.bind(that, pid, callback));
            });
        }); 
    }
    
    private criticalSection(pid: string, lockedCallback: () => void) {
        this.storage.setItem(this.keyZ, '1');
        try {
            lockedCallback();
        } finally {
            this.storage.removeItem(this.keyZ);
            if (this.storage.getItem(this.keyY) === pid) {
                this.storage.removeItem(this.keyY);
            }
            if (this.storage.getItem(this.keyX) === pid) {
                this.storage.removeItem(this.keyX);
            }
        }
    };

    withLock(callback: () => void, 
             errorCallback?: (err: any) => void, 
             pid?: string) {
        if (!pid && typeof errorCallback !== 'function') {
            pid = errorCallback;
            errorCallback = undefined;
        }

        const i = pid || (new Date().getTime() + '|' + Math.random());
        const startTime = new Date().getTime();

        try {
            this.loop(i, startTime, callback);
        } catch(err) {
            errorCallback && errorCallback(err);
        }
    }
}

export default SharedLock;
