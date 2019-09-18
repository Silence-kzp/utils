import React, { Component  } from 'react';
import ReactDom from 'react-dom';
import classes from 'classnames';
import { Input, Button, message } from 'antd';
import Animate from 'rc-animate';
import Search, { CascaderSearchParams } from './components/search';
import List from './components/list';
import { classPrefix, CascaderData as CascaderDataDefined, CascaderSelectState } from "./constants";

export interface CascaderData {
    value: string,
    label: string,
    children?: CascaderData[],
};

export interface CascaderProps {
    data: CascaderData[],
    placeholder: string,
    showAll: boolean, 
    allTitle: string,
    allValue: string,
    search: boolean,
    leastHasOne: boolean,
    multiple: boolean,
    defaultValues: string[],
    onSearch?: (key: string) => Iterator<CascaderData[]> | Promise<CascaderData[]> | CascaderData[],
    onSelected?: (selected: string[]) => void,
    className?: string,
}


const SearchIcon = () => (
    <svg width="1em" height="1em" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
        <defs>
            <path d="M15.17 14.372l-3.215-3.212A6 6 0 1 0 1.333 7.333a6 6 0 0 0 9.827 4.622l3.214 3.214a.563.563 0 0 0 .797 0 .567.567 0 0 0-.002-.797zm-5.94-2.546c-.6.254-1.237.382-1.897.382a4.864 4.864 0 0 1-3.447-1.428 4.864 4.864 0 0 1-1.045-5.344 4.864 4.864 0 0 1 1.045-1.55A4.864 4.864 0 0 1 9.23 2.841c.58.245 1.102.597 1.55 1.045a4.864 4.864 0 0 1 1.046 5.344 4.864 4.864 0 0 1-1.046 1.55c-.448.449-.969.8-1.55 1.046z" id="a"/>
        </defs>
        <use fill="currentColor" xlinkHref="#a" fillRule="evenodd"/>
    </svg>
);

interface CascaderState {
    display: boolean,
    data: CascaderDataDefined[],
    children: CascaderDataDefined[][],
    selected: string[],
    results?: CascaderSearchParams,
    loading: boolean,
    highlight: string[],
}

class Cascader extends Component <CascaderProps, CascaderState> {

    static defaultProps = {
        placeholder: '请选择',
        showAll: true,
        allTitle: '全部',
        allValue: '-127',
        search: true,
        defaultValues: [],
        multiple: false,
        leastHasOne: true,
    }

    private dom: HTMLDivElement | null = null;
    private prevSelected: CascaderDataDefined | null = null;
    private displayDom: HTMLElement | null = null;
    private isAnimation: boolean = false;

    constructor(props: CascaderProps) {
        super(props);
        let data: CascaderDataDefined[] = [];
        const selected: string[] = [];
        data = this.preData(props.data);
        if (props.defaultValues.length > 0) {
            const keys =  props.defaultValues;
            if (!props.multiple) {
                keys.splice(1, keys.length);
            }
            const items = this.findItemsFromValues(data, props.defaultValues);
            if (!props.multiple) {
                const cur = items[0];
                if (cur.children) {
                    this.prevSelected = cur.children[0];
                } else if (cur) {
                    this.prevSelected = cur;
                }
            }
            items.forEach((item: CascaderDataDefined) => {
                item.status = CascaderSelectState.Selected;
                if (item.children) {
                    const values = this.setChildrenStatus(item.children, CascaderSelectState.Selected);
                    selected.push(...values);
                } else {
                    selected.push(item.value);
                }
                if (item.index.length > 1) {
                    this.setParentStatus(item.index, data);
                }
            });
        } else if (!props.multiple && props.showAll) {
            this.prevSelected = data[0];
        }
        this.state = {
            display: false,
            data,
            children: [],
            selected: props.showAll && props.defaultValues.length === 0 ? [props.allValue] : selected,
            highlight: [],
            loading: false,
        };
    }

    // 预处理数据
    preData = (data: CascaderData[], parent?: CascaderDataDefined) => {
        const arr:CascaderDataDefined[] = [];
        let idxOffset = 0;
        if (this.props.showAll && !parent) {
            arr.unshift({ 
                index: [0], 
                value: this.props.allValue, 
                label: this.props.allTitle,
                level: 1,
                levelLabel: this.props.allTitle,
                status: this.props.defaultValues.length === 0 ? CascaderSelectState.Selected : CascaderSelectState.Nomal,
            });
            idxOffset += 1;
        } else if (!this.props.multiple && parent) {
            idxOffset += 1;
        }
        data.forEach((item: CascaderData, idx: number) => {
            const i: CascaderDataDefined = {
                index: [...(parent ? parent.index : []), idx + idxOffset],
                value: item.value,
                label: item.label,
                level: (parent ? parent.level + 1 : 1),
                levelLabel: (parent ? `${parent.levelLabel} / ${item.label}` : item.label),
                status: CascaderSelectState.Nomal,
            };
            if (item.children) {
                i.children = this.preData(item.children, i);
                if (!this.props.multiple) {
                    i.children.unshift({ 
                        index: [...i.index, 0],
                        value: i.value + this.props.allValue, 
                        label: this.props.allTitle, 
                        level: i.level + 1,
                        levelLabel: i.levelLabel + ' / ' + this.props.allTitle,
                        status: CascaderSelectState.Nomal });
                }
            }
            arr.push(i);
        });
        return arr;
    }

    // 通过values寻找CascaderDataDefined
    findItemsFromValues(data: CascaderDataDefined[], values: string[]): CascaderDataDefined[] {
        if (values.length === 0) return [];
        // 层次遍历
        let items: CascaderDataDefined[] = [];
        let waitTraversing: CascaderDataDefined[] = Array.from(data);
        while (waitTraversing.length !== 0) {
            const item: CascaderDataDefined = waitTraversing.shift() as CascaderDataDefined;
            if (values.indexOf(item.value) > -1) {
                items.push(item);
                // 如果查找的values和找到的items相等，则跳出查找
                if (values.length === items.length) waitTraversing.length = 0;
            } else if (item.children) {
                waitTraversing.push(...item.children);
            }
        }
        return items;
    }

    // 设置子节点状态
    setChildrenStatus(children: CascaderDataDefined[], status: CascaderSelectState) {
        const values: string[] = [];
        if (this.props.multiple) {
            children.forEach((item: CascaderDataDefined) => {
                item.status = status;
                if (item.children) {
                    let cvalues = this.setChildrenStatus(item.children, status);
                    values.push(...cvalues);
                } else {
                    values.push(item.value);
                }
            });
        } else {
            const first = children[0];
            first.status = status;
            values.push(first.value);
        }
        return values;
    }

    // 设置父节点状态
    setParentStatus(idx: number[], data: CascaderDataDefined[]) {
        const pids = Array.from(idx);
        pids.pop();
        const that = this;
        const setState = function (obj: any): CascaderDataDefined {
            const type = toString.call(obj);
            const idx = pids.shift();
            if (idx !== undefined) {
                if (type === '[object Array]') {
                    return setState(obj[idx]);
                } else if (type === '[object Object]') {
                    return setState(obj.children[idx]);
                }
                return obj;
            }
            if (obj.children) {
                if (that.props.multiple) {
                    const map = {
                        selected: 0,
                        unselected: 0,
                    };
                    obj.children.forEach((item: CascaderDataDefined) => {
                        if (item.status === CascaderSelectState.Nomal) {
                            map.unselected += 1;
                        } else if (item.status === CascaderSelectState.Selected) {
                            map.selected += 1;
                        }
                    });
                    
                    if (map.unselected === obj.children.length) {
                        obj.status = CascaderSelectState.Nomal;
                    } else if (map.selected === obj.children.length) {
                        obj.status = CascaderSelectState.Selected;
                    } else {
                        obj.status = CascaderSelectState.Section;
                    }
                } else {
                    const find = obj.children.find((item: CascaderDataDefined) => item.status === CascaderSelectState.Selected);
                    if (find) obj.status = CascaderSelectState.Selected;
                    else obj.status = CascaderSelectState.Nomal;
                }
            }
            
            return obj;
        }
        const item = setState(data);
        if (item.index.length > 1) this.setParentStatus(item.index, data); 
    }

    

    // 获取hover展开的子级
    getChildren(data: CascaderDataDefined, showAll = false) {
        if (!data.children) return []; 
        const children = [...data.children];

        const results = [children];
        const find = children.find((item: CascaderDataDefined) => item.status !== CascaderSelectState.Nomal);
        if (find && find.children) {
            results.push(...this.getChildren(find, showAll));
        }
        return results;
    }

    // 获取高亮的value值
    getHighlight(data: CascaderDataDefined) {
        const results = [data.value];
        if (data.children) {
            const find = data.children.find((item: CascaderDataDefined) => item.status !== CascaderSelectState.Nomal);
            if (find && find.hasOwnProperty('children')) {
                results.push(...this.getHighlight(find));
            }
        }
        return results;
    }

    // 处理展示
    handleHover = (data: CascaderDataDefined) => {
        const children = [...this.state.children];
        const highlight = [...this.state.highlight];
        const len = this.state.children.length;
        if (data.hasOwnProperty('children')) {
            const tmp = this.getChildren(data, !this.props.multiple);
            children.splice(data.level - 1, len, ...tmp);
            highlight.splice(data.level - 1, len, ...this.getHighlight(data));
        } else {
            children.splice(data.level - 1, len);
            highlight.splice(data.level - 1, len);
        }
        this.setState({ children, highlight });
    }

    // 处理单选
    handleSelect = (data: CascaderDataDefined) => {
        if (!this.props.multiple && !data.hasOwnProperty('children') && this.state.selected.indexOf(data.value) === -1) {
            const copy = [...this.state.data];
            if (this.prevSelected) {
                this.prevSelected.status = CascaderSelectState.Nomal;
                if (this.prevSelected.level > 1) this.setParentStatus(this.prevSelected.index, copy);
            }
            this.prevSelected = data;
            if (this.prevSelected.level > 1) this.setParentStatus(data.index, copy);
            this.setState({ data: copy, selected: [data.value] }, this.handleConfirm);
        }
    }

    // 处理多选
    handleMultipeSelect = (data: CascaderDataDefined, checked: boolean) => {
        const copy = [...this.state.data];
        const selected = [...this.state.selected];
        // 全部被选中后, 修改其子节点状态
        if (data.value === this.props.allValue) {
            selected.length = 0;
            if (checked) {
                selected.push(data.value);
                copy.forEach((item: CascaderDataDefined) => {
                    if (item.children) {
                        item.status = CascaderSelectState.Nomal;
                        this.setChildrenStatus(item.children, CascaderSelectState.Nomal);
                    }
                });
            }
            return this.setState({ data: copy, selected });
        } else if (selected[0] === this.props.allValue) {
            copy[0].status = CascaderSelectState.Nomal;
            selected.length = 0;
        }
        
        // 更新选择表
        if (data.children) {
            const values = this.setChildrenStatus(data.children, checked ? CascaderSelectState.Selected : CascaderSelectState.Nomal);
            values.forEach((value: string) => {
                const idx = selected.indexOf(value);
                if (!checked) {
                    selected.splice(idx, 1);
                } else if (idx === -1) {
                    selected.push(value);
                }
            });
        } else {
            const idx = selected.indexOf(data.value);
            if (!checked ) {
                selected.splice(idx, 1);
            } else if (idx === -1) {
                selected.push(data.value);
            }
        }
        // 改变所有父节点状态
        if (data.level > 1) this.setParentStatus(data.index, copy);
        this.setState({ data: copy, selected });
    }

    // 处理搜索选择
    handleSearchSelect = (data: CascaderDataDefined, checked: boolean) => {
        if (this.props.multiple) {
            this.handleMultipeSelect(data, checked);
        } else {
            this.handleSelect(data);
        }
    }

    // 处理异步请求
    handleLoad<T>(func: any, callback: (data: T) => void) {
        const type = toString.call(func);
        switch (type) {
            case '[object Promise]':
                (func as Promise<T>).then((...args) => {
                    callback.apply(this, args);
                });
                break;
            case '[object GeneratorFunction]':
                func = (func() as Iterator<T>);
                let val: IteratorResult<T> = func.next();
                const loopFunc = (value: any) => {
                    this.handleLoad(value, (data) => {
                        val = func.next(data);
                    });
                }
                while (!val.done) { loopFunc(val) };
                callback(val.value)
                break;
            case '[object Function]':
                callback(func());
                break;
            default:
                callback(func);        
        }
    }

    // 处理收起逻辑
    handleOutClick = (e: MouseEvent) => {
        if (!this.state.display || (!this.dom && !this.displayDom)) return;
        if (!(this.dom as HTMLElement).contains(e.target as HTMLElement) && 
            !(this.displayDom as HTMLElement).contains(e.target as HTMLElement)) {
            this.setDisplayState(false);
        }
    }

    /**
     *  本地搜索
     *  
     *  @params isSearchLowest 是否搜索最底层, true的话只会匹配最底层的label
     */
    localSearch = (key: string, isSearchLowest = true) => {
        const find = function (data: CascaderDataDefined[], key: string) {
            const results: CascaderDataDefined[] = [];
            data.forEach((item: CascaderDataDefined) => {
                if (isSearchLowest) {
                    if (item.children) {
                        const children = find(item.children, key);
                        if (children.length > 0) {
                            results.push(...children);
                        }
                    } else if (item.label.indexOf(key) > -1) {
                        results.push(item);
                    }
                } else {
                    if (item.label.indexOf(key) > -1) {
                        results.push(item);
                    }
                    if (item.children) {
                        const children = find(item.children, key);
                        if (children.length > 0) {
                            results.push(...children);
                        }
                    }
                }
            });
            return results;
        }
        this.setState({ results: { match: key, data: find(this.state.data, key) }, loading: false });
    }

    // 处理异步搜索请求数据
    handleAsynSearch = (key: string, data: CascaderData[]) => {
       // 将对象平铺
        const get = (item: CascaderData, prefix?: string) => {
            if (item.children) {
                const reuslts: any[] = [];
                item.children.forEach((i: CascaderData) => {
                    reuslts.push(...get(i, `${item.label} / ${i.label}`));
                });
                return reuslts;
            }
            return [{ label: prefix ? `${prefix} / ${item.label}` : item.label, value: item.value }];
        }

        const results: CascaderDataDefined[] = [];
        data.forEach((item: CascaderData) => {
            const tmp: CascaderDataDefined[] = get(item).map((item: any) => {
                const find: CascaderDataDefined[] = this.findItemsFromValues(this.state.data, [item.value]);
                if (find.length > 0) return find[0];
                return {
                    index: [0],
                    value: item.value,
                    label: item.label,
                    level: -1,
                    levelLabel: item.label,
                    status: this.state.selected.indexOf(item.value) > -1 ? CascaderSelectState.Selected : CascaderSelectState.Nomal,
                };
            });
            results.push(...tmp);
        });
        this.setState({ loading: false, results: { match: key, data: results } });
    }

    // 处理搜索
    handleSearch = (key: string) => {
        if (!key) return this.setState({ loading: false, results: undefined }); 
        this.setState({ loading: true, results: { match: '', data: [] } }, () => {
            if (this.props.onSearch) {
                return this.handleLoad(this.props.onSearch(key), 
                (data: CascaderData[]) => {
                    this.handleAsynSearch(key, data);
                });
            }
            this.localSearch(key);
        });
    }

    // 处理确认
    handleConfirm = () => {
        if (this.props.leastHasOne && this.state.selected.length === 0) {
            return message.warn('至少选择一项');
        }
        this.props.onSelected && this.props.onSelected(this.state.selected);
        this.setDisplayState(false);
    }

    // 获取rect 
    getRect = () => {
        if (this.dom) {
            let top = this.dom.offsetTop;
            let left = this.dom.offsetLeft;
            let width = this.dom.clientWidth;
            let height = this.dom.clientHeight;
            let cur = this.dom as HTMLElement;
            while (cur = (cur.offsetParent as HTMLElement)) {
                top += cur.offsetTop;
                left += cur.offsetLeft;
                if (cur.clientWidth > width) {
                    width = cur.clientWidth;
                }
                if (cur.clientHeight > height) {
                    height = cur.clientHeight;
                }
            }
            return { top, left, width, height };
        }
        return { top: 0, left: 0, width: 0, height: 0};
    }

    // 获取显示标题
    getDisplayTitle = () => {
        // 选中全部时，显示全部
        if (this.state.selected[0] === this.props.allValue) return this.props.allTitle;
        // 单选时，显示选择项
        if (!this.props.multiple) {
            if (this.prevSelected) return this.prevSelected.levelLabel;
            return '';
        }
        // 多选时，显示选择数量
        if (this.state.selected.length > 0) return `${this.state.selected.length}项`;
        return '';
    }

    // 获取展示的样式
    getDisplayStyle = (rect: any, horizontal = 'bottom', vertical = 'left') => {
        const style: React.CSSProperties = {};
        if (!this.dom) return style;
        style.left = rect.left + 'px';
        if (horizontal === 'bottom') {
            style.top = rect.top + this.dom.clientHeight + 'px';
        } else {
            style.bottom = -rect.top + 4 + 'px';
        }
        if (this.state.results) {
            style.minWidth = '200px';
            return style;
        }
        if (this.state.children.length > 0) {
            style.width = this.dom.clientWidth * (this.state.children.length + 1) + 'px';
        } else {
            style.width = this.dom.clientWidth + 'px';
        }
        if (vertical === 'right') {
            style.left = rect.left - parseFloat(style.width) + this.dom.clientWidth + 'px';
        }
        return style;
    }

    // 设置显示状态
    setDisplayState = (state: boolean) => {
        if (this.isAnimation) return;
        this.setState({ display: state });
        if (!this.displayDom) {
            this.displayDom = document.createElement('div');
            this.displayDom.style.cssText = 'position: absolute; top: 0px; left: 0px; width: 100%;';
            document.body.appendChild(this.displayDom);
        }
    }

    componentDidMount() {
        document.body.addEventListener('click', this.handleOutClick);
    }

    componentDidUpdate() {
        if (this.displayDom) {
            ReactDom.render(this.renderMenu(), this.displayDom);
        }
    }

    componentWillUnmount() {
        document.body.removeEventListener('click', this.handleOutClick);
        if (this.displayDom) {
            document.body.removeChild(this.displayDom);
        }
    }

    renderMenuSearch = () => {
        const that = this;
        const handleChange = function () {
            let timer: any;
            return function (event: React.ChangeEvent) {
                event.persist();
                if (timer) clearTimeout(timer);
                timer = setTimeout(() => {
                    const key: string = (event.target as HTMLInputElement).value as string;
                    that.handleSearch(key);
                }, 200);
            }
        }
        return (
            <div className={`${classPrefix}-menu-search`}>
                <SearchIcon />
                <Input size="small" 
                       placeholder="搜索"
                       onChange={handleChange()}/>
            </div>
        )
    }

    renderMenuFooter = () => {
        const selectAll = (e: React.ChangeEvent) => {
            if (!this.state.results || this.state.results.data.length === 0) return;
            const $el = e.target as HTMLInputElement;
            this.state.results.data.forEach((item: CascaderDataDefined) => {
                item.status = $el.checked ? CascaderSelectState.Selected : CascaderSelectState.Nomal;
                setTimeout(() => {
                    this.handleMultipeSelect(item, $el.checked);
                });
            });
        }
        return (
            <div className={`${classPrefix}-menu-footer`}>
                {
                    this.state.results && this.state.results.data.length > 0 ? (
                        <div className="select-all">
                            <input id="select-all" type="checkbox" onChange={selectAll} />
                            <label htmlFor="select-all">全选</label>
                        </div>
                    ) : null
                }
                <Button type="primary" value="small" onClick={this.handleConfirm}>确定</Button>
                <Button value="small" onClick={() => { this.setDisplayState(false) }}>取消</Button>
            </div>
        );
    }

    renderMenu = () => {
        const hidden = !this.state.display ? ` ${classPrefix}-menu-hidden` : '';
        const list = [this.state.data, ...this.state.children];
        const vWidth = document.body.clientWidth;
        const vHeight = document.body.clientHeight;
        // @ts-ignore
        const rect = this.dom.getBoundingClientRect();
        let vertical = 'left';
        if (vWidth - rect.left < vWidth / 2) {
            vertical = 'right';
            list.reverse();
        }
        let horizontal = 'bottom';
        if (vHeight - rect.top < vHeight / 2) {
            horizontal = 'top';
        }
        return <Animate showProp="data-show" 
                        transitionName="slide-up" 
                        exclusive={true}
                        component="div" 
                        onEnter={() => this.isAnimation = true}
                        onEnd={() => this.isAnimation = false}>
                <div className={`${classPrefix}-menu${hidden}`}
                        data-vertical={vertical}
                        data-horizontal={horizontal}
                        style={this.getDisplayStyle(this.getRect(), horizontal, vertical)}  
                        data-show={this.state.display}>
                    { this.props.search ? this.renderMenuSearch() : null }
                    {
                        !this.state.results ? (
                            <div className={`${classPrefix}-menu-body`} >
                                { list.map((data, idx) => (
                                    <React.Fragment key={idx}>
                                        
                                        <List 
                                            style={{ width: this.dom ? this.dom.clientWidth + 'px' : 'auto' }}
                                            multiple={this.props.multiple}
                                            options={data} 
                                            highlightKey={this.state.highlight[idx]}
                                            onHover={this.handleHover}
                                            onSelected={this.handleMultipeSelect}
                                            onClick={this.handleSelect}/>
                                        <hr />
                                    </React.Fragment>
                                    )) }
                            </div>
                        ) : (
                            <Search style={{ display: (this.state.results ? '' : 'none') }}
                                    multiple={this.props.multiple} 
                                    results={this.state.results} 
                                    spinning={this.state.loading}
                                    onClick={this.handleSearchSelect}/> 
                        )
                    }
                    
                    { this.props.multiple ? this.renderMenuFooter() : null }   
                </div>
            </Animate>
    }

    render() {
        return (
            <div className={classes(classPrefix, this.props.className)} ref={dom => this.dom = dom}>
                <span className={`${classPrefix}-input`} data-focus={this.state.display} 
                      onClick={() => (this.setDisplayState(!this.state.display))}>
                   <input placeholder={this.props.placeholder} 
                          type="text" 
                          value={this.getDisplayTitle()}
                          readOnly/>
                </span>
            </div>
        );
    }
}

export default Cascader;
