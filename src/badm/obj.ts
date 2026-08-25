/**
 * Obj - 基础对象类，管理 Sprite3D 根节点的位置、旋转、缩放属性
 * 定义换装配置接口 dressCfg（mesh/材质/贴图/动画片段），是 Ball 和 Cha 的基类
 */
// Obj.ts
import { Res } from "../libs/res";
import { Ani } from "./ani";

/** 换装配置接口：meshs 值为数组，第 0 位为 mesh 路径，第 1..N 位为通道 0..N-1 的材质路径 */
export interface dressCfg {
    /** 各部位 mesh 与材质路径映射 */
    meshs: Record<string, string[]>;
    /** 材质名到材质路径的映射 */
    mats?: Record<string, string>;
    /** 材质路径到贴图路径的映射 */
    textures?: Record<string, string>;
    /** 动画状态名到动画片段路径的映射 */
    clips?: Record<string, string>;
}

export class Obj {
    /** 3D 根节点 */
    public root: Laya.Sprite3D;
    /** 换装配置 */
    public cfg: dressCfg;

    /** 构造函数，绑定根节点 */
    constructor(root: Laya.Sprite3D) {
        this.root = root;
    }

    /** 获取根节点 */
    get node(): Laya.Sprite3D {
        return this.root;
    }

    // ---------- 位置属性 ----------
    // 【核心修复】Laya 中直接修改 position 的分量无效，必须重新赋值整个 Vector3
    /** X 坐标 */
    get x(): number {
        return this.root.transform.position.x;
    }
    set x(v: number) {
        const p = this.root.transform.position;
        p.x = v;
        this.root.transform.position = p;
    }

    /** Y 坐标 */
    get y(): number {
        return this.root.transform.position.y;
    }
    set y(v: number) {
        const p = this.root.transform.position;
        p.y = v;
        this.root.transform.position = p;
    }

    /** Z 坐标 */
    get z(): number {
        return this.root.transform.position.z;
    }
    set z(v: number) {
        const p = this.root.transform.position;
        p.z = v;
        this.root.transform.position = p;
    }

    /** 位置向量 */
    get pos(): Laya.Vector3 {
        return this.root.transform.position;
    }
    set pos(v: Laya.Vector3) {
        this.root.transform.position = v;
    }

    /** 旋转四元数 */
    get rot(): Laya.Quaternion {
        return this.root.transform.rotation;
    }
    set rot(v: Laya.Quaternion) {
        this.root.transform.rotation = v;
    }

    // ---------- 装扮 ----------
    /**
     * 应用换装配置：加载 mesh、材质、贴图，绑定骨骼蒙皮，加载动画片段
     * @param cfg 换装配置
     */
    setDress(cfg: dressCfg): void {
        this.cfg = cfg;
        Res.init();

        const rootBone = this._findBone("Hips");
        const bones = rootBone ? this._collectBones(rootBone) : [];
        if (!rootBone) console.warn('[Obj] 未找到根骨骼 Hips，蒙皮将无法绑定');

        for (const partName in cfg.meshs) {
            const arr = cfg.meshs[partName];
            if (!arr || arr.length === 0) continue;

            const meshPath = arr[0];
            const matPaths = arr.slice(1);

            let child = this.root.getChildByName(partName) as Laya.MeshSprite3D;
            if (!child) {
                child = new Laya.MeshSprite3D();
                child.name = partName;
                this.root.addChild(child);
            }

            let meshRenderer = child.getComponent(Laya.MeshRenderer);
            if (!meshRenderer) {
                const defaultMr = child.getComponent(Laya.MeshRenderer);
                if (defaultMr) defaultMr.destroy();
                meshRenderer = child.addComponent(Laya.SkinnedMeshRenderer) as Laya.SkinnedMeshRenderer;
            }

            const meshFilter = child.getComponent(Laya.MeshFilter);
            if (!meshFilter) continue;

            Res.get(meshPath, (mesh: Laya.Mesh) => {
                // console.log(partName, meshPath, mesh);
                meshFilter.sharedMesh = mesh;
                if (!meshRenderer) return;

                for (let i = 0; i < matPaths.length; i++) {
                    const matPath = matPaths[i];
                    if (!matPath) continue;
                    Res.get(matPath, (ma: Laya.Material) => {
                        if (!ma) return;
                        const mats = meshRenderer.materials.slice();
                        while (mats.length <= i) mats.push(null as any);
                        mats[i] = ma;
                        meshRenderer.materials = mats;
                    });
                }

                for (let index = 0; index < meshRenderer.materials.length; index++) {
                    const matName = meshRenderer.materials[index]?.name?.replace("(Instance)", "");
                    const matPath = cfg.mats?.[`${partName}${index}`];

                    if (matPath) {
                        Res.get(matPath, (ma: Laya.PBRMaterial) => {
                            const texPath = cfg.textures?.[matPath];
                            if (texPath) {
                                Res.get(texPath, (tex) => {
                                    if (tex) ma.albedoTexture = tex;
                                    meshRenderer.materials[index] = ma;
                                });
                            } else {
                                meshRenderer.materials[index] = ma;
                            }
                        });
                    } else {
                        const texPath = cfg.textures?.[matName];
                        if (texPath) {
                            Res.get(texPath, (tex) => {
                                if (tex) {
                                    (meshRenderer.materials[index] as Laya.PBRMaterial).albedoTexture = tex;
                                }
                            });
                        }
                    }
                }
            });
        }

        if (cfg.clips) {
            const animator = this.root.getComponent(Laya.Animator);
            if (!animator) {
                console.warn('[Obj] 未找到 Animator，跳过 clips 加载');
            } else {
                const layer = animator.getControllerLayer(0);
                if (!layer) {
                    console.warn('[Obj] 未找到动画层，跳过 clips 加载');
                } else {
                    for (const rawName in cfg.clips) {
                        const isNonLoop = rawName.startsWith('@');
                        const stateName = isNonLoop ? rawName.slice(1) : rawName;
                        const clipPath = cfg.clips[rawName];
                        Res.get(clipPath, (clip: Laya.AnimationClip) => {
                            if (!clip) {
                                console.warn(`[Obj] 动画片段加载失败: ${clipPath}`);
                                return;
                            }
                            if (isNonLoop) {
                                clip.islooping = false;
                            }else{
                                clip.islooping = true;
                            }
                            let state = layer.getAnimatorState(stateName);
                            if (state) {
                                state.clip = clip;
                            } else {
                                state = new Laya.AnimatorState();
                                state.name = stateName;
                                state.clip = clip;
                                layer.addState(state);
                            }
                            // console.log(`[Obj] 动画片段已应用: ${stateName} -> ${clipPath}`);
                        });
                    }
                }
            }
        }
    }

    /** 获取当前换装配置 */
    getDress(): dressCfg {
        return this.cfg;
    }

    /** 递归查找指定名称的骨骼节点 */
    private _findBone(name: string): Laya.Sprite3D | null {
        const find = (node: Laya.Node): Laya.Sprite3D | null => {
            if (node.name === name && node instanceof Laya.Sprite3D) return node;
            for (let i = 0; i < node.numChildren; i++) {
                const found = find(node.getChildAt(i));
                if (found) return found;
            }
            return null;
        };
        return find(this.root);
    }

    /** 递归收集根骨骼及其所有子骨骼节点 */
    private _collectBones(rootBone: Laya.Sprite3D): Laya.Sprite3D[] {
        const bones: Laya.Sprite3D[] = [];
        const collect = (node: Laya.Sprite3D) => {
            bones.push(node);
            for (let i = 0; i < node.numChildren; i++) {
                const child = node.getChildAt(i);
                if (child instanceof Laya.Sprite3D) collect(child);
            }
        };
        collect(rootBone);
        return bones;
    }

    /** 销毁根节点 */
    destroy(): void {
        this.root.destroy();
    }
}
