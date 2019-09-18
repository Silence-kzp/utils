// 对象类型的枚举
export enum ObjectType {
    Number = '[object Number]',
    String = '[object String]',
    Boolean = '[object Boolean]',
    Array = '[object Array]',
    Object = '[object Object]',
    Function = '[object Function]',
    Symbol = '[object Symbol]',
};

/**
 *  防抖
 * 
 *  @param fn   执行的函数 
 *  @param wait 等待时长，单位ms
 */
export function Debounce(fn: () => void, wait: number) {
    let timer = null;
    return function(...args: any[]) {
        const context = this;
        args.forEach(arg => {
            // 修复React下会报错问题
            if (arg.persist) arg.persist();
        });
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn.apply(context, args), wait);
    };
}

/**
 *  节流
 * 
 *  @param fn   执行的函数
 *  @param wait 等待时长, 单位ms
 */
export function Throttle(fn: () => void, wait: number) {
    let timer = null;
    let previous = null;
    return function(...args: any[]) {
        const context = this;
        const now = +new Date();
        if (!previous) previous = now;
        const remaing = now - previous;
        if (remaing >= wait) {
            fn.apply(context, args);
            previous = now;
        } else {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => fn.apply(context, args), wait);
        }
    };
}


/**
 *  是否相等
 * 
 *  @param a 变量1
 *  @param b 变量2
 */
export function IsEqual<T>(a: T | T[], b: T | T[]): boolean {
    const type = toString.call(a);
    // 类型不相等
    if (type !== toString.call(b)) return false;
    switch (type) {
        case ObjectType.String:
            return '' + a === '' + b;
        case ObjectType.Function:
            // 函数类型无法判断    
        case ObjectType.Number:
            // NaN属于Number类型
            if (+a !== +a) return +b !== +b;
            return +a === 0 ? 1 / +a === 1 / +b : +a === +b;
        case ObjectType.Boolean:
            return a === b;
        case ObjectType.Symbol:
            if (typeof Symbol === 'undefined') return false;
            return Symbol.prototype.valueOf.call(a) === Symbol.prototype.valueOf.call(b);
        case ObjectType.Array:
            let alen = (a as T[]).length;
            if (alen !== (b as T[]).length) return false;
            while (alen--) {
                if (!this.IsEqual(a[alen], b[alen])) return false;
            }
        case ObjectType.Object:
            const keys = Object.keys(a);
            let key = null;
            let olen = keys.length;
            if (keys.length !== Object.keys(b).length) return false;
            while (olen--) {
                key = keys[olen];
                if (!(Object.hasOwnProperty.call(b, key) && this.IsEqual(a[key], b[key]))) return false;
            }
    }
    return true;
}

/**
 *  是否为空
 * 
 *  @param a 变量 
 */
export function IsEmpty<T>(a: T | T[]): boolean {
    if (a == null || a === undefined) return true;
    const type = toString.call(a);
    switch (type) {
        case ObjectType.String:
            return ('' + a === '' || '' + a === 'undefined' || '' + a === 'null');
        case ObjectType.Number:
            return false;
        case ObjectType.Object:
            return Object.keys(a).length === 0;
        case ObjectType.Array:
            return (a as T[]).length === 0;
        default:
            return !!a;          
    }
}
/**
 *  获取url参数
 *  
 *  @param name   获取的参数名
 *  @param search 自定义获取部分
 */
export function GetParam(name: string, search?: string) {
    const reg = new RegExp(`(^|&|\?)${name}=([^&*](&|$))`);
    const r = decodeURIComponent(search || window.location.search).match(reg);
    if (r !== null) return r[2];
    return null;
}