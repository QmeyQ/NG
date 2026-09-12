/**
 * MapManager - 基于网格的空间索引结构
 * 支持按层级（layout）、区域（cellKey）高效查询对象，包含全局对象存储和性能监控统计
 */
/**
 * MapManager - 基于网格的空间索引结构
 * 支持按层级（layout）、区域（cellKey）高效查询对象，包含全局对象存储
 * 提供 info() 返回总对象数和使用的层级数
 */
export class MPMD {
    /** 网格基础大小（像素） */
    private gridSize: number;

    /** 网格存储：layout -> cellKey -> Set<Object> */
    private gridMap: Map<string, Map<string, Set<any>>>;

    /** 全局对象存储（无坐标信息的对象） */
    private globalObjects: Set<any>;

    /**
     * 创建地图管理器
     * @param gridSize 网格基础大小（像素），默认100
     */
    constructor(gridSize: number = 100) {
        if (gridSize <= 0) {
            throw new Error("网格尺寸必须大于0");
        }

        this.gridSize = gridSize;
        this.gridMap = new Map<string, Map<string, Set<any>>>();
        this.globalObjects = new Set<any>();
    }

    /**
     * 添加对象到管理系统
     * @param obj 游戏对象，包含x、y坐标（区域对象）或不含（全局对象）
     * @param layout 可选，指定对象的图层
     * @throws 当传入无效对象时抛出错误
     */
    add(obj: any, layout?: any): void {
        if (!obj || typeof obj !== 'object') {
            throw new Error("无效对象：必须是一个非空对象");
        }

        // 处理全局对象（无坐标信息且未指定层级）
        if ((obj.x === undefined || obj.y === undefined) && layout === undefined) {
            this.globalObjects.add(obj);
            return;
        }

        // 确定对象层级（优先使用参数，其次使用对象属性，默认为0）
        const finalLayout = layout !== undefined ? layout : (obj.layout ?? 0);
        const layoutKey = String(finalLayout);

        // 确保对象有 layout 属性（用于排序等）
        if (!obj.hasOwnProperty('layout')) {
            Object.defineProperty(obj, 'layout', {
                value: finalLayout,
                writable: true,
            });
        } else {
            obj.layout = finalLayout;
        }

        // 初始化该层级的网格
        if (!this.gridMap.has(layoutKey)) {
            this.gridMap.set(layoutKey, new Map<string, Set<any>>());
        }

        // 如果有坐标，添加到空间索引
        if (obj.x !== undefined && obj.y !== undefined) {
            this._addToSpatialIndex(obj, layoutKey);
        }
    }

    /**
     * 从系统中移除对象
     * @param obj 要移除的对象
     */
    del(obj: any): void {
        if (!obj) return;

        // 移除全局对象
        if (this.globalObjects.has(obj)) {
            this.globalObjects.delete(obj);
            return;
        }

        // 移除区域对象：从对应层级网格中删除
        const layout = obj.layout;
        if (layout !== undefined) {
            const layoutKey = String(layout);
            const layoutGrid = this.gridMap.get(layoutKey);
            if (layoutGrid) {
                // 遍历所有单元格删除该对象
                for (const [cellKey, cellSet] of layoutGrid) {
                    if (cellSet.has(obj)) {
                        cellSet.delete(obj);
                        if (cellSet.size === 0) {
                            layoutGrid.delete(cellKey);
                        }
                    }
                }
                // 如果该层级下所有单元格都空了，可移除整个层级（可选）
                if (layoutGrid.size === 0) {
                    this.gridMap.delete(layoutKey);
                }
            }
        }
    }

    /**
     * 多功能查询接口
     * @param rectOrLayout 查询区域 [x, y, ex, ey] 或层级（字符串/数字）
     * @param layout 筛选层级（可选，仅在区域查询时有效）
     * @returns 匹配的对象集合
     */
    get(rectOrLayout?: [number, number, number, number] | any, layout?: any): Set<any> {
        let result: Set<any> = new Set<any>();

        if (Array.isArray(rectOrLayout)) {
            // 情况1：区域查询
            if (rectOrLayout.length !== 4) {
                throw new Error("区域参数必须为[x, y, ex, ey]格式的数组");
            }
            const [x, y, ex, ey] = rectOrLayout;
            const width: number = ex - x;
            const height: number = ey - y;
            this._queryArea(x, y, width, height, result, layout);
        } else if (rectOrLayout !== undefined) {
            // 情况2：获取指定层级所有对象
            result = this._getByLayout(rectOrLayout);
        } else {
            // 情况3：获取所有对象
            result = this._getAllObjects();
        }

        return result;
    }

    /**
     * 按时间添加对象（时间整除网格大小作为层级）
     * @param time 时间值
     * @param obj 要添加的对象
     */
    public addByTime(time: number, obj: any): void {
        const layout = Math.floor(time / this.gridSize);
        this.add(obj, layout);
    }

    /**
     * 将时间解析为对应的层级值
     * @param time  时间值
     * @returns     层级数值，即 floor(time / gridSize)
     */
    public timeTo(time: number): number {
        return Math.floor(time / this.gridSize);
    }

    /**
     * 清空所有对象
     */
    clear(): void {
        this.globalObjects.clear();
        this.gridMap.clear();
    }

    /**
     * 更新网格系统尺寸
     * @param newSize 新网格尺寸
     * @param keepObjects 是否保留现有对象，默认true
     * @returns 之前的网格信息
     */
    grid(newSize: number, keepObjects: boolean = true): { size: number, objects: Set<any> } {
        if (newSize <= 0) {
            throw new Error("网格尺寸必须大于0");
        }

        const prevGrid = {
            size: this.gridSize,
            objects: this._getAllObjects()
        };

        this.gridSize = newSize;
        // 保存所有对象以便重建
        const allObjects = prevGrid.objects;

        // 清空网格
        this.gridMap.clear();

        // 重建空间索引
        if (keepObjects) {
            // 按原层级分组重建（保留原有 layout 属性）
            const layoutGroups = new Map<string, Set<any>>();
            allObjects.forEach(obj => {
                if (obj.x !== undefined && obj.y !== undefined) {
                    const lay = String(obj.layout ?? 0);
                    if (!layoutGroups.has(lay)) {
                        layoutGroups.set(lay, new Set());
                    }
                    layoutGroups.get(lay)!.add(obj);
                }
                // 全局对象（无坐标）不加入网格，保留在 globalObjects 中
            });
            // 重建每个层级
            for (const [lay, set] of layoutGroups) {
                const layoutGrid = new Map<string, Set<any>>();
                this.gridMap.set(lay, layoutGrid);
                set.forEach(obj => this._addToSpatialIndex(obj, lay));
            }
        }

        return prevGrid;
    }

    /**
     * 对对象集合进行排序
     * @param objects 要排序的对象集合或数组
     * @param order 排序方向，'asc'升序或'desc'降序，默认'asc'
     * @returns 排序后的数组
     */
    sort(objects: Set<any> | any[], order: 'asc' | 'desc' = 'asc'): any[] {
        const arr: any[] = Array.isArray(objects) ? objects : Array.from(objects);
        const dir: number = order === 'asc' ? 1 : -1;

        return arr.sort((a, b) => {
            // 优先按层级排序
            if (a.layout !== b.layout) {
                return dir * (a.layout - b.layout);
            }
            // 其次按Y轴排序
            if (a.y !== b.y) {
                return dir * (a.y - b.y);
            }
            // 最后按X轴排序
            return dir * (a.x - b.x);
        });
    }

    /**
     * 获取系统信息
     * @returns 包含总对象数和总层级数的对象
     */
    info(): { total: number; LT: number } {
        let total = this.globalObjects.size;
        // 遍历所有层级累加区域对象
        for (const [layoutKey, layoutGrid] of this.gridMap) {
            const cellSet = new Set<any>();
            for (const [cellKey, objSet] of layoutGrid) {
                objSet.forEach(obj => cellSet.add(obj));
            }
            total += cellSet.size;
        }
        return {
            total: total,
            LT: this.gridMap.size
        };
    }

    getTC(){
        return this.gridMap.size * this.gridSize - this.gridSize + this.gridMap.keys.length == 0 ? 0 : this.gridMap.get((this.gridMap.keys as any)[this.gridMap.keys.length - 1])?.size;
    }
    /**
     * 优化存储（清理空单元格）
     * @param minEmpty 触发优化的最小空单元数，默认10
     * @returns 是否执行了优化
     */
    compact(minEmpty: number = 10): boolean {
        let emptyCount: number = 0;

        this.gridMap.forEach((layoutGrid) => {
            const emptyCells: string[] = [];

            layoutGrid.forEach((cellSet, cellKey) => {
                if (cellSet.size === 0) {
                    emptyCells.push(cellKey);
                    emptyCount++;
                }
            });

            emptyCells.forEach(cellKey => layoutGrid.delete(cellKey));
        });

        return emptyCount >= minEmpty;
    }

    /**
     * 将对象添加到空间索引
     * @param obj 要添加的对象
     * @param layout 对象所在层级（已转为字符串）
     */
    private _addToSpatialIndex(obj: any, layout: string): void {
        const cells: Set<string> = this._getObjectCells(obj);
        const layoutGrid: Map<string, Set<any>> = this.gridMap.get(layout)!;

        cells.forEach(cellKey => {
            if (!layoutGrid.has(cellKey)) {
                layoutGrid.set(cellKey, new Set<any>());
            }
            layoutGrid.get(cellKey)!.add(obj);
        });
    }

    /**
     * 计算对象覆盖的网格单元格
     * @param obj 游戏对象
     * @returns 单元格键集合
     */
    private _getObjectCells(obj: any): Set<string> {
        const cells: Set<string> = new Set<string>();
        const x: number = obj.x;
        const y: number = obj.y;
        const width: number = obj.width || 1;
        const height: number = obj.height || 1;

        const startX: number = Math.floor(x / this.gridSize);
        const endX: number = Math.floor((x + width) / this.gridSize);
        const startY: number = Math.floor(y / this.gridSize);
        const endY: number = Math.floor((y + height) / this.gridSize);

        for (let cx: number = startX; cx <= endX; cx++) {
            for (let cy: number = startY; cy <= endY; cy++) {
                cells.add(`${cx},${cy}`);
            }
        }

        return cells;
    }

    /**
     * 区域查询核心实现
     * @param x 区域左上角X坐标
     * @param y 区域左上角Y坐标
     * @param width 区域宽度
     * @param height 区域高度
     * @param resultSet 结果集
     * @param layout 筛选层级（可选）
     */
    private _queryArea(x: number, y: number, width: number, height: number,
                        resultSet: Set<any>, layout?: any): void {
        const startX: number = Math.floor(x / this.gridSize);
        const endX: number = Math.floor((x + width) / this.gridSize);
        const startY: number = Math.floor(y / this.gridSize);
        const endY: number = Math.floor((y + height) / this.gridSize);

        // 确定要查询的层级
        let layouts: string[];
        if (layout !== undefined) {
            layouts = [String(layout)];
        } else {
            layouts = Array.from(this.gridMap.keys());
        }

        for (const currentLayout of layouts) {
            const layoutGrid = this.gridMap.get(currentLayout);
            if (!layoutGrid) continue;

            for (let cx: number = startX; cx <= endX; cx++) {
                for (let cy: number = startY; cy <= endY; cy++) {
                    const cellKey: string = `${cx},${cy}`;
                    if (layoutGrid.has(cellKey)) {
                        layoutGrid.get(cellKey)!.forEach(obj => {
                            if (this._isInRect(obj, x, y, width, height)) {
                                resultSet.add(obj);
                            }
                        });
                    }
                }
            }
        }
    }

    /**
     * 检查对象是否在矩形区域内
     * @param obj 游戏对象
     * @param x 区域X坐标
     * @param y 区域Y坐标
     * @param width 区域宽度
     * @param height 区域高度
     * @returns 是否在区域内
     */
    private _isInRect(obj: any, x: number, y: number, width: number, height: number): boolean {
        const objWidth: number = obj.width || 1;
        const objHeight: number = obj.height || 1;
        const objEx: number = obj.x + objWidth;
        const objEy: number = obj.y + objHeight;

        return obj.x < x + width &&
               objEx > x &&
               obj.y < y + height &&
               objEy > y;
    }

    /**
     * 获取所有对象（包括全局对象和所有网格中的区域对象）
     * @returns 包含所有对象的集合
     */
    private _getAllObjects(): Set<any> {
        var result = new Set<any>(this.globalObjects);

        for (var [layoutKey, layoutGrid] of this.gridMap) {
            for (var [cellKey, objSet] of layoutGrid) {
                objSet.forEach(obj => result.add(obj));
            }
        }

        return result;
    }

    /**
     * 按层级获取该层级所有对象（区域对象，不包括全局对象）
     * @param layout 层级（任意类型，内部转为字符串）
     * @returns 该层级所有对象的集合
     */
    private _getByLayout(layout: any): Set<any> {
        const result = new Set<any>();
        if(this.gridMap.get(String(layout)))
        for (const [cellKey, objSet] of this.gridMap.get(String(layout))) {
            objSet.forEach(obj => result.add(obj));
        }
        return result;
    }
}

/**
 * MPM — 事件多播管理
 */
export class MPM {
    private _handlers: Map<string, Set<Function>> = new Map();

    on(event: string, cb: Function): void {
        if (!this._handlers.has(event)) {
            this._handlers.set(event, new Set());
        }
        this._handlers.get(event)!.add(cb);
    }

    emit(event: string, ...args: any[]): void {
        const set = this._handlers.get(event);
        if (!set) return;
        set.forEach(cb => {
            try {
                cb(...args);
            } catch (e) {
                console.error(`[MPM] 事件 "${event}" 回调异常:`, e);
            }
        });
    }

    off(event?: string, cb?: Function): void {
        if(!event)
            this._handlers.clear();
        const set = this._handlers.get(event);
        if(cb)
            if (set) set.delete(cb);
        else
            this._handlers.delete(event);
    }

    /**
     * unon: 清理指定事件的所有回调；不传 event 则清理全部
     */
    unon(event?: string): void {
        if (event) {
            this._handlers.delete(event);
        } else {
            this._handlers.clear();
        }
    }

    has(event: string): boolean {
        const set = this._handlers.get(event);
        return !!set && set.size > 0;
    }

    count(event: string): number {
        return this._handlers.get(event)?.size || 0;
    }
}