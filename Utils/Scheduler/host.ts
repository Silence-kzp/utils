const INITIAL_TIME = Date.now();
const ENABLE_MESSAGE_LOOP_IMPLEMENTATION = true;


export type HostCallback = (hasTimeRemaining: boolean, initialTime: number) => boolean;

class Host {

    private isRAFLoopRunning = false;
    private isMessageLoopRunning = false;
    private scheduleHostCallback: HostCallback | null = null;
    private rAFTimeoutID = -1;
    private taskTimeoutID = -1;
    private frameLength = ENABLE_MESSAGE_LOOP_IMPLEMENTATION ? 5 : 33.33;
    private prevRAFTime = -1;
    private prevRAFInterval = -1;
    private frameDeadline = 0;
    private fpsLocked = false;
    private maxFrameLength = 300;
    private needsPaint = false;
    private channel = new MessageChannel();
    private port = this.channel.port2;

    constructor() {
        this.channel.port1.onmessage = this.performWorkUntilDeadline;
    }

    getCurrentTime() {
        if (typeof performance === 'object' && 
        typeof performance.now === 'function') {
            return performance.now();
        } else {
            return Date.now() - INITIAL_TIME;
        }
    }

    shouldYieldToHost() {
        return this.getCurrentTime() >= this.frameDeadline;
    }

    

    forceFrameRate(fps: number) {
        if (fps < 0 || fps > 125) return;
        if (fps > 0) {
            this.frameLength = Math.floor(1000 / fps);
            this.fpsLocked = true;
        } else {
            this.frameLength = 33.33;
            this.fpsLocked = false;
        }
    }

    performWorkUntilDeadline = () => {
        if (ENABLE_MESSAGE_LOOP_IMPLEMENTATION) {
            if (this.scheduleHostCallback) {
                const currentTime = this.getCurrentTime();
                this.frameDeadline = currentTime + this.frameLength;
                const hasTimeRemaining = true;
                try {
                    const hasMoreWork = this.scheduleHostCallback(hasTimeRemaining, currentTime);
                    if (!hasMoreWork) {
                        this.isMessageLoopRunning = false;
                        this.scheduleHostCallback = null;
                    } else {
                        this.port.postMessage(null);
                    }
                } catch (error) {
                    this.port.postMessage(null);
                    throw error;
                }
           } else {
               this.isMessageLoopRunning = false;
           }
           this.needsPaint = false;
        } else {
            if (this.scheduleHostCallback) {
                const currentTime = this.getCurrentTime();
                const hasTimeRemaining = (this.frameLength - currentTime) > 0;
                try {
                    const hasMoreWork = this.scheduleHostCallback(hasTimeRemaining, currentTime);
                    if (!hasMoreWork) this.scheduleHostCallback = null;
                } catch (error) {
                    this.port.postMessage(null);
                    throw error;
                }
            }
        }
    }

    onAnimationFrame = (rAFTime: number) => {
        if (!this.scheduleHostCallback) {
            this.prevRAFTime = -1;
            this.prevRAFInterval = -1;
            this.isRAFLoopRunning = false;
            return;
        }
        this.isRAFLoopRunning = true;
        requestAnimationFrame((nextRAFTime) => {
            clearTimeout(this.rAFTimeoutID);
            this.onAnimationFrame(nextRAFTime);
        });

        const onTimeout = () => {
            this.frameDeadline = this.getCurrentTime() + this.frameLength / 2;
            this.performWorkUntilDeadline();
            this.rAFTimeoutID = setTimeout(onTimeout, this.frameLength * 3);
        }
        this.rAFTimeoutID = setTimeout(onTimeout, this.frameLength * 3);

        if (this.prevRAFTime !== -1 && rAFTime - this.prevRAFTime > 0.1) {
            const rAFInterval = rAFTime - this.prevRAFTime;
            if (!this.fpsLocked && this.prevRAFInterval !== -1) {
                if (rAFInterval < this.frameLength && this.prevRAFInterval <  this.frameLength) {
                    this.frameLength = rAFInterval < this.prevRAFInterval ? this.prevRAFInterval : rAFInterval;
                    if (this.frameLength < 8.33) { this.frameLength = 8.33 }
                }
            }
            this.prevRAFInterval = rAFInterval;
        }
        this.prevRAFTime = rAFTime;
        this.frameDeadline = rAFTime + this.frameLength;
        this.port.postMessage(null);
    }

    requestHostCallback(callback: HostCallback) {
        this.scheduleHostCallback = callback;
        if (ENABLE_MESSAGE_LOOP_IMPLEMENTATION) {
            if (!this.isMessageLoopRunning) {
                this.isMessageLoopRunning = true;
                this.port.postMessage(null);
            }
        } else {
            if (this.isRAFLoopRunning) {
                this.isRAFLoopRunning = true;
                requestAnimationFrame((rAFTime: number) => {
                    this.onAnimationFrame(rAFTime);
                });
            }
        }
    }

    cancelHostCallback() {
        this.scheduleHostCallback = null;
    }
    
    requestHostTimeout(callback: (currentTime: number) => void, ms: number) {
        this.taskTimeoutID = setTimeout(() => {
            callback(this.getCurrentTime());
        }, ms);
    }

    cancelHostTimeout() {
        clearTimeout(this.taskTimeoutID);
        this.taskTimeoutID = -1;
    }
}

export default Host;