export interface HeapNode {
    id: number,
    sortIndex: number,
}

class Heap<T extends HeapNode> {

    private arr: T[] = [];

    push(node: T) {
        const idx = this.arr.length;
        this.arr.push(node);
        this.siftUp(node, idx);
    }

    pop() {
        const first = this.arr[0];
        if (first) {
            const last = this.arr.pop();
            if (first !== last) {
                this.arr[0] = last;
            }
        }
        return null;
    }

    peek(): T | null {
        return this.arr[0] || null;
    }

    siftUp(node: T, i: number) {
        let idx = i;
        while (true) {
            const parentIdx = Math.floor((idx - 1) / 2);
            const parent = this.arr[parentIdx];
            // 无父节点或者父节点小的话，退出循环
            if (parent === undefined || this.compare(parent, node) <= 0) return;
            this.arr[parentIdx] = node;
            this.arr[idx] = parent;
            idx = parentIdx;
        }
    }

    siftDown(node: T, i: number) {
        let idx = i;
        const len = this.arr.length;
        while (idx < len) {
            const lidx = (idx + 1) * 2 - 1;
            const left = this.arr[lidx];
            const ridx = lidx + 1;
            const right = this.arr[ridx];
            if (left &&  this.compare(left, node) < 0) {
                if (right && this.compare(right, left) < 0) {
                    this.arr[idx] = right;
                    this.arr[ridx] = node;
                    idx = ridx;
                } else {
                    this.arr[idx] = left;
                    this.arr[lidx] = node;
                    idx = lidx;
                }
            } else if (right && this.compare(right, node) < 0) {
                this.arr[idx] = right;
                this.arr[ridx] = node;
                idx = ridx;
            } else {
                // 退出循环
                return;
            }
        }
    }

    compare(a: T, b: T) {
        const diff = a.sortIndex - b.sortIndex;
        return diff !== 0 ? diff : a.id - b.id;
    }

}

export default Heap;