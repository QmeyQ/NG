import { Cha } from "./cha";
import { Ball } from "./ball";

export interface Collider {
    type: 'cha' | 'ball' | 'net';
    obj: any;
    x: number;
    z: number;
    radius: number;
}

export class CollisionManager {
    private static _instance: CollisionManager;
    private colliders: Collider[] = [];
    private netConfig: { cx: number, cz: number, hw: number, hd: number } | null = null;

    public static get instance(): CollisionManager {
        if (!this._instance) this._instance = new CollisionManager();
        return this._instance;
    }

    public registerCha(cha: Cha, radius: number = 0.5): void {
        this.colliders.push({ type: 'cha', obj: cha, x: cha.x, z: cha.z, radius });
    }

    public registerBall(ball: Ball, radius: number = 0.1): void {
        this.colliders.push({ type: 'ball', obj: ball, x: ball.x, z: ball.z, radius });
    }

    public setNet(cx: number, cz: number, hw: number, hd: number): void {
        this.netConfig = { cx, cz, hw, hd };
    }

    public updateChaPos(cha: Cha, newX: number, newZ: number): { x: number, z: number } {
        let finalX = newX;
        let finalZ = newZ;

        const myCol = this.colliders.find(c => c.obj === cha);
        if (!myCol) return { x: finalX, z: finalZ };

        // 防穿透：与其他角色
        for (const other of this.colliders) {
            if (other.type === 'cha' && other.obj !== cha) {
                const dx = finalX - other.obj.x;
                const dz = finalZ - other.obj.z;
                const distSq = dx * dx + dz * dz;
                const minDist = myCol.radius + other.radius;
                if (distSq < minDist * minDist && distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    const overlap = minDist - dist;
                    finalX += (dx / dist) * overlap;
                    finalZ += (dz / dist) * overlap;
                    
                    // 触发碰撞事件
                    this._dispatchCollision(cha, other.obj);
                }
            }
        }

        // 防穿透：网
        if (this.netConfig) {
            const net = this.netConfig;
            // 简单 AABB 碰撞
            const minX = net.cx - net.hw - myCol.radius;
            const maxX = net.cx + net.hw + myCol.radius;
            const minZ = net.cz - net.hd - myCol.radius;
            const maxZ = net.cz + net.hd + myCol.radius;

            if (finalX > minX && finalX < maxX && finalZ > minZ && finalZ < maxZ) {
                // 找出最近的推出版方向
                const d1 = finalX - minX;
                const d2 = maxX - finalX;
                const d3 = finalZ - minZ;
                const d4 = maxZ - finalZ;
                const minD = Math.min(d1, d2, d3, d4);
                
                if (minD === d1) finalX = minX;
                else if (minD === d2) finalX = maxX;
                else if (minD === d3) finalZ = minZ;
                else if (minD === d4) finalZ = maxZ;

                this._dispatchCollision(cha, 'net');
            }
        }

        // 更新碰撞体位置
        myCol.x = finalX;
        myCol.z = finalZ;
        return { x: finalX, z: finalZ };
    }

    public checkBallCollisions(): void {
        const ballCol = this.colliders.find(c => c.type === 'ball');
        if (!ballCol) return;
        const ball = ballCol.obj as Ball;

        for (const other of this.colliders) {
            if (other.type === 'cha') {
                const cha = other.obj as Cha;
                const dx = ball.x - cha.x;
                const dz = ball.z - cha.z;
                const dy = ball.y - cha.y;
                const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                if (dist < ballCol.radius + other.radius + 1.0) { // 稍微扩大判定范围，因为高度问题
                    this._dispatchCollision(cha, ball);
                }
            }
        }
    }

    private _dispatchCollision(objA: any, objB: any): void {
        // 可以将事件派发到全局或具体对象
        if (objA.onCollision) objA.onCollision(objB);
        if (objB.onCollision) objB.onCollision(objA);
    }
}
