type ComparisonFunction<T> = (a: T, b: T) => boolean;

/**
 *  交换两个数组位置
 * 
 *  @param array  数组 
 *  @param idx1   索引1
 *  @param idx2   索引2
 */
const swap = function<T> (array: T[], idx1: number, idx2: number) {
    array[idx1] = array.splice(idx2, 1, array[idx1])[0];
    return array;
}

/**
 * 快速排序
 * 
 * @param array 数组
 * @param comparison 比较方法 
 */
export function QuickSort<T>(array: T[], comparison?: ComparisonFunction<T>) {
    if (array.length <= 1) return array;
    const left = 0;
    const right = array.length - 1;
    const sort = (array: any[], left: number, right: number, comparison?: ComparisonFunction<T>) => {
        if (left < right) {
            const pivot = Math.floor((right + left) / 2);
            swap(array, pivot, right);
            let newPivot = left;
            for (let i = left; i < right; i += 1) {
                if (comparison) {
                    if (comparison(array[i], array[pivot])) {
                        swap(array, i, newPivot);
                        newPivot += 1;
                    } 
                } else if (array[i] < array[pivot]) {
                    swap(array, i, newPivot);
                    newPivot += 1;
                }
            }
            swap(array, right, newPivot);
            this.QuickSort(array, left, newPivot - 1);
            this.QuickSort(array, newPivot + 1, right);
        }
    }
    sort(array, left, right, comparison);
}

/**
 * 归并排序
 * 
 * @description 时间复杂度O(n*log(n)) 使用空间换时间的形式，适合次考虑存储空间的场合。
 * 
 * @param array 数组
 * @param comparison 比较方法 
 */
export function MergeSort<T>(array: T[], comparison?: ComparisonFunction<T>) {
    const merge = function (left: any[], right: any[]) {
        const results = [];
        while (left.length > 0 && right.length > 0) {
            if (comparison) {
                results.push(comparison(left[0], right[0]) ? left.shift() : right.shift());
            } else {
                results.push(left[0] <= right[0] ? left.shift() : right.shift());
            }
        }
        return results.concat(left ,right);
    }
    const sort = function (array: any[]) {
        const len = array.length;
        if (len < 2) return array;

        const mid = Math.floor(len / 2);
        const left = array.splice(0, mid);
        const right = array;
       return merge(sort(left), sort(right));
    }
    sort(array);
}

/**
 * 堆排序
 * 
 * @description 时间复杂度O(n*log(n)) 
 * 
 * @param array 
 * @param comparison 
 */
export function HeapSort<T>(array: T[], comparison?: ComparisonFunction<T>) {
    let len = array.length;

    const heaplify = function (start: number, end: number) {
        const parent = start;
        let child = parent * 2 + 1;
        if (child >= end) return 0;
        if (comparison) {
            if ((child + 1) < end && comparison(array[child], array[child + 1])) {
                child += 1;
            }
            if (comparison(array[parent], array[child])) {
                swap(array, parent, child);
                heaplify(child, end);
            }
        } else {
            if ((child + 1) < end && array[child] < array[child + 1]) {
                child += 1;
            }
            if (array[parent] <= array[child]) {
                swap(array, parent, child);
                heaplify(child, end);
            }
        }
        return 0;
    };
    // 初始化heap
    for (let i = Math.floor(len / 2); i >= 0; i -= 1) {
        heaplify(i, len);
    }
    // 排序
    for (let i = len - 1; i > 0; i -= 1) {
        swap(array, 0, i);
        heaplify(0, 1);
    }
}