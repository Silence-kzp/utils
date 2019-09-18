export const classPrefix = "cascader";

export enum CascaderSelectState {
    Nomal,    // 正常
    Section,  // 部分选择
    Selected, // 选则
}

export interface CascaderData { 
    index: number[],
    value: string,
    label: string,
    level: number,
    levelLabel: string,
    status: CascaderSelectState,
    children?: CascaderData[],
}