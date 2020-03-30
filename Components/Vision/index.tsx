import React, { useRef } from 'react';
import ReactEcharts from 'echarts-for-react';
import merge from 'deepmerge';

const yAxisLabelFormatter = function(value: string | number) {
    if (value === null) return '-';
    value = +value;
    if (value > 99999999) {
        // 过亿
        return +(value / 100000000).toFixed(2) + '亿';
    } else if (value > 9999) {
        // 过万
        return +(value / 10000).toFixed(2) + '万';
    }
    return +value.toFixed(2);
}

const defaultOptions = function(): { [key: string] : any } {
    return {
        grid: {
            left: 10,
            right: 10,
            top: 20,
            bottom: 20,
            containLabel: true,
        },
        legend: {
            show: true,
            type: 'scroll',
            icon: 'circle',
            padding: [ 0, 20 ],
            bottom: 0,
            itemWidth: 6,
            itemHeight: 6,
            textStyle: { color: "#5D5D5D" },
        },
        xAxis: {
            type: 'category',
            boundaryGap: 0,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                color: '#969FAD',
                padding: [0, 5, 0, 5],
                showMaxLabel: true,
                interval: null,
                showMinLabel: true,
            },
        },
        yAxis: [
            {
                type: 'value',
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    color: '#969FAD',
                    interval: 'auto',
                    formatter: yAxisLabelFormatter,
                },
                splitLine: {
                    show: true,
                    lineStyle: { color: '#EBECF0' },
                },
            },
            {
                type: 'value',
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    color: '#969FAD',
                    interval: 'auto',
                    formatter: yAxisLabelFormatter,
                },
                splitLine: {
                    show: true,
                    lineStyle: { color: '#EBECF0' },
                },
            }
        ],
        tooltip: {
            show: true,
            confine: true,
            trigger: 'axis',
            axisPointer: {
                type: 'line',
                lineStyle: { color: '#39cbb2' },
            },
            borderColor: '#666',
            borderWidth: 0,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            extraCssText: 'box-shadow: 1px 2px 6px rgba(5, 95, 101, 0.4);z-index: 99 !important;',
        },
        color: [
            '#2CBFBE',
            '#7C6AF2',
            '#61a0a8',
            '#d48265',
            '#91c7ae',
            '#749f83',
            '#ca8622',
            '#bda29a',
            '#6e7074',
            '#546570',
            '#c4ccd3'
        ],
    };
}

const calcMaxMin = function (ds: number[], 
                            max: number | null | undefined, 
                            min: number | null | undefined, 
                            offset = 0) {
    let imin = Math.min.apply(null, ds);
    let imax = Math.max.apply(null, ds);

    imin = (min !== null && min !== undefined)
            ? Math.max(imin, min) : imin;
    imax = (max !== null && max !== undefined)
            ? Math.min(imax, max) : imax;
    if (typeof offset === 'string') {
        const v = parseInt(offset) / 100.0;
        const diff = (imax - imin) * v;
        imax += diff;
        imin -= diff;
    } else {
        imax += offset;
        imin -= offset;
    }
    const interval = +(imax - imin).toFixed(2) / 4;
    return {
        max: imin + 4 * interval,
        min: imin,
        interval: interval || 'auto'
    };
};

const Vision = function (props: any) {
    const echart = useRef<any>();
    let options: { [key: string] : any } = { ...defaultOptions() };
    const isEmpty = (props.xAxis?.data?.length === 0);

    if (!isEmpty && !props.loading) {
        const { grid, xAxis, yAxis, legend } = props;
        options = merge(options, { grid, xAxis, legend });
        if (yAxis) {
            if (!Array.isArray(yAxis)) {
                options.yAxis[0] = merge(options.yAxis[0], yAxis);
            } else {
                options.yAxis = yAxis.map((axis: any, idx: number) => 
                                            merge(axis, yAxis[idx]));
            }
        }
        if (props.series) {
            // 过滤空的serie
            options.series = props.series.filter(function(serie: any) {
                return serie.data.filter((item: any) => item !== null || item !== undefined);
            });

            // 设置图例。去除重名
            if (!legend || !legend?.data) {
                options.legend.data = props.series.map((serie: any) => ({ name: serie.name }))
            }
            
            // 获取最大和最小值
            const datas: any[] = [];
            options.series
                   .forEach(function (serie: any) {
                    if (!datas[serie.yAxisIndex || 0]) datas[serie.yAxisIndex || 0] = [];
                    serie.data.forEach(function(item: any) {
                        if (item === null || item === undefined) return;
                        datas[serie.yAxisIndex || 0].push(item);
                    });
                });
            datas.forEach((ds, idx) => {
                if (ds.length === 0) return;
                const obj = calcMaxMin(ds, options.yAxis[idx].max, options.yAxis[idx].min, options.yAxis[idx].padding);
                options.yAxis[idx].max = obj.max;
                options.yAxis[idx].min = obj.min;
                options.yAxis[idx].interval = obj.interval;
            });
        }
        // 显示tooltip
        options.tooltip.formatter = function(params: any) {
            if (Array.isArray(params) && params.length > 1) {
                // 过滤重复得serieName
                const keys: string[] = [];
                params = params.filter(function(serie: any) {
                    const isExists = keys.indexOf(serie.seriesName) !== -1;
                    keys.push(serie.seriesName);
                    return !isExists;
                });

                // 倒序
                params.sort(function(a: any | null, b: any | null) {
                    if (a === null) return -1;
                    else if (b === null) return -1;
                    return b.data - a.data;
                });
            }
            let html = '';
            html += '<div class="toh" style="max-width:200px;font-size: 14px;line-height: 14px; font-' +
                    'weight: bold;color: #2cbfbe;padding:10px;border-bottom: 1px solid #dddddd;">';
            html += params[0].name;
            html += '</div>'
            params.forEach(function(param: any) {
                const serieName = props?.formatter.serieNameFormatter
                    ? props?.formatter.serieNameFormatter(param.seriesName, param.dataIndex)
                    : param.seriesName;
                const value = props?.formatter.valueFormatter
                    ? props?.formatter.valueFormatter(param.value)
                    : param.value;
                if (serieName) {
                    html += '<div class="clearfix" style="min-width:150px;font-size: 14px;line-height: 14px; ' +
                            'color: #979ba8;padding:10px 10px 0px 10px;">';
                    html += '<span style="display: inline-block; width: 10px; height: 10px; margin-right: 5px' +
                            '; background: ' + param.color + ';"></span>';
                    html += serieName;
                    html += '<span style="float:right;margin-left:15px;color:#383838;font-weight: bold;">';
                    html += (value || '-');
                    html += '</span></div>';
                }
            });
            return html;
        };
    }
    // 监听图例变化
    const onLegendChange = function (r: any) {
        // 调整最大值和最小值
        const datas: any[] = [];
        options.series
                .forEach((serie: any) => {
                    if (r.selected[serie.name]) {
                        if (!datas[serie.yAxisIndex || 0]) datas[serie.yAxisIndex || 0] = [];
                        serie.data.forEach(function(item: any) {
                            if (item === null || item === undefined) return;
                            datas[serie.yAxisIndex || 0].push(item);
                        });
                    }
                });
        datas.forEach((ds, idx) => {
            if (ds.length === 0) return;
            const yAxis = Array.isArray(props.yAxis)
                ? props.yAxis[idx]
                : props.yAxis;
            const obj = calcMaxMin(ds, yAxis && yAxis.max, yAxis && yAxis.min, yAxis && yAxis.padding);
            options.yAxis[idx].max = obj.max;
            options.yAxis[idx].min = obj.min;
            options.yAxis[idx].interval = obj.interval;
        });
        const instance = echart?.current.getEchartsInstance();
        instance.setOption(options);
    };
    return <div className="rc-vision">
            {
                (!options.series || options.series.length === 0) && !props.loading
                ? (props.empty ? props.empty : null)
                : null
            }
            {
                options.series
                    ? <ReactEcharts
                            key={props.id || ''}
                            ref={echart}
                            option={options}
                            style={{
                                height: '100%',
                                width: '100%'
                            }}
                            onEvents={{
                                legendselectchanged: onLegendChange
                            }}/>
                    : null
            }
    </div>
}

export default Vision;