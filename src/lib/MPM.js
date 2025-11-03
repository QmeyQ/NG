/**
MPM.js
MAPManager(gridSize=100)
get()返回所有对象  Set<Object>
get(layout)返回 Set<Object>
get([x, y, ex, ey])返回 Set<Object>
get([x, y, ex, ey], layout)返回 Set<Object>
add({non xy})添加全局对象
add({ x:, y:, *layout:});添加区域对象
updateGridSize(1);// 动态调整网格
sort({Set|Array}objects, {string}order = 'asc')  返回{Array}
 */
class MapManager {
    /**
     * 创建地图管理器
     * @param {number} gridSize - 网格基础大小（像素），默认100
     */
    constructor(gridSize = 100) {
        // 网格系统参数
        this.gridSize = gridSize;
        this.gridMap = new Map(); // 网格存储：layout -> cellKey -> Set<Object>
        
        // 对象分类存储
        this.globalObjects = new Set();   // 全局对象存储
        this.layoutObjects = new Map();   // 按层级存储的区域对象
        
        // 性能监控
        this.stats = {
            totalQueries: 0,
            lastQueryTime: 0
        };
    }
    
    /* 核心API */
    
    /**
     * 添加对象到管理系统
     * @param {Object} obj - 游戏对象
     * @throws {Error} 无效对象
     */
    add(obj, layout) {
        if (!obj || typeof obj !== 'object') {
            throw new Error("无效对象");
        }
        
        // 全局对象处理
        if (obj.x === undefined || obj.y === undefined) {
            this.globalObjects.add(obj);
            return;
        }
        
        // 确定对象层级（默认为0）
        const layout = obj.layout ?? 0;
        obj.layout = layout; // 确保对象有layout属性
        
        // 初始化层级存储
        if (!this.layoutObjects.has(layout)) {
            this.layoutObjects.set(layout, new Set());
            this.gridMap.set(layout, new Map());
        }
        
        // 添加到层级集合
        this.layoutObjects.get(layout).add(obj);
        
        // 空间索引处理
        this._addToSpatialIndex(obj, layout);
    }
    
    /**
     * 从系统中移除对象
     * @param {Object} obj - 要移除的对象
     */
    removeObject(obj) {
        if (!obj) return;
        
        // 全局对象移除
        if (this.globalObjects.has(obj)) {
            this.globalObjects.delete(obj);
            return;
        }
        
        // 区域对象移除
        const layout = obj.layout ?? 0;
        if (this.layoutObjects.has(layout)) {
            const layoutSet = this.layoutObjects.get(layout);
            if (layoutSet.has(obj)) {
                layoutSet.delete(obj);
                this._removeFromSpatialIndex(obj, layout);
            }
        }
    }
    
    /**
     * 多功能查询接口
     * @param {number|Array} [rect] - 查询区域或层级
     * @param {number} [layout] - 筛选层级
     * @returns {Set} 匹配的对象集合
     */
    get(rect, layout) {
        const startTime = performance.now();
        let result = new Set();
        
        // 处理不同参数组合
        if (rect === undefined) {
            // 情况1：获取所有对象
            result = this._getAllObjects();
        } else if (typeof rect === 'number') {
            // 情况2：获取指定层级对象
            result = this._getByLayout(rect);
        } else if (Array.isArray(rect)) {
            // 情况3：区域查询
            if (rect.length !== 4) throw new Error("区域参数需为[x,y,ex,ey]");
            
            // 添加全局对象（始终包含）
            this.globalObjects.forEach(obj => result.add(obj));
            
            // 区域查询处理
            const [x, y, ex, ey] = rect;
            const width = ex - x;
            const height = ey - y;
            
            this._queryArea(x, y, width, height, layout, result);
        }
        
        // 记录性能数据
        this.stats.totalQueries++;
        this.stats.lastQueryTime = performance.now() - startTime;
        
        return result;
    }
    
    /**
     * 清空所有对象
     */
    clearAll() {
        this.globalObjects.clear();
        this.layoutObjects.clear();
        this.gridMap.clear();
    }
    
    /**
     * 更新网格系统参数
     * @param {number} newSize - 新网格尺寸
     * @param {boolean} [keepObjects=true] - 是否保留对象
     */
    updateGridSize(newSize, keepObjects = true) {
        if (newSize <= 0) throw new Error("网格尺寸必须 >0");
        
        const prevGrid = {
            size: this.gridSize,
            objects: this._getAllObjects()
        };
        
        this.gridSize = newSize;
        this.gridMap.clear();
        
        // 重建空间索引
        if (keepObjects) {
            this.layoutObjects.forEach((set, layout) => {
                this.gridMap.set(layout, new Map());
                set.forEach(obj => this._addToSpatialIndex(obj, layout));
            });
        }
        
        return prevGrid;
    }
    
    /**
     * 多属性排序
     * @param {Set|Array} objects - 对象集合
     * @param {string} [order='asc'] - 排序方向
     * @returns {Array} 排序后的数组
     */
    sort(objects, order = 'asc') {
        const arr = Array.isArray(objects) ? objects : [...objects];
        const dir = order === 'asc' ? 1 : -1;
        
        return arr.sort((a, b) => {
            // 层级优先
            if (a.layout !== b.layout) {
                return dir * (a.layout - b.layout);
            }
            
            // Y轴次之
            if (a.y !== b.y) {
                return dir * (a.y - b.y);
            }
            
            // X轴最后
            return dir * (a.x - b.x);
        });
    }
    
    /* 内部方法 */
    
    /** 空间索引: 添加对象到网格 */
    _addToSpatialIndex(obj, layout) {
        const cells = this._getObjectCells(obj);
        const layoutGrid = this.gridMap.get(layout);
        
        cells.forEach(cell => {
            if (!layoutGrid.has(cell)) {
                layoutGrid.set(cell, new Set());
            }
            layoutGrid.get(cell).add(obj);
        });
    }
    
    /** 空间索引: 从网格移除对象 */
    _removeFromSpatialIndex(obj, layout) {
        const cells = this._getObjectCells(obj);
        const layoutGrid = this.gridMap.get(layout);
        
        cells.forEach(cell => {
            if (layoutGrid.has(cell)) {
                const cellSet = layoutGrid.get(cell);
                cellSet.delete(obj);
                
                // 清理空单元格
                if (cellSet.size === 0) {
                    layoutGrid.delete(cell);
                }
            }
        });
    }
    
    /** 计算对象覆盖的网格 */
    _getObjectCells(obj) {
        const cells = new Set();
        const x = obj.x;
        const y = obj.y;
        const w = obj.width || 1;
        const h = obj.height || 1;
        
        const startX = Math.floor(x / this.gridSize);
        const endX = Math.floor((x + w) / this.gridSize);
        const startY = Math.floor(y / this.gridSize);
        const endY = Math.floor((y + h) / this.gridSize);
        
        for (let cx = startX; cx <= endX; cx++) {
            for (let cy = startY; cy <= endY; cy++) {
                cells.add(`${cx},${cy}`);
            }
        }
        
        return cells;
    }
    
    /** 区域查询核心 */
    _queryArea(x, y, width, height, layout, resultSet) {
        const startX = Math.floor(x / this.gridSize);
        const endX = Math.floor((x + width) / this.gridSize);
        const startY = Math.floor(y / this.gridSize);
        const endY = Math.floor((y + height) / this.gridSize);
        
        // 确定查询的层级
        const layouts = layout !== undefined 
            ? [layout] 
            : [...this.layoutObjects.keys()];
        
        for (const currentLayout of layouts) {
            const layoutGrid = this.gridMap.get(currentLayout);
            if (!layoutGrid) continue;
            
            for (let cx = startX; cx <= endX; cx++) {
                for (let cy = startY; cy <= endY; cy++) {
                    const cellKey = `${cx},${cy}`;
                    if (layoutGrid.has(cellKey)) {
                        layoutGrid.get(cellKey).forEach(obj => {
                            // 精确边界检查（可选）
                            if (this._isInRect(obj, x, y, width, height)) {
                                resultSet.add(obj);
                            }
                        });
                    }
                }
            }
        }
    }
    
    /** 精确边界检查 */
    _isInRect(obj, x, y, width, height) {
        const objEx = obj.x + (obj.width || 1);
        const objEy = obj.y + (obj.height || 1);
        return obj.x < x + width &&
               objEx > x &&
               obj.y < y + height &&
               objEy > y;
    }
    
    /** 获取所有对象 */
    _getAllObjects() {
        const all = new Set(this.globalObjects);
        this.layoutObjects.forEach(set => {
            set.forEach(obj => all.add(obj));
        });
        return all;
    }
    
    /** 按层级获取对象 */
    _getByLayout(layout) {
        const result = new Set(this.globalObjects);
        if (this.layoutObjects.has(layout)) {
            this.layoutObjects.get(layout).forEach(obj => result.add(obj));
        }
        return result;
    }
    
    /* 辅助方法 */
    
    /**
     * 获取系统统计信息
     * @returns {Object} 性能数据
     */
    getStats() {
        let totalObjects = this.globalObjects.size;
        let gridCells = 0;
        
        this.layoutObjects.forEach((set, layout) => {
            totalObjects += set.size;
            if (this.gridMap.has(layout)) {
                gridCells += this.gridMap.get(layout).size;
            }
        });
        
        return {
            gridSize: this.gridSize,
            totalObjects,
            globalObjects: this.globalObjects.size,
            usedLayouts: this.layoutObjects.size,
            gridCells,
            lastQueryTime: this.stats.lastQueryTime.toFixed(2) + 'ms',
            queryCount: this.stats.totalQueries
        };
    }
    
    /**
     * 优化存储（合并空单元格）
     * @param {number} [minEmpty=10] - 触发优化的最小空单元数
     */
    compact(minEmpty = 10) {
        let emptyCount = 0;
        
        this.gridMap.forEach((layoutGrid, layout) => {
            layoutGrid.forEach((cellSet, cellKey) => {
                if (cellSet.size === 0) {
                    layoutGrid.delete(cellKey);
                    emptyCount++;
                }
            });
        });
        
        return emptyCount >= minEmpty;
    }
}