import React, { Component, ChangeEvent } from 'react';
import Classnames from 'classnames';
import { classPrefix, CascaderSelectState, CascaderData } from "../constants";


interface ListProps {
    multiple?: boolean,
    options?: CascaderData[],
    exclusiveKey?: string,
    highlightKey: string,
    onClick?: (data: CascaderData) => void,
    onHover?: (data: CascaderData) => void,
    onSelected?: (selected: CascaderData, checked: boolean) => void,
    // normal props
    style?: React.CSSProperties
}


class List extends Component<ListProps> {

    static defaultProps = {
        multiple: false,
        exclusiveKey: '',
        highlightKey: '',
    };

    dom: HTMLUListElement | null = null;
    scrollbar: HTMLSpanElement | null = null;

    locs: any[] = [];
    prev?: any;
    timer: any = null;

    prossilyActivate = (data: CascaderData) => {
        const that = this;
        const activate = function() {
            
            if (!that.dom || that.locs.length !== 3) return 0;
            const cur = that.locs[0];
            if (that.prev && cur.x === that.prev.x && cur.y === that.prev.y) return 0;
            const upperRight = {
                x: that.dom.clientWidth,
                y: -75.0,
            }
            const lowRight = {
                x: that.dom.clientWidth,
                y: that.dom.clientHeight + 75.0,
            };
            const slope = function (a: any, b: any) { return (b.y - a.y) / (b.x - a.x); }
            const lowSlop = slope(cur, lowRight);
            const upperSlop = slope(cur, upperRight);
            const prevLowSlop = slope(that.locs[that.locs.length - 1], lowRight);
            const prevUpperSlop = slope(that.locs[that.locs.length - 1], upperRight);
            if (lowSlop < prevLowSlop && upperSlop > prevUpperSlop) {
                that.prev = cur;
                return 200;
            }
            return 0;
        }
        const delay = activate();
        if (delay) {
            this.timer = setTimeout(() => this.prossilyActivate(data), delay);
        } else {
            this.props.onHover && this.props.onHover(data);
        }
    }

    handleClick = (e: React.MouseEvent) => {
        // @ts-ignore 
        const data: CascaderData = (e.target as any).data;
        if (this.props.multiple) {
            const input = (e.target as HTMLElement).querySelector('input');
            if (input) input.click();
        } else if (!data.hasOwnProperty('children')){
            data.status = CascaderSelectState.Selected;
            this.props.onClick && this.props.onClick(data);
        }
    }

    handleLeave = () => {
        clearTimeout(this.timer);
    }

    handleHover = (e: React.MouseEvent) => {
        clearTimeout(this.timer);
        const data = (e.target as any).data;
        if (!this.dom || !data) return;
        this.prossilyActivate(data);
    }

    handleMove = (e: React.MouseEvent) => {
        this.locs.push({ x: e.pageX, y: e.pageY });
        if (this.locs.length > 3) {
            this.locs.shift();
        }
    }

    handleMultipleSelect = (e: ChangeEvent) => {
        e.stopPropagation();
        const $el = e.target as HTMLInputElement;
        const data: CascaderData = ($el.parentNode as any).data;
        if (!data) return;
        if ($el.checked) {
            data.status = CascaderSelectState.Selected;
        } else {
            data.status = CascaderSelectState.Nomal;
        }
        this.props.onSelected && this.props.onSelected(data, $el.checked);
        this.props.onClick && this.props.onClick(data);
    }

    handleDom = (item: CascaderData) => {
        return function (dom: any) {
            if (!dom || dom.data) return;
            dom.data = item;
        }
    }
    
    handleScroll = () => {
        // @ts-ignore
        if (!this.dom || !this.scrollbar) return;
        const height = this.dom.clientHeight;
        const totalHeight = this.dom.scrollHeight;
        const ratio = height / totalHeight;
        const thumb = this.scrollbar.firstElementChild as HTMLSpanElement;
        const that = this;
        requestAnimationFrame(function () {
            if (!that.dom || !that.scrollbar) return;
            if (isNaN(ratio) || ratio >= 1) {
                that.scrollbar.style.visibility = 'hidden';
            } else {
                that.scrollbar.style.cssText = `top: ${that.dom.scrollTop}px;`;
                that.scrollbar.style.visibility = 'visible';
                thumb.style.cssText = `height: ${Math.max(ratio * 100, 10)}%; top: ${+(that.dom.scrollTop / totalHeight) * 100}%;`;
            }
            // @ts-ignore
            that.scrollbar.ratio = ratio;
        });
    }

    handleDrag = (e: React.MouseEvent) => {
        if (!this.dom || !this.scrollbar) return;
        
        let lastPageY: number = 0;
        const that = this;
        const drag = function (e: MouseEvent) {
            const delta = e.pageY - lastPageY;
            lastPageY = e.pageY;
            requestAnimationFrame(() => {
                // @ts-ignore
                that.dom.scrollTop += delta / that.scrollbar.ratio;
            });
        }
        const stop = function () {
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', stop);
        }
        lastPageY = e.pageY;
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stop);
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
    
    componentDidUpdate() {
        this.handleScroll();
    }

    render() {
        let $menu = null;
        if (this.props.options) {
            $menu = this.props.options.map((item: CascaderData) => {
                return (
                    <li className={Classnames(`${classPrefix}-menu-item`, { highlight: this.props.highlightKey === item.value } )} 
                        key={item.value} 
                        title={item.label} 
                        data-status={item.status}
                        ref={this.handleDom(item)}
                        onMouseEnter={this.handleHover}
                        onClick={this.handleClick}>
                        { this.props.multiple ? <input className="checkbox" 
                                                        type="checkbox"
                                                        checked={item.status === CascaderSelectState.Selected} 
                                                        onChange={this.handleMultipleSelect}/> : null }
                        <label className="label">{ item.label }</label>
                    </li>
                );
            });
        }
        return ( 
            <ul style={this.props.style} 
                ref={dom => this.dom = dom} 
                className={`${classPrefix}-menu-list`}
                onMouseLeave={this.handleLeave} 
                onMouseMove={this.handleMove}
                onScroll={this.handleScroll}> 
                { $menu } 
                <span ref={dom => this.scrollbar = dom} className="scrollbar" onMouseDown={this.handleDrag}>
                    <span className="scrollbar-thumb"/>
                </span>
            </ul> 
        );
    }
}

export default List;