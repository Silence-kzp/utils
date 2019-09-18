/**
 * easeIn 动画效果
 * 
 * @param precent 时间百分比
 */
export function easeIn(percent: number) { return percent ** 2 }

/**
 * shake 动画效果
 * 
 * @param precent 时间百分比 
 */
export function shake(percent: number) {
    if (percent < 0.6 ) {
        return (percent / 0.6) ** 2;
    }
    return Math.sin((percent - 0.6) * ((3.0 * Math.PI) / 0.4)) * 0.2 + 1;
 }; 

export function animation(time: number, callback: (percent: number) => void) {
    let startTime = performance.now();
        const loop = function() {
            raf = requestAnimationFrame(loop);
            let pre = (performance.now() - startTime) / time;
            if (pre >= 1) {
                pre = 1;
                cancelAnimationFrame(raf);
            }
            callback(pre);
        };
        let raf = requestAnimationFrame(loop);
};