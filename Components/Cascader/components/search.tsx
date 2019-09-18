import React, { Component } from 'react';
import { Spin, Empty } from 'antd';
import Classnames from 'classnames';
import { classPrefix, CascaderData, CascaderSelectState } from "../constants";
import '../style/search.less';

export interface CascaderSearchParams {
    match: string,
    data: CascaderData[],
}

interface CascaderSearchProps {
    multiple: boolean,
    spinning: boolean,
    style?: React.CSSProperties,
    results?: CascaderSearchParams,
    onClick?: (selected: CascaderData, checked: boolean) => void, 
}

class CascaderSearch extends Component<CascaderSearchProps> {

    static defaultProps = {
        multiple: false,
        spinning: false,
    };

    dom: HTMLDivElement | null = null;
    scrollbar: HTMLSpanElement | null = null;
    
    handleSelect = (e: React.MouseEvent) => {
        const $el = e.target as HTMLInputElement;
        const data: CascaderData = ($el as any).data;
        let checked = true;
        if (this.props.multiple) {
            checked = ($el.querySelector('input') as HTMLInputElement).checked;
        }
        data.status = !checked ? CascaderSelectState.Selected : CascaderSelectState.Nomal;
        this.props.onClick && this.props.onClick(data, !checked);
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
                thumb.style.cssText = `height: ${Math.max(ratio * 100, 10)}%; top: ${+(that.dom.scrollTop / totalHeight) * 100}%;`;
            }
            // @ts-ignore
            that.scrollbar.ratio = ratio;
        });
    }

    handleDrag = () => {
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
        this.scrollbar.addEventListener('mousedown', function (e: MouseEvent) {
            lastPageY = e.pageY;
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', stop);
            return false;
        });
    }

    componentDidMount() {
        this.handleDrag();
    }
    
    componentDidUpdate() {
        this.handleScroll();
    }

    render() {
        let body = null;
        if (this.props.results && this.props.results.data.length > 0) {
            body = (<ul className={`${classPrefix}-search-body-results`}>
                {
                    this.props.results.data.map((item: CascaderData) => {
                        // @ts-ignore
                        const regex = new RegExp(this.props.results.match, 'g');
                        return (
                            <li className={Classnames(`${classPrefix}-search-body-results-item`, { 'selected': item.status !== CascaderSelectState.Nomal })}
                                key={item.value} 
                                ref={(dom: any) => {
                                    if (dom) dom.data = item;
                                }} 
                                onClick={this.handleSelect}>
                                    { this.props.multiple ? <input type="checkbox"
                                            checked={item.status === CascaderSelectState.Selected} 
                                            readOnly/> : null }
                                    <label className="label" 
                                            dangerouslySetInnerHTML={{ __html: item.levelLabel.replace(regex, '<span class="highlight">$&</span>') }} />
                            </li>
                        )
                    })
                }
            </ul>);
        } else {
            body = <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="很遗憾！什么都没找到"/>;
        }
        return (
            <div className={`${classPrefix}-search-body`} 
                 style={this.props.style} 
                 ref={dom => this.dom = dom} 
                 onScroll={this.handleScroll}>
                {
                    !this.props.spinning ? body : <Spin tip="加载中" spinning={this.props.spinning}></Spin>   
                }
                <span ref={dom => this.scrollbar = dom} className="scrollbar">
                    <span className="scrollbar-thumb"/>
                </span>
            </div>
        );
    }
}

export default CascaderSearch;