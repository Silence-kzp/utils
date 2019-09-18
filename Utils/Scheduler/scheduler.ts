import Heap, { HeapNode } from './heap';
import Host from './host';

// 调度器优先级
enum SchedulerPriority {
    No = 0,             // 无优先级
    Immediate = 1,      // 立即执行优先级
    UserBlocking = 2,   // 用户阻塞优先级
    Normal = 3,         // 正常优先级
    Low = 4,            // 低优先级
    Idle = 5,           // 空闲优先级
}

export interface SchedulerTask extends HeapNode {
    startTime: number,
    expirationTime: number,
    priorityLevel: SchedulerPriority,
    callback?: () => void,
}


export interface SchedulerCallbackOptions {
    delay?: number,
    timeout?: number,
} 

class Scheduler {
    
    // 超时时长
    private timeout: { [key in SchedulerPriority] : number } = {
        [SchedulerPriority.No]: 5000,
        [SchedulerPriority.Immediate]: -1,
        [SchedulerPriority.UserBlocking]: 250,
        [SchedulerPriority.Normal]: 5000,
        [SchedulerPriority.Low]: 10000,
        // Max 31 bit integer. The max integer size in V8 for 32-bit systems.
        [SchedulerPriority.Idle]: 1073741823,
    };
    // 主机任务
    private host = new Host();
    // 任务队列
    private taskQueue = new Heap<SchedulerTask>();
    // 计时器队列
    private timerQueue = new Heap<SchedulerTask>();
    // 调度器是否暂停
    private isSchedulerPaused = false;
    // 当前任务
    private currentTask = null;
    // 当前优先级
    private currentPriorityLevel = SchedulerPriority.Normal;
    // 调度器是否在工作
    private isPerformingWork = false;
    // 是否主机回调
    private isHostCallback = false;
    // 是否超时
    private isHostTimeout = false;
    // 任务计数器
    private tastCounter = 1;

    private advanceTimers(currentTime: number) {
        let timer = this.timerQueue.peek();
        while (timer) {
            if (timer.callback && timer.startTime > currentTime) return;
            if (!timer.callback) {
                this.timerQueue.pop();
            } else if (timer.startTime <= currentTime) {
                this.timerQueue.pop();
                timer.sortIndex = timer.expirationTime;
                this.taskQueue.push(timer);
            }
            timer = this.timerQueue.peek();
        }
    }

    private handleTimeout(currentTime: number) {
        this.isHostTimeout = false;
        this.advanceTimers(currentTime);

        if (!this.isHostCallback) {
            if (this.taskQueue.peek()) {
                this.isHostCallback = true;
                this.host.requestHostCallback(this.flushWork);
            } else {
                const firstTimer = this.timerQueue.peek();
                if (firstTimer) this.host.requestHostTimeout(this.handleTimeout, firstTimer.startTime - currentTime);
            }
        }
    }

    private flushWork(hasTimeRemaining: boolean, initialTime: number): boolean {
        this.isHostCallback = false;
        if (this.isHostTimeout) {
            this.isHostTimeout = false;
            this.host.cancelHostTimeout();
        }
        this.isPerformingWork = true;
        const level = this.currentPriorityLevel;
        try {
            return this.workLoop(hasTimeRemaining, initialTime);
        } finally {
            this.currentTask = null;
            this.currentPriorityLevel = level;
            return false;
        }
    }

    private workLoop(hasTimeRemaining: boolean, initialTime: number): boolean {
        let currentTime = initialTime;
        this.advanceTimers(currentTime);
        this.currentTask = this.taskQueue.peek();
        while (this.currentTask && !this.isSchedulerPaused) {
            if (this.currentTask.expirationTime > currentTime && 
                (!hasTimeRemaining || this.host.shouldYieldToHost())) {
                break;
            }
            const callback = this.currentTask.callback;
            if (callback) {
                this.currentTask.callback = null;
                this.currentPriorityLevel = this.currentTask.level;
                const didUserCallbackTimeout = this.currentTask.expirationTime <= currentTime;
                const continuationCallback = callback(didUserCallbackTimeout);
                currentTime = this.host.getCurrentTime();
                if (typeof continuationCallback === 'function') {
                    this.currentTask.callback = continuationCallback;
                } else if (this.currentTask === this.taskQueue.peek()) {
                    this.taskQueue.peek();
                }
                this.advanceTimers(currentTime);
            } else {
                this.taskQueue.pop();
            }
            this.currentTask = this.taskQueue.peek();
        }
        if (this.currentTask) return true;
        const firstTimer = this.timerQueue.peek();
        if (firstTimer) this.host.requestHostTimeout(this.handleTimeout, firstTimer.startTime - currentTime);
        return false;
    }

    /**
     * 执行任务
     * 
     * @param priorityLevel 任务优先级
     * @param eventHandler  事件处理器
     */
    public runWithPriority(priorityLevel: SchedulerPriority, eventHandler: () => void) {
        if (priorityLevel === SchedulerPriority.No) {
            priorityLevel = SchedulerPriority.Normal;
        }
        const prevPriorityLevel = this.currentPriorityLevel;
        this.currentPriorityLevel = priorityLevel;
        try {
            return eventHandler();
        } finally {
            this.currentPriorityLevel = prevPriorityLevel;
        }
    }

    /**
     * 下一步
     * 
     * @param eventHandler 事件处理器
     */
    public next(eventHandler: () => void) {
        let priorityLevel: SchedulerPriority;
        switch (this.currentPriorityLevel) {
            case SchedulerPriority.Immediate:
            case SchedulerPriority.UserBlocking:
            case SchedulerPriority.Normal:
                priorityLevel = SchedulerPriority.Normal;
                break;
            default:  
                priorityLevel = this.currentPriorityLevel;
                break;          
        }
        const prevPriorityLevel = this.currentPriorityLevel;
        this.currentPriorityLevel = priorityLevel;
        try {
            return eventHandler();
        } finally {
            this.currentPriorityLevel = prevPriorityLevel;
        }
    }

    /**
     * 包裹回调
     * 
     * @param callback 回调 
     */
    public wrapCallback(callback: () => void) {
        const parentPriorityLevel = this.currentPriorityLevel;
        const that = this;
        return function () {
            const prevPriorityLevel = that.currentPriorityLevel;
            that.currentPriorityLevel =  parentPriorityLevel;
            try {
                return callback.apply(this, arguments);
            } finally {
                that.currentPriorityLevel = prevPriorityLevel;
            }
        }
    }

    /**
     * 添加任务
     * 
     * @param priorityLevel 优先级
     * @param callback 执行回调
     * @param options  可选参数
     */
    public addTask(priorityLevel: SchedulerPriority, callback: () => void, options?: SchedulerCallbackOptions) {
        const currentTime: number = this.host.getCurrentTime();
        let startTime: number;
        let timeout: number;
        if (options) {
            if (options.delay > 0) {
                startTime = currentTime + options.delay;
            } else {
                startTime = currentTime;
            }
            timeout = options.timeout ? options.timeout : this.timeout[priorityLevel];
        } else {
            timeout = this.timeout[priorityLevel];
            startTime = currentTime;
        }

        const expirationTime = startTime + timeout;
        const newTask: SchedulerTask = {
            id: this.tastCounter++,
            callback,
            priorityLevel,
            startTime,
            expirationTime,
            sortIndex: -1,
        };
        if (startTime > currentTime) {
            newTask.sortIndex = startTime;
            this.timerQueue.push(newTask);

            if (!this.taskQueue.peek() && newTask == this.timerQueue.peek()) {
                if (this.isHostTimeout) {
                    this.host.cancelHostTimeout();
                } else {
                    this.isHostTimeout = true;
                }
                this.host.requestHostTimeout(this.handleTimeout, startTime - currentTime);
            }
        } else {
            newTask.sortIndex = expirationTime;
            this.taskQueue.push(newTask);
            if (!this.isHostCallback && !this.isPerformingWork) {
                this.isHostCallback = true;
                this.host.requestHostCallback(this.flushWork);
            }
        }
        return newTask;
    }

    /**
     *  暂停
     */
    public pause() {
        this.isSchedulerPaused = true;
    }
    /**
     *  继续
     */
    public continue() {
        this.isSchedulerPaused = false;
        if (!this.isHostCallback && !this.isPerformingWork) {
            this.isHostCallback = true;
            this.host.requestHostCallback(this.flushWork);
        }
    }

    /**
     * 获取第一个任务
     */
    public getFirstkTask(): SchedulerTask {
        return this.taskQueue.peek();
    }

    /**
     * 获取当前任务优先级
     */
    public getCurrentPriorityLevel() {
        return this.currentPriorityLevel;
    }

    /**
     * 取消任务
     * 
     * @param task 
     */
    public cancel(task: SchedulerTask) {
        task.callback = null;
    }

    public shouldYield() {
        const currentTime = this.host.getCurrentTime();
        this.advanceTimers(currentTime);
        const firstTask = this.taskQueue.peek();
        return (this.currentTask && 
                firstTask !== this.currentTask && 
                firstTask.callback && 
                firstTask.startTime <= currentTime && 
                firstTask.expirationTime < this.currentTask.expirationTime) ||
                this.host.shouldYieldToHost();
    }

    public now() {
        return this.host.getCurrentTime();
    }

    public forceFrameRate(fps: number) {
        return this.host.forceFrameRate(fps);
    }
}

export default Scheduler;