// Obj.ts
import { Res } from "../libs/res";

/** 单个部位的配置（与原来一致） */
export interface dressCfg {
    meshs: Record<string, string>;
    mats?: Record<string, string>;
    textures?: Record<string, string>;
}

export class Obj {
    public root: Laya.Sprite3D;
    public cfg: dressCfg;

    // 位置内部存储，直接映射到节点 Transform
    constructor(root: Laya.Sprite3D) {
        this.root = root;
    }

    // ---------- 节点访问 ----------
    get node(): Laya.Sprite3D {
        return this.root;
    }

    // ---------- 位置属性 ----------
    get x(): number {
        return this.root.transform.position.x;
    }
    set x(v: number) {
        this.root.transform.position.x = v;
    }

    get y(): number {
        return this.root.transform.position.y;
    }
    set y(v: number) {
        this.root.transform.position.y = v;
    }

    get z(): number {
        return this.root.transform.position.z;
    }
    set z(v: number) {
        this.root.transform.position.z = v;
    }

    get pos(): Laya.Vector3 {
        return this.root.transform.position;
    }

    set pos(v: Laya.Vector3) {
        this.root.transform.position = v;
    }

    get rot(): Laya.Quaternion {
        return this.root.transform.rotation;
    }
    set rot(v: Laya.Quaternion) {
        this.root.transform.rotation =  v;
    }

    // ---------- 装扮 ----------
    setDress(cfg: dressCfg): void {
        this.cfg = cfg;
        Res.init();

        for (let child of this.root.children) {
            const meshFilter = child.getComponent(Laya.MeshFilter);
            if (!meshFilter) continue;

            const meshPath = cfg.meshs[child.name];
            if (!meshPath) continue;

            Res.get(meshPath, (mesh) => {
                meshFilter.sharedMesh = mesh;
                const meshRenderer = child.getComponent(Laya.MeshRenderer);
                if (!meshRenderer) return;

                for (let index = 0; index < meshRenderer.materials.length; index++) {
                    const matName = meshRenderer.materials[index].name.replace("(Instance)", "");
                    const matPath = cfg.mats?.[`${child.name}${index}`];

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
    }

    getDress(): dressCfg {
        return this.cfg;
    }

    // ---------- 销毁 ----------
    destroy(): void {
        this.root.destroy();
    }
}