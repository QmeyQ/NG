export class MapManager {
    /** 网格基础大小（像素） */
    private gridSize: number;
    
    /** 网格存储：layout -> cellKey -> Set<Object> */
    private gridMap: Map<number, Map<string, Set<any>>>;
    
    /** 全局对象存储（无坐标信息的对象） */
    private globalObjects: Set<any>;
    
    /** 按层级存储的区域对象 */
    private layoutObjects: Map<number, Set<any>>;
    
    /** 性能监控统计 */
    private stats: {
        totalQueries: number;
        lastQueryTime: number;
    };

    /**
     * 创建地图管理器
     * @param gridSize 网格基础大小（像素），默认100
     */
    constructor(gridSize: number = 100) {
        if (gridSize <= 0) {
            throw new Error("网格尺寸必须大于0");
        }
        
        this.gridSize = gridSize;
        this.gridMap = new Map<number, Map<string, Set<any>>>();
        this.globalObjects = new Set<any>();
        this.layoutObjects = new Map<number, Set<any>>();
        
        this.stats = {
            totalQueries: 0,
            lastQueryTime: 0
        };
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
        
        // 处理全局对象（无坐标信息）
        if ((obj.x === undefined || obj.y === undefined) && layout === undefined) {
            this.globalObjects.add(obj);
            return;
        }
        
        // 确定对象层级（优先使用参数，其次使用对象属性，默认为0）
        const finalLayout = layout !== undefined ? layout : (obj.layout ?? 0);
        //检查layout属性，没有则添加
        if (!obj.hasOwnProperty('layout')) {
            Object.defineProperty(obj, 'layout', {
                value: finalLayout,
                writable: true,
            });
        }
        else
        obj.layout = finalLayout; // 确保对象有layout属性
        
        // 初始化层级存储
        if (!this.layoutObjects.has(finalLayout)) {
            this.layoutObjects.set(finalLayout, new Set<any>());
            this.gridMap.set(finalLayout, new Map<string, Set<any>>());
        }
        
        // 添加到层级集合
        this.layoutObjects.get(finalLayout)!.add(obj);
        
        if(obj.x === undefined || obj.y === undefined) return;
        // 添加到空间索引
        this._addToSpatialIndex(obj, finalLayout);
    }

    /**
     * 从系统中移除对象
     * @param obj 要移除的对象
     */
    removeObject(obj: any): void {
        if (!obj) return;
        
        // 移除全局对象
        if (this.globalObjects.has(obj)) {
            this.globalObjects.delete(obj);
            return;
        }
        
        // 移除区域对象
        const layout: number = obj.layout ?? 0;
        if (this.layoutObjects.has(layout)) {
            const layoutSet = this.layoutObjects.get(layout)!;
            if (layoutSet.has(obj)) {
                layoutSet.delete(obj);
                this._removeFromSpatialIndex(obj, layout);
            }
        }
    }

    /**
     * 多功能查询接口
     * @param rectOrLayout 查询区域 [x, y, ex, ey] 或层级
     * @param layout 筛选层级（可选）
     * @returns 匹配的对象集合
     */
    get(rectOrLayout?: any, layout?: any): Set<any> {
        const startTime: number = Laya.timer.currTimer;
        let result: Set<any> = new Set<any>();
        
        // 处理不同参数组合
        if (Array.isArray(rectOrLayout)) {
            // 情况1：区域查询
            if (rectOrLayout.length !== 4) {
                throw new Error("区域参数必须为[x, y, ex, ey]格式的数组");
            }
            
            // 执行区域查询
            const [x, y, ex, ey] = rectOrLayout;
            const width: number = ex - x;
            const height: number = ey - y;
            
            this._queryArea(x, y, width, height, result, layout);
        } 
        else if (rectOrLayout !== undefined) {
            // 情况2：获取指定层级对象
            result = this._getByLayout(rectOrLayout);
        } 
        else {
            // 情况3：获取所有对象
            result = this._getAllObjects();
        }
        
        // 更新性能统计
        this.stats.totalQueries++;
        this.stats.lastQueryTime = Laya.timer.currTimer - startTime;
        
        return result;
    }

    /**
     * 清空所有对象
     */
    clearAll(): void {
        this.globalObjects.clear();
        this.layoutObjects.clear();
        this.gridMap.clear();
    }

    /**
     * 更新网格系统尺寸
     * @param newSize 新网格尺寸
     * @param keepObjects 是否保留现有对象，默认true
     * @returns 之前的网格信息
     */
    updateGridSize(newSize: number, keepObjects: boolean = true): { size: number, objects: Set<any> } {
        if (newSize <= 0) {
            throw new Error("网格尺寸必须大于0");
        }
        
        const prevGrid = {
            size: this.gridSize,
            objects: this._getAllObjects()
        };
        
        this.gridSize = newSize;
        this.gridMap.clear();
        
        // 重建空间索引
        if (keepObjects) {
            this.layoutObjects.forEach((set, layout) => {
                this.gridMap.set(layout, new Map<string, Set<any>>());
                set.forEach(obj => this._addToSpatialIndex(obj, layout));
            });
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
     * 获取系统统计信息
     * @returns 包含各种统计数据的对象
     */
    getStats(): {
        gridSize: number;
        totalObjects: number;
        globalObjects: number;
        usedLayouts: number;
        gridCells: number;
        lastQueryTime: string;
        queryCount: number;
    } {
        let totalObjects: number = this.globalObjects.size;
        let gridCells: number = 0;
        
        this.layoutObjects.forEach((set, layout) => {
            totalObjects += set.size;
            if (this.gridMap.has(layout)) {
                gridCells += this.gridMap.get(layout)!.size;
            }
        });
        
        return {
            gridSize: this.gridSize,
            totalObjects,
            globalObjects: this.globalObjects.size,
            usedLayouts: this.layoutObjects.size,
            gridCells,
            lastQueryTime: `${this.stats.lastQueryTime.toFixed(2)}ms`,
            queryCount: this.stats.totalQueries
        };
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
            
            // 收集空单元格
            layoutGrid.forEach((cellSet, cellKey) => {
                if (cellSet.size === 0) {
                    emptyCells.push(cellKey);
                    emptyCount++;
                }
            });
            
            // 清理空单元格
            emptyCells.forEach(cellKey => layoutGrid.delete(cellKey));
        });
        
        return emptyCount >= minEmpty;
    }

    /**
     * 将对象添加到空间索引
     * @param obj 要添加的对象
     * @param layout 对象所在层级
     */
    private _addToSpatialIndex(obj: any, layout: number): void {
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
     * 从空间索引中移除对象
     * @param obj 要移除的对象
     * @param layout 对象所在层级
     */
    private _removeFromSpatialIndex(obj: any, layout: number): void {
        const cells: Set<string> = this._getObjectCells(obj);
        const layoutGrid: Map<string, Set<any>> = this.gridMap.get(layout)!;
        
        cells.forEach(cellKey => {
            if (layoutGrid.has(cellKey)) {
                const cellSet: Set<any> = layoutGrid.get(cellKey)!;
                cellSet.delete(obj);
                
                // 清理空单元格
                if (cellSet.size === 0) {
                    layoutGrid.delete(cellKey);
                }
            }
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
        
        // 遍历所有覆盖的单元格
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
        const layouts: number[] = layout !== undefined 
            ? [layout] 
            : Array.from(this.layoutObjects.keys());
        
        // 遍历所有相关层级
        for (const currentLayout of layouts) {
            const layoutGrid: Map<string, Set<any>> | undefined = this.gridMap.get(currentLayout);
            if (!layoutGrid) continue;
            
            // 遍历所有相关单元格
            for (let cx: number = startX; cx <= endX; cx++) {
                for (let cy: number = startY; cy <= endY; cy++) {
                    const cellKey: string = `${cx},${cy}`;
                    if (layoutGrid.has(cellKey)) {
                        // 精确检查对象是否在区域内
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
        
        // 轴对齐矩形碰撞检测
        return obj.x < x + width &&
               objEx > x &&
               obj.y < y + height &&
               objEy > y;
    }

    /**
     * 获取所有对象
     * @returns 包含所有对象的集合
     */
    private _getAllObjects(): Set<any> {
        const all: Set<any> = new Set<any>(this.globalObjects);
        
        this.layoutObjects.forEach(set => {
            set.forEach(obj => all.add(obj));
        });
        
        return all;
    }

    /**
     * 按层级获取对象
     * @param layout 层级
     * @returns 包含该层级所有对象的集合
     */
    private _getByLayout(layout: number): Set<any> {
        const result: Set<any> = new Set<any>();
        
        // 添加该层级的区域对象
        if (this.layoutObjects.has(layout)) {
            this.layoutObjects.get(layout)!.forEach(obj => result.add(obj));
        }
        
        return result;
    }
}