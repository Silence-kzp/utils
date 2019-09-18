/**
 *  对象深拷贝
 * 
 *  @param obj 需拷贝的对象
 */
export function ObjectDeepCopy(obj: any) {
    const type = Object.prototype.toString.call(obj);
        switch (type) {
            case '[object Object]':
                const copy = {};
                for (const key in obj) {
                    copy[key] = this.deepCopyObject(obj[key]);
                }
                return copy;
            case '[object Array]':
                return obj.map((item: any) => this.deepCopyObject(item));
            default:
                return obj;
        }
}


/**
 * 通过keypath设置value
 * 
 * @param obj 设置对象 
 * @param keypath 键路径
 * @param value 值
 */
export function ObjectSetValueForKeypath<T>(obj: object, keypath: string | string[], value: T) {
    let keys: string[];
    const key_type = Object.prototype.toString.call(keypath);
    if (key_type === '[object String]') {
        keys = (keypath as string).split('.');
    } else if (key_type === '[object Array]') {
        keys = (keypath as string[]);
    } else {
        throw new Error('keypath不是数组或字符串');
    }
    const obj_type = Object.prototype.toString.call(obj);
    let key: number | string = keys.shift();
    if (obj_type === '[object Array]') {
        key = parseInt(key);
    }
    if (keys.length !== 0) {
        obj[key] = ObjectSetValueForKeypath(obj[key], keys, value);
    } else {
        obj[key] = value;
    }
    return obj;
}


/**
 * 通过keypath获取value
 * 
 * @param obj 设置对象 
 * @param keypath 键路径
 * @param value 值
 */
export function ObjectGetValueForKeypath(obj: object, keypath: string | string[]) {
    let keys: string[];
    const key_type = Object.prototype.toString.call(keypath);
    if (key_type === '[object String]') {
        keys = (keypath as string).split('.');
    } else if (key_type === '[object Array]') {
        keys = (keypath as string[]);
    } else {
        throw new Error('keypath不是数组或字符串');
    }
    const obj_type = Object.prototype.toString.call(obj);
    let key: string | number = keys.shift();
    if (obj_type === '[object Array]') {
        key = parseInt(key);
    }
    if (keys.length !== 0) return this.getStateValue(obj[key], keys);
    return obj[key];
}