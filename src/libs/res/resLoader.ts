import { mkBlob, blobAb, ab2str, wxEnv } from "../wx"

// ==================== UI 组件库 prefab 桥 ====================
/**
 * 场景 `_$prefab` 引用的引擎内置组件库(internal/UI)在 .br 包通道下的运行时桥。
 * 引擎链: 依赖收集 uuid → res://uuid → URL.formatURL 查 uuidMap(空) → 加载失败 → 节点整棵丢失。
 * 桥做法: formatURL hook 把 res://uuid 映射到预载 blobURL(prefab 文本已灌引擎缓存 loadedMap);
 * 组件库散图经 _uiFrames 图集帧表贴回(_ensureUiFrames);
 * 场景 create 后 _applyNodeTextures 遍历树从 _uiFrames(comp.atlas+comp.png 构造)贴回。
 */
const UI_PREFABS: Record<string, string> = {
    'b0c7f4b6-9a33-4cd8-897e-4888efe760fe': 'internal/UI/Button.lh',
    'c008a142-015d-42f3-abf0-bca3b44b3c12': 'internal/UI/CheckBox.lh'
};
const UI_ATLAS_PNG = 'internal/UI/comp.png';
const UI_ATLAS_JSON = 'internal/UI/comp.atlas';
/** 图集帧表键前缀(对外统一键形态: 第一段=包名, 与场景 src 引用一致) */
const UI_ATLAS_PREFIX = 'ui/internal/UI/';
/** 组件库散图帧表('ui/internal/UI/images/xxx.png' → SubTexture, 键形态统一第一段=包名) */
let _uiFrames: Record<string, any> = {};

export class ResLoader {
    constructor(private readonly source: {
        get(path: string): Promise<any>;
        loadFile(packName: string, filePath: string, type: 'blob' | 'auto', callback: (obj: any) => void): void;
        hasPack(packName: string): boolean;
    }) {}

    // ==================== 扩展名 -> 引擎对象 ====================
    /**
     * 引擎加载统一通道: 微信端先把数据预注 Laya.loader.preLoadedMap 再 load。
     * laya.adapter-weixin 的 fetch 分流对非 http(s) URL 一律走 fs.readFile,
     * blobwx:// 必报 readFile:fail —— preLoadedMap 命中时引擎 download 直取
     * 数据不走文件通道(web 端 blob: URL 原生 XHR 可加载, 不注入)。
     * @param req string url 或 {url, type} 对象(图片用对象形态)
     * @param type Loader 类型常量(对象形态时传 undefined)
     * @param data 预注数据: 文本类塞 string / 二进制塞 ArrayBuffer
     */
    private _engineLoad(req: any, type: any, data: string | ArrayBuffer): Promise<any> {
        if (wxEnv) {
            // ★ preLoadedMap 是 Loader 类的 static 属性, 实例(Laya.loader)上取是 undefined —— 必须从类取
            const preMap: any = (Laya as any).Loader?.preLoadedMap || (Laya.loader as any)?.constructor?.preLoadedMap;
            const url: string = typeof req === 'string' ? req : req.url;
            if (preMap) {
                // json 类 contentType 的 XHR 产物是已 parse 的对象, 预注数据对齐此形态(失败保留原文)
                let d: any = data;
                if (typeof data === 'string') {
                    try { d = JSON.parse(data); } catch { }
                }
                preMap[url] = d;
                let fmt = '';
                try { fmt = Laya.URL.formatURL(url); preMap[fmt] = d; } catch { }
                console.log(`[Res][diag] 预注 preLoadedMap: url=${url} fmt=${fmt || 'ERR'} keys=${Object.keys(preMap).length}`);
            } else {
                console.warn('[Res] preLoadedMap 不可达, 微信端 blobwx:// 加载将走文件通道');
            }
        }
        return Laya.loader.load(req, type) as any;
    }

    /** 微信端写 USER_DATA_PATH 临时文件返回路径(音频 src 等只认本地路径的场景); 失败返回 null
     *  文件名由 id 派生(djb2): 同一资源重载覆盖复用, 不再随机名累积 */
    private _writeTempFile(ab: ArrayBuffer, ext: string, id: string): string | null {
        try {
            const w: any = (globalThis as any).wx;
            const fs = w?.getFileSystemManager?.();
            if (!fs) return null;
            let h = 5381;
            for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) >>> 0;
            const p = w.env.USER_DATA_PATH + '/resr_' + h.toString(16) + '.' + ext;
            fs.writeFileSync(p, ab);
            return p;
        } catch (e) {
            console.error('[Res] 临时文件写入失败', e);
            return null;
        }
    }

    private _wxImgPatched = false;

    /**
     * 微信 devtools 下 weapp-adapter 遇全局原生属性(configurable:false)会跳过注入,
     * window.Image 可能是 devtools 原生构造器而非 adapter 包装 → 引擎 new window.Image
     * 加载 wxfile:// 报 Illegal invocation。此 patch 拦截 downloader.image 的 wxfile://
     * 前缀直接 wx.createImage() 原生加载(真机/devtools 均支持本地路径), 其余转发原方法。
     */
    private _ensureWxImagePatch(): void {
        if (this._wxImgPatched || !wxEnv) return;
        const dl: any = (Laya as any).Loader?.downloader;
        if (!dl || typeof dl.image !== 'function') return;
        this._wxImgPatched = true;
        const orig = dl.image;
        const w: any = (globalThis as any).wx;
        dl.image = function (e: any, s: any, i: any, r: any, a: any) {
            if (typeof s === 'string' && s.indexOf('wxfile://') === 0 && w?.createImage) {
                try {
                    const img = w.createImage();
                    e.$ref = img;
                    img.onload = () => { img.onload = null; img.onerror = null; a(img); };
                    img.onerror = () => { img.onload = null; img.onerror = null; console.warn('[Res] wxfile image 加载失败:', s); a(null, ''); };
                    img.src = s;
                } catch (err) { a(null, err); }
                return;
            }
            return orig.call(dl, e, s, i, r, a);
        };
        const d = Object.getOwnPropertyDescriptor(globalThis, 'Image');
        console.log(`[Res] wxfile image patch 就绪, window.Image=${String((globalThis as any).Image).slice(0, 60)} configurable=${d ? d.configurable : 'N/A'}`);
    }

    parseBlobToEngineObject(packName: string, filePath: string, blob: Blob, callback: (obj: any) => void): void {
        const dotIdx = filePath.lastIndexOf('.');
        const ext = dotIdx >= 0 ? filePath.substring(dotIdx + 1).toLowerCase() : '';
        const url = URL.createObjectURL(blob);

        const finish = (obj: any) => {
            if (url !== obj) URL.revokeObjectURL(url);
            callback(obj);
        };

        if (ext === 'mp3' || ext === 'wav' || ext === 'ogg' || ext === 'm4a' || ext === 'aac') {
            // 微信: 引擎 sound / InnerAudioContext 均不认 blobwx:// → 落盘返回本地路径
            if (wxEnv) {
                blobAb(blob).then((ab) => finish(this._writeTempFile(ab, ext, packName + '@' + filePath))).catch(() => finish(null));
            } else {
                finish(url);
            }
            return;
        }

        if (ext === 'lh' || ext == 'ls') {
            this._loadHierarchy(blob, url, packName, filePath, finish);
            return;
        }

        if (ext === 'controller') {
            blobAb(blob)
                .then(ab => this._buildController(packName, filePath, ab2str(ab)))
                .then(finish)
                .catch(error => { console.error('[Res] controller 构造失败: ' + filePath, error); finish(null); });
            return;
        }

        if (ext === 'lmat') {
            blobAb(blob).then((ab) => this._buildMaterial(packName, filePath, ab2str(ab))
                .then((mat) => finish(mat))
                .catch(() => { console.error('[Res] 材质构造失败: ' + filePath); finish(null); }));
            return;
        }

        let engineType: any = null;
        let kind = '';
        if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp' || ext === 'bmp') { engineType = Laya.Loader.IMAGE; kind = '纹理'; }
        else if (ext === 'lm') { engineType = Laya.Loader.MESH; kind = '网格'; }
        else if (ext === 'lani') { engineType = Laya.Loader.ANIMATIONCLIP; kind = '动画片段'; }

        if (engineType == null) {
            console.log(`[Res] 未知类型，返回 Blob: ${filePath}`);
            finish(blob);
            return;
        }

        if (engineType === Laya.Loader.IMAGE) {
            if (wxEnv) {
                this._ensureWxImagePatch();
                // 微信: preLoadedMap 图片通道终会走 imageWithBlob→createObjectURL→blobwx:// →
                // 引擎 Y.window.Image 是 adapter 的 Image 类(不受 polyfill globalThis.Image 覆盖影响)
                // → wx.createImage 把 blobwx:// 当网络 URL 下载, downloadFile:ok 但解码失败。
                // 正解: 落盘 USER_DATA_PATH 用本地路径直载(wx.createImage 原生支持)
                blobAb(blob).then((ab) => {
                    const p = this._writeTempFile(ab, ext, packName + '@' + filePath);
                    if (!p) { console.error(`[Res] 纹理落盘失败: ${filePath}`); finish(null); return; }
                    Laya.loader.load({ url: p, type: Laya.Loader.IMAGE })
                        .then((tex: any) => finish(tex))
                        .catch((e: any) => { console.error(`[Res] 纹理加载失败: ${filePath}`, e); finish(null); });
                }).catch(() => { console.error(`[Res] 纹理数据提取失败: ${filePath}`); finish(null); });
            } else {
                Laya.loader.load({ url, type: Laya.Loader.IMAGE })
                    .then((tex: any) => finish(tex))
                    .catch((e: any) => { console.error(`[Res] 纹理加载失败: ${filePath}`, e); finish(null); });
            }
            return;
        }

        blobAb(blob).then((ab) => {
            // lm/lani 是二进制必须塞 ArrayBuffer
            // (lani 走 ab2str 会被微信 TextDecoder 在 \u0000 处截断成 1 字符, 引擎 Byte 读 magic 越界)
            const data = ab;
            this._engineLoad(url, engineType, data)
                .then((res: any) => finish(res))
                .catch((e: any) => {
                    console.error(`[Res] ${kind}加载失败: ${filePath}`, e);
                    finish(null);
                });
        }).catch(() => {
            console.error(`[Res] ${kind}数据提取失败: ${filePath}`);
            finish(null);
        });
    }

    /** 路径归一化: 消解 ./ 与 ../ 段(court/ + ../net.png → net.png) */
    private _normPath(p: string): string {
        const parts = p.split('/');
        const out: string[] = [];
        for (const s of parts) {
            if (!s || s === '.') continue;
            if (s === '..') out.pop();
            else out.push(s);
        }
        return out.join('/');
    }

    private async _buildController(packName: string, filePath: string, text: string): Promise<Laya.AnimatorController> {
        // 原生解析必须先于 clip 替换，否则引擎会把没有 _$uuid 的状态删除。
        const controller = new Laya.AnimatorController(JSON.parse(text));
        const dir = filePath.substring(0, filePath.lastIndexOf('/') + 1);
        const clips = new Map<string, Promise<Laya.AnimationClip>>();
        const jobs: Promise<void>[] = [];
        const loadStates = (states: Laya.TypeAnimatorState[]): void => {
            for (const state of states) {
                if (state.clip?._$uuid) {
                    const key = this._relKey(packName, dir, state.clip._$uuid);
                    let job = clips.get(key);
                    if (!job) {
                        job = this.source.get(key).then(clip => {
                            if (!(clip instanceof Laya.AnimationClip)) throw new Error('controller clip 无效: ' + key);
                            return clip;
                        });
                        clips.set(key, job);
                    }
                    jobs.push(job.then(clip => { (state as any).clip = clip; }));
                }
                if (state.states) loadStates(state.states);
            }
        };
        try {
            const layers = controller.data.controllerLayers;
            if (!layers?.length) throw new Error('controller 没有有效状态层: ' + filePath);
            for (const layer of layers) loadStates(layer.states);
            await Promise.all(jobs);
            controller.addDeps(await Promise.all(clips.values()));
            return controller;
        } catch (error) {
            controller.destroy();
            throw error;
        }
    }

    private async _buildMaterial(packName: string, filePath: string, text: string): Promise<any> {
        let j: any;
        try { j = JSON.parse(text); } catch (e) { throw new Error('lmat JSON 解析失败: ' + filePath); }
        const props = j.props || {};
        // 构造(对齐引擎 parseLegacy 的 getClass 反射): type="Laya.PBRStandardMaterial" →
        // ClassUtils 查(带/不带 Laya. 前缀双形态); 查不到 fallback PBRStandardMaterial
        const typeStr: string = props.type || 'Laya.PBRStandardMaterial';
        let mat: any;
        try {
            // 天空系 type 短名别名(引擎 lmat type 值无 Material 后缀, ClassUtils 注册名对不上):
            // SkyPanoramic → SkyPanoramicMaterial / SkyBox → SkyBoxMaterial
            const ALIAS: Record<string, string> = {
                'SkyPanoramic': 'SkyPanoramicMaterial',
                'SkyBox': 'SkyBoxMaterial',
            };
            const cu = (Laya as any).ClassUtils;
            let cls = cu && typeof cu.getClass === 'function' ? cu.getClass(typeStr) : null;
            if (!cls && typeStr.startsWith('Laya.')) cls = cu ? cu.getClass(typeStr.substring(5)) : null;
            if (!cls && ALIAS[typeStr]) {
                const alias = ALIAS[typeStr];
                cls = (Laya as any)[alias] || (cu ? cu.getClass(alias) : null);
            }
            mat = cls ? new cls() : new Laya.PBRStandardMaterial();
        } catch { mat = new Laya.PBRStandardMaterial(); }

        // 天空全景纹理属性名映射: u_Texture → panoramicTexture(SkyPanoramicMaterial 的
        // setter 名不是驼峰 texture——通用 u_ 前缀转换产 texture 挂不上)
        const texNameMap: Record<string, string> = {
            'SkyPanoramic': 'panoramicTexture',
        };
        const mapTexName = (n: string): string => {
            const m = texNameMap[props.type];
            return (m && n === 'u_Texture') ? m : n;
        };

        // 纹理: 相对路径 → 包内提取 → 预载得 Texture2D → 按构造名挂属性
        const texs: any[] = props.textures || [];
        const dir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/') + 1) : '';
        for (const t of texs) {
            if (!t || typeof t.path !== 'string' || !t.path) continue;
            // 纹理创建参数透传(引擎 loader 原生通道): constructParams=[w,h,format,mipmap,canRead,sRGB]
            // —— cp[5]=sRGB 必须透传, albedo(girlcolor cp[5]=true)被当 linear 采样 = 伽马 2.2 颜色偏差
            // ("默认加载颜色差那么大"根因); propertyParams(filterMode/wrapModeU/V/anisoLevel)同链应用
            const texOpts: any = { type: Laya.Loader.TEXTURE2D };
            if (Array.isArray(t.constructParams)) texOpts.constructParams = t.constructParams;
            if (t.propertyParams) texOpts.propertyParams = t.propertyParams;
            let tex: any = null;
            if (t.path.indexOf(':') >= 0 || t.path.startsWith('/')) {
                // 绝对 URL: 直接引擎加载(极少形态)
                tex = await Laya.loader.load({ url: t.path, ...texOpts }).catch((): any => null);
            } else {
                // 统一引用解析(用户规格): 先查是否包名起头 → 跨包直取(如 lmat 引用 ui 包纹理);
                // 否则按 lmat 所在包内目录解析 _normPath(dir+path)——d3/net.lmat 引用 net.png → d3/net.png
                const slash0 = t.path.indexOf('/');
                const hasPack = slash0 > 0 && this.source.hasPack(t.path.substring(0, slash0));
                if (hasPack) {
                    const pk = t.path.substring(0, slash0);
                    const fp = t.path.substring(slash0 + 1);
                    const tb2 = await new Promise<Blob | null>((r) => this.source.loadFile(pk, fp, 'blob', r));
                    if (tb2) {
                        let tex2: any = null;
                        if (wxEnv) {
                            const ab2 = await blobAb(tb2);
                            const fp2 = this._writeTempFile(ab2, this._extOf(fp), pk + '@' + fp);
                            if (fp2) tex2 = await Laya.loader.load({ url: fp2, ...texOpts }).catch((): any => null);
                        } else {
                            const bu2 = URL.createObjectURL(tb2);
                            tex2 = await Laya.loader.load({ url: bu2, ...texOpts }).catch((): any => null);
                        }
                        if (tex2 && t.name) this._setMatTex(mat, mapTexName(t.name), tex2);
                        continue;
                    }
                    console.warn('[Res] 跨包材质纹理缺失: ' + t.path);
                    continue;
                }
                const rel = this._normPath(dir + t.path);
                const tb = await new Promise<Blob | null>((r) => this.source.loadFile(packName, rel, 'blob', r));
                if (!tb) { console.warn('[Res] 材质纹理缺失: ' + packName + '/' + rel); continue; }
                if (wxEnv) {
                    const ab = await blobAb(tb);
                    const fp = this._writeTempFile(ab, this._extOf(rel), packName + '@' + rel);
                    if (!fp) continue;
                    tex = await Laya.loader.load({ url: fp, ...texOpts }).catch((): any => null);
                } else {
                    const bu = URL.createObjectURL(tb);
                    tex = await Laya.loader.load({ url: bu, ...texOpts }).catch((): any => null);
                }
            }
            if (tex && t.name) this._setMatTex(mat, mapTexName(t.name), tex);
        }

        // 颜色向量: albedoColor 等——【对齐引擎 parseLegacy 的类型分派】先读属性当前值,
        // instanceof Color → new Color(r,g,b,a)(Color 通道按 r/g/b/a 读, 传 Vector4(x/y/z/w)
        // 会读 undefined → 纯色材质全黑——net 有纹理走 DIFFUSEMAP 变体幸存的回归根因);
        // 否则 length 3 → Vector3 / length ≥4 → Vector4
        for (const v of (props.vectors || [])) {
            if (!v || !v.name || !Array.isArray(v.value)) continue;
            try {
                const n: any = v.value;
                const cur = (mat as any)[v.name];
                if (n.length === 3) {
                    (mat as any)[v.name] = (cur instanceof Laya.Color)
                        ? new Laya.Color(n[0], n[1], n[2], 1)
                        : new Laya.Vector3(n[0], n[1], n[2]);
                } else if (n.length >= 4) {
                    (mat as any)[v.name] = (cur instanceof Laya.Color)
                        ? new Laya.Color(n[0], n[1], n[2], n[3])
                        : new Laya.Vector4(n[0], n[1], n[2], n[3]);
                } else if (n.length === 2) {
                    (mat as any)[v.name] = new Laya.Vector2(n[0], n[1]);
                }
            } catch { }
        }

        // 浮点标量(tilingOffset 之外的 shininess/albedoIntensity 等, 走同名 setter)
        for (const f of (props.floats || [])) {
            if (f && f.name && typeof f.value === 'number') {
                try { (mat as any)[f.name] = f.value; } catch { }
            }
        }

        // 顶层 u_ 散属性(sky 系 lmat 平铺形态: u_TintColor 数组 / u_Exposure·u_Rotation 标量
        // 直接挂 props 下而非 vectors/floats 数组): u_ 前缀转驼峰属性名走 setter;
        // 数组按属性当前值类型分派 Color/Vector(同 vectors 段规则), number 直赋
        for (const key of Object.keys(props)) {
            if (!key.startsWith('u_') || key.length <= 2) continue;
            const camel = key.charAt(2).toLowerCase() + key.substring(3);
            // SkyPanoramic 的 u_Texture 已由纹理段处理(panoramicTexture 映射), 跳过防覆盖
            if (key === 'u_Texture' && texNameMap[props.type]) continue;
            const val = (props as any)[key];
            if (typeof val === 'number') {
                try { (mat as any)[camel] = val; } catch { }
            } else if (Array.isArray(val) && val.length >= 3) {
                try {
                    const cur = (mat as any)[camel];
                    (mat as any)[camel] = (cur instanceof Laya.Color)
                        ? new Laya.Color(val[0], val[1], val[2], val[3] ?? 1)
                        : (val.length === 3
                            ? new Laya.Vector3(val[0], val[1], val[2])
                            : new Laya.Vector4(val[0], val[1], val[2], val[3]));
                } catch { }
            }
        }

        // 渲染状态(对齐 parseLegacy 的 setter 映射; net 双面/透明等, badm._setNetTransparent 运行时兜底同值幂等)
        try {
            const st: any = mat;
            if (props.s_Cull !== undefined) st.cull = props.s_Cull;
            if (props.s_Blend !== undefined) st.blend = props.s_Blend;
            if (props.s_BlendSrc !== undefined) st.blendSrc = props.s_BlendSrc;
            if (props.s_BlendDst !== undefined) st.blendDst = props.s_BlendDst;
            if (props.s_DepthTest !== undefined) st.depthTest = props.s_DepthTest;
            if (props.s_DepthWrite !== undefined) st.depthWrite = !!props.s_DepthWrite;
            if (props.renderQueue !== undefined) st.renderQueue = props.renderQueue;
            if (props.materialRenderMode !== undefined) st.materialRenderMode = props.materialRenderMode;
            if (props.alphaTest !== undefined) st.alphaTest = props.alphaTest;
        } catch { }

        return mat;
    }

    /**
     * 材质纹理挂载: lmat 的 textures[].name 是 shader uniform 名(u_AlbedoTexture)——
     * 直接 mat[name]=tex 挂的是无人消费的自定义字段(shader uniform 从未上传 = 纹理不显示,
     * girl1 角色纹理全丢根因)。正解: uniform 名转驼峰 JS 属性名(u_AlbedoTexture →
     * albedoTexture)判原型链 setter 存在走 setter(触发引擎隐藏副作用如 addDefine
     * DIFFUSEMAP 变体切换); 无 setter 兜底 shaderData.setTexture(propertyNameToID)。
     */
    private _setMatTex(mat: any, name: string, tex: any): void {
        try {
            const prop = name.startsWith('u_') && name.length > 2
                ? name.charAt(2).toLowerCase() + name.substring(3)
                : name;
            let proto = Object.getPrototypeOf(mat);
            while (proto && proto !== Object.prototype) {
                if (Object.getOwnPropertyDescriptor(proto, prop)?.set) {
                    mat[prop] = tex;
                    return;
                }
                proto = Object.getPrototypeOf(proto);
            }
            const sd = mat.shaderData;
            const sid = (Laya.Shader3D as any).propertyNameToID(name);
            if (sd && sid != null) sd.setTexture(sid, tex);
        } catch { }
    }

    private _extOf(p: string): string {
        const d = p.lastIndexOf('.');
        return d >= 0 ? p.substring(d + 1).toLowerCase() : 'png';
    }

    private _b64u = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

    /** UUID(36位) → base64url 短ID(22位), LayaAir 发布构建同款编码算法, 双向确定可逆(手写base64, 微信无btoa) */
    private _uuidToShort(u: string): string {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u)) return '';
        const hex = u.replace(/-/g, '').toLowerCase();
        const b = new Uint8Array(16);
        for (let i = 0; i < 16; i++) b[i] = parseInt(hex.substr(i * 2, 2), 16);
        let s = '';
        for (let i = 0; i < 15; i += 3)
            s += this._b64u[b[i] >> 2] + this._b64u[((b[i] & 3) << 4) | (b[i + 1] >> 4)] + this._b64u[((b[i + 1] & 15) << 2) | (b[i + 2] >> 6)] + this._b64u[b[i + 2] & 63];
        s += this._b64u[b[15] >> 2] + this._b64u[(b[15] & 3) << 4];
        return s;
    }

    /** base64url 短ID(22位) → UUID(36位), 手写解码(微信无atob) */
    private _shortToUuid(s: string): string {
        if (!/^[A-Za-z0-9_-]{22}$/.test(s)) return '';
        let bits = 0, acc = 0, hex = '';
        for (let i = 0; i < 22; i++) {
            const v = this._b64u.indexOf(s[i]);
            if (v < 0) return '';
            acc = (acc << 6) | v; bits += 6;
            if (bits >= 8) { bits -= 8; const h = ((acc >> bits) & 0xff).toString(16); hex += h.length < 2 ? '0' + h : h; }
        }
        if (hex.length !== 32) return '';
        return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
    }

    /** 组件ID是否已在引擎类注册表(ClassUtils)注册 */
    private _clsReg(id: string): boolean {
        if (!id) return false;
        const cu = (Laya as any).ClassUtils;
        return !!(cu && typeof cu.getClass === 'function' && cu.getClass(id));
    }

    // ============================================================
    // 场景 prefab 引用数据层合并(替代旧 formatURL 桥):
    // 加载前把 " _$prefab" 节点与目标 prefab JSON 合并成完整节点 JSON → 引擎全语义原生 decode
    // (GButton 类型/titleWidget/GearDisplay 状态机/Relation/override 替换位全引擎原生处理)。
    // ============================================================

    /** prefab 文本缓存: "ui/internal/UI/Button.lh" → 文本 */
    private _prefabTxtCache: Map<string, string> = new Map();
    /** 图集帧表懒加载 Promise */
    private _uiFramesP: Promise<void> | null = null;

    /** 组件库图集帧表懒加载(comp.png+comp.atlas → _uiFrames, _applyNodeTextures 贴回用) */
    private _ensureUiFrames(): Promise<void> {
        if (this._uiFramesP) return this._uiFramesP;
        this._uiFramesP = (async (): Promise<void> => {
            const tex: any = await this.source.get('ui/' + UI_ATLAS_PNG).catch((): any => null);
            // comp.atlas 必须走 _loadFile(内存表优先): 存储 v2 散文件不落盘, storage 直读必 miss → 帧表空 → 皮肤帧全断
            const atlasBlob = await new Promise<Blob | null>((res) => {
                this.source.loadFile('ui', UI_ATLAS_JSON, 'blob', (b: Blob | null) => res(b));
            });
            if (!tex || !atlasBlob) {
                console.warn('[Res] 组件库图集缺文件, GButton 默认皮肤帧不可用');
                return;
            }
            try {
                const atlasJson = JSON.parse(ab2str(await blobAb(atlasBlob)));
                tex.scaleRate = parseFloat(atlasJson.meta?.scale || '1');
                for (const frameName in atlasJson.frames) {
                    const fd = atlasJson.frames[frameName];
                    const fr = fd.frame;
                    _uiFrames[UI_ATLAS_PREFIX + frameName] = Laya.Texture.create(tex, fr.x, fr.y, fr.w, fr.h,
                        fd.spriteSourceSize?.x || 0, fd.spriteSourceSize?.y || 0,
                        fd.sourceSize?.w || fr.w, fd.sourceSize?.h || fr.h);
                }
                console.log(`[Res] 组件库帧表就绪: ${Object.keys(_uiFrames).length} 帧`);
            } catch (e) {
                console.error('[Res] 组件库图集解析失败', e);
            }
        })().catch((e: any) => {
            console.error('[Res] 帧表构造失败', e);
            this._uiFramesP = null;
        });
        return this._uiFramesP;
    }

    /** 取包内 prefab 文本(带缓存): ref 归一化为 包名/包内路径 */
    private _prefabTxt(ref: string, packName: string, lhDir: string): Promise<string | null> {
        // 统一引用解析(用户规格): 先查是否包名起头 → 原样; 否则按引用文件(场景)所在包内目录
        // 解析 _normPath(lhDir+ref) → 包名/包内路径(废除旧"无包前缀默认归 ui").
        // uuid → UI_PREFABS 反查(旧包兼容); internal 特判 = 收集统一形态(ui/ 包名起头, 天然走原样分支)
        let path = ref;
        if (UI_PREFABS[ref]) {
            path = 'ui/' + UI_PREFABS[ref];
        } else {
            const slash0 = path.indexOf('/');
            const hasPack = slash0 > 0 && this.source.hasPack(path.substring(0, slash0));
            if (!hasPack && !path.startsWith('../')) {
                // 无斜杠裸文件名或包内相对: 拼引用文件所在目录
                if (path.indexOf(':') < 0 && !path.startsWith('/')) {
                    const inPack = lhDir ? this._normPath(lhDir + path) : path;
                    path = packName + '/' + inPack;
                }
            } else if (path.startsWith('../')) {
                const inPack = this._normPath(lhDir + path);
                // 上溯出包根(如包根文件的 ../xxx): 退回 internal 特判/原样(旧包兼容)
                if (inPack.startsWith('../')) {
                    const i = path.indexOf('internal/');
                    if (i >= 0) path = 'ui/' + path.substring(i);
                } else {
                    path = packName + '/' + inPack;
                }
            }
            // 包名起头(含收集统一的 ui/internal/) → 原样
        }
        const cached = this._prefabTxtCache.get(path);
        if (cached !== undefined) return Promise.resolve(cached);
        const slash = path.indexOf('/');
        const pk = path.substring(0, slash);
        const fp = path.substring(slash + 1);
        return new Promise((resolve) => {
            this.source.loadFile(pk, fp, 'blob', (blob: Blob | null) => {
                if (!blob) { console.warn(`[Res] prefab 引用目标缺失: ${ref} → ${path}`); resolve(null); return; }
                blobAb(blob).then((ab) => {
                    const txt = ab2str(ab);
                    this._prefabTxtCache.set(path, txt);
                    resolve(txt);
                }).catch(() => resolve(null));
            });
        });
    }

    /**
     * 场景数据树展开: " _$prefab" 节点 → 加载目标 prefab JSON → 数据层合并(标量覆盖+override child 属性级合并)
     * → 全树统一 id 重写 + src 数据层剥除(占位符化) → 引擎原生 decode。
     */
    /** prefab 实例序号(每实例唯一 id 前缀, 防同 prefab 多实例的内部 id 冲突) */
    private _prefabSeq = 0;

    private async _expandPrefabs(node: any, packName: string, lhDir: string): Promise<any> {
        if (!node || typeof node !== 'object') return node;

        // 全局映射: 场景 prefab 节点 id → 该实例新根 id。键=场景节点 id 天然唯一, 供场景侧引用
        // (override/append child 的 gears controller ref、relations target)重定向到实例根。
        // 【严禁把 prefab 内部 id 映射混进全局】——同 prefab 多实例内部 id 同组, 全局累积互相覆盖,
        // 多实例的 titleWidget ref 全解析到最后一个实例(文字跑飞/点击串台 v5 根因)。实例内部
        // 引用一律走各实例的局部 idMap(merge 后立刻 localRewrite)。
        const gIdMap: Record<string, string> = {};

        const localRewrite = (n: any, idMap: Record<string, string>): void => {
            if (!n || typeof n !== 'object') return;
            if (n.titleWidget && n.titleWidget['_$ref'] && idMap[n.titleWidget['_$ref']]) {
                n.titleWidget['_$ref'] = idMap[n.titleWidget['_$ref']];
            }
            if (n.iconWidget && n.iconWidget['_$ref'] && idMap[n.iconWidget['_$ref']]) {
                n.iconWidget['_$ref'] = idMap[n.iconWidget['_$ref']];
            }
            for (const g of (n.gears || [])) {
                if (g.controller && g.controller['_$ref'] && idMap[g.controller['_$ref']]) {
                    g.controller['_$ref'] = idMap[g.controller['_$ref']];
                }
            }
            for (const r of (n.relations || [])) {
                if (r.target && r.target['_$ref'] && idMap[r.target['_$ref']]) {
                    r.target['_$ref'] = idMap[r.target['_$ref']];
                }
            }
            for (const c of (n['_$child'] || [])) localRewrite(c, idMap);
        };

        const walkMerge = async (n: any): Promise<any> => {
            if (n && n['_$prefab']) {
                const txt = await this._prefabTxt(String(n['_$prefab']), packName, lhDir);
                if (!txt) return n; // 目标缺失保底原样(引擎空节点)
                let pf: any;
                try { pf = JSON.parse(txt); } catch (e) { console.warn('[Res] prefab JSON 解析失败:', n['_$prefab']); return n; }
                const clone = JSON.parse(JSON.stringify(pf));

                // ★ 唯一 id 命名空间: 同 prefab 多实例的内部 id 必然同组重复——引擎 il.parse 的
                // c[id] 字典是【全局】的, 同 id 后者覆盖前者 → ref 解析到别的实例(点击串台根因)。
                // collect 时直接改 clone 树 id(仅收集映射不改 id 的话, 场景 override 映射成新 id
                // 后 findIndex 按新 id 找替换位必 miss → override 全变追加, 基础皮肤与 override 并存
                // = 矢量背景没画 + 默认皮肤图冒出的双重根因)
                const seq = ++this._prefabSeq;
                const idMap: Record<string, string> = {};
                (function collect(c2: any) {
                    if (c2['_$id']) {
                        const nid = `pf${seq}_${c2['_$id']}`;
                        idMap[c2['_$id']] = nid;
                        c2['_$id'] = nid;
                    }
                    for (const c of (c2['_$child'] || [])) collect(c);
                })(clone);
                // 场景 prefab 节点自身 id → 新根 id(collect 后 clone 根 id 已带 pf 前缀)
                if (n['_$id']) gIdMap[n['_$id']] = clone['_$id'] || n['_$id'];

                // 场景侧 override/parent 引用先映射到新 id(merge 前改, merge 按新 id 找替换位)
                for (const c of (n['_$child'] || [])) {
                    if (c && typeof c['_$override'] === 'string' && idMap[c['_$override']]) {
                        c['_$override'] = idMap[c['_$override']];
                    }
                    if (c && Array.isArray(c['_$parent'])) {
                        c['_$parent'] = c['_$parent'].map((id: any) => idMap[id] || id);
                    }
                }

                const merged = this._mergePrefabData(n, clone);
                // 实例内部 ref 重定向(局部 idMap): clone 树内 titleWidget/gears/relations 还持旧 id
                localRewrite(merged, idMap);
                // 数据层静态折算 W/H 跟随关系(用户方案): 子节点 Relation [1,0,2,0](Width+Height 跟随根,
                // Button/CheckBox 的皮肤与 title 全挂此关系)——引擎原生 prefab 通道由 create 内 size(w,h)
                // 成对 setter→布局联动把子节点拉满; 数据层合并绕过 setter 链, Relation 运行时应用
                // 未验证 → 初值即终值最稳(relations 保留供屏幕适配引擎重算, 折算幂等)
                this._applySizeRelations(merged);
                if (Array.isArray(merged['_$child'])) {
                    merged['_$child'] = await Promise.all(merged['_$child'].map((c2: any) => walkMerge(c2)));
                }
                return merged;
            }
            if (n && Array.isArray(n['_$child'])) {
                n['_$child'] = await Promise.all(n['_$child'].map((c2: any) => walkMerge(c2)));
            }
            return n;
        };

        const out = await walkMerge(node);

        // pass2: 场景侧引用重定向(gIdMap, 键=场景节点 id)。
        // 实例内部 ref 已是 pf 前缀(不匹配场景 id 键)天然不重复映射; 实例内指向场景节点 id 的
        // ref(如场景 append/override child 的 gears controller)在此命中重定向到实例根。
        // 【src 不在此剥】——2D decode 对自定义属性 __res_src_key__ 的保留未验证(v4 曾因此
        // CheckBox 皮肤/贴图全断); src 剥除唯一通道是 _prepareLhData(decode 后直设实例, v3 验证可用)
        (function rewrite(n: any) {
            if (!n || typeof n !== 'object') return;
            if (n.titleWidget && n.titleWidget['_$ref'] && gIdMap[n.titleWidget['_$ref']]) {
                n.titleWidget['_$ref'] = gIdMap[n.titleWidget['_$ref']];
            }
            if (n.iconWidget && n.iconWidget['_$ref'] && gIdMap[n.iconWidget['_$ref']]) {
                n.iconWidget['_$ref'] = gIdMap[n.iconWidget['_$ref']];
            }
            for (const g of (n.gears || [])) {
                if (g.controller && g.controller['_$ref'] && gIdMap[g.controller['_$ref']]) {
                    g.controller['_$ref'] = gIdMap[g.controller['_$ref']];
                }
            }
            for (const r of (n.relations || [])) {
                if (r.target && r.target['_$ref'] && gIdMap[r.target['_$ref']]) {
                    r.target['_$ref'] = gIdMap[r.target['_$ref']];
                }
            }
            if (Array.isArray(n['_$child'])) {
                for (const c of n['_$child']) rewrite(c);
            }
        })(out);

        return out;
    }


    /**
     * 数据层静态折算 W/H 跟随关系(RelationType: Width=1/Height=2):
     * prefab 子节点(皮肤/title)挂 [1,p,2,p] 绑根——引擎原生通道由 create 内 size() setter 联动拉满,
     * 数据层合并绕过 setter 链, 此处直接按根的 width/height 写子节点终值(param 0 等跟随;
     * 非 0 param 语义未逆向, 跳过留给引擎运行时)。relations 保留(屏幕适配重算幂等)。
     */
    private _applySizeRelations(root: any): void {
        const rw = Number(root.width) || 0;
        const rh = Number(root.height) || 0;
        if (!rw && !rh) return;
        const rootId = root['_$id'];
        (function walk(n: any) {
            if (!n || typeof n !== 'object') return;
            for (const r of (n.relations || [])) {
                const ref = r && r.target && r.target['_$ref'];
                if (ref !== rootId || !Array.isArray(r.data)) continue;
                for (let i = 0; i + 1 < r.data.length; i += 2) {
                    const t = r.data[i], p = r.data[i + 1];
                    if (t === 1 && p === 0 && rw) n.width = rw;      // Width 跟随根
                    else if (t === 2 && p === 0 && rh) n.height = rh; // Height 跟随根
                }
            }
            for (const c of (n['_$child'] || [])) walk(c);
        })(root);
    }

    /**
     * 场景节点数据与 prefab 根数据合并(对齐引擎 _$override 语义):
     * - 标量字段: 场景值覆盖(跳过 _$prefab/_$child; _$id 保留 prefab 根的——titleWidget/controllers 的 _$ref 依赖)
     * - child 带 "_$override":"<目标 _$id>" → 属性级合并到 prefab 内同 id 节点(目标为基底, 场景字段覆盖,
     *   保留目标 width/height/gears/relations 等基础配置; 继承目标 _$id);
     *   无 _$override → append(prefab child 尾)
     */
    private _mergePrefabData(scene: any, pf: any): any {
        for (const k in scene) {
            if (k === '_$prefab' || k === '_$child' || k === '_$id' || k === '_$override') continue;
            pf[k] = scene[k];
        }
        const sc = scene['_$child'];
        if (Array.isArray(sc) && sc.length > 0) {
            const pChild: any[] = Array.isArray(pf['_$child']) ? pf['_$child'] : (pf['_$child'] = []);
            for (const c of sc) {
                const ovr = c && c['_$override'];
                if (typeof ovr === 'string') {
                    const idx = pChild.findIndex((t: any) => t && t['_$id'] === ovr);
                    if (idx >= 0) {
                        // 属性级合并(引擎 T+应用语义): prefab 目标节点为基底, 场景 override 字段覆盖其上。
                        // 严禁整体替换——场景 override child 只带少量字段(src/color/background),
                        // 整替会丢目标节点 width/height/gears(GearDisplay)/relations → 皮肤塌零/按钮
                        // 状态机失效/文字样式丢失(menu.ls "button 配置全丢"回归实锤)
                        const base = pChild[idx];
                        const merged = Object.assign({}, base, c);
                        delete merged['_$override'];
                        merged['_$id'] = base['_$id']; // 继承目标 id(prefab 内 _$ref/GearDisplay 引用链)
                        pChild[idx] = merged;
                    } else {
                        const merged = Object.assign({}, c);
                        delete merged['_$override'];
                        pChild.push(merged);
                    }
                } else {
                    pChild.push(c);
                }
            }
        }
        return pf;
    }

    /**
     * 预制体加载(组件ID形态自适应重试):
     * .br 包内场景的组件引用与 bundle 注册形态可能不一致(全UUID vs base64url短ID) → missing component type。
     * 重试链: ①智能改写(_$type 的ID未注册而另一形态已注册→改写为注册形态)加载;
     * ②失败→判定①实际加载文本的主体ID形态(长/短), 把所有组件ID全量翻转为另一形态(长↔短)重载;
     * ③再失败→finish(null)。原始 url 的 revoke 由外层 finish 负责, 改写新URL由本方法自管。
     */
    private _loadHierarchy(blob: Blob, url: string, packName: string, filePath: string, finish: (obj: any) => void): void {
        // lh/ls 包内目录前缀(所有内部引用的相对解析基): d3/court@0.lh → "d3/"
        const lhDir = filePath.includes("/") ? filePath.substring(0, filePath.lastIndexOf("/") + 1) : "";
        const ID_RE = /"_\$type"\s*:\s*"([^"]+)"/g;
        const isLongId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const isShortId = (id: string) => /^[A-Za-z0-9_-]{22}$/.test(id);

        let baseTxt = '';      // 首次加载的文本(智能改写后), 重试的翻转基准
        let triedLong = false; // 上次试错文本的主体组件ID形态(true=长UUID)

        const loadText = (text: string | null, attempt: number) => {
            const u = text == null ? url : URL.createObjectURL(mkBlob([text], 'application/json'));
            // 微信端 text 也预注 preLoadedMap(text==null 首载防御分支无数据可注, blobwx:// 会 readFile fail)
            const p = text == null
                ? Laya.loader.load(u, Laya.Loader.HIERARCHY) as any
                : this._engineLoad(u, Laya.Loader.HIERARCHY, text);
            console.log(`[menu] loadText(attempt=${attempt}, ${text == null ? 'text=null' : 'len=' + text.length}) url=${u}`);
            p
                .then(async (prefab: Laya.PrefabImpl) => {
                    console.log('[menu] HIERARCHY resolve, prefab=', prefab == null ? String(prefab) : (prefab.constructor as any)?.name);
                    this._prepareLhData(prefab);
                    const node = prefab.create() as Laya.Sprite;
                    console.log('[menu] prefab.create →', node ? 'node' : String(node));
                    // lh 包内目录前缀(相对引用解析基): d3/court@0.lh → d3/
                    await this._applyNodeTextures(node, packName, lhDir);
                    await this._applyNode3DRes(node, packName, lhDir);
                    console.log('[menu] 纹理应用完成');
                    if (text != null) URL.revokeObjectURL(u);
                    finish(node);
                })
                .catch((e: any) => {
                    if (text != null) URL.revokeObjectURL(u);
                    if (attempt > 0) {
                        console.error(`[menu] HIERARCHY reject(attempt=${attempt}) url=${u}:`, e);
                        finish(null);
                        return;
                    }
                    console.warn(`[menu] HIERARCHY reject(attempt=0, url=${u}) 上次试错主体形态=${triedLong ? '长ID' : '短ID'}, 全量翻转重试:`, e);
                    let flipped = 0;
                    const out = baseTxt.replace(ID_RE, (full: string, id: string) => {
                        const isL = isLongId(id);
                        if (!isL && !isShortId(id)) return full;
                        const alt = isL ? this._uuidToShort(id) : this._shortToUuid(id);
                        if (!alt) return full;
                        flipped++;
                        return full.replace(id, alt);
                    });
                    if (!flipped) {
                        console.error('[Res] 组件ID无可翻转形态, 放弃重试');
                        finish(null);
                        return;
                    }
                    console.log(`[Res] 预制体重试: ${flipped} 处组件ID翻转为${triedLong ? '短ID' : '长ID'}`);
                    loadText(out, 1);
                });
        };

        blobAb(blob).then((ab) => ab2str(ab)).then(async (txt: string) => {
            txt = this._lhPlaceholders(txt);
            // prefab 引用数据层合并(" _$prefab" 节点 → 目标 prefab JSON 合并, 引擎原生 decode 全语义)
            try {
                const data = await this._expandPrefabs(JSON.parse(txt), packName, lhDir);
                txt = JSON.stringify(data);
            } catch (e) {
                console.warn('[Res] prefab 合并失败, 原样加载:', e);
            }
            let changed = 0;
            const out = txt.replace(ID_RE, (full: string, id: string) => {
                const isL = isLongId(id);
                if (!isL && !isShortId(id)) return full;
                if (this._clsReg(id)) return full;
                const alt = isL ? this._uuidToShort(id) : this._shortToUuid(id);
                if (!alt || !this._clsReg(alt)) return full;
                changed++;
                return full.replace(id, alt);
            });
            let longN = 0, shortN = 0;
            out.replace(ID_RE, (_f: string, id: string) => {
                if (isLongId(id)) longN++;
                else if (isShortId(id)) shortN++;
                return _f;
            });
            baseTxt = out;
            triedLong = longN >= shortN;
            if (changed > 0) console.log(`[Res] 预制体ID兼容: ${changed} 处组件ID改写为注册形态`);
            // 首载即带文本: 微信端需预注数据绕过 fs readFile 分流; changed=0 也传原文(out===改写基准)
            loadText(out, 0);
        }).catch(() => loadText(null, 0));
    }

    /**
     * lh 文本 3D 引用占位符化: "sharedMesh":{"_$uuid":"a/b.lm"} → "__mesh":"a/b.lm";
     * sharedMaterials 数组 → "__mats":[...]. 仅路径形态(含/)转换, 长 UUID 引用(girl 等)保持原样走引擎依赖加载.
     * 占位符是自定义属性: decode 直挂组件实例, 不触发 setter(_addReference 崩)也不进依赖收集, create 后 _applyNode3DRes 补齐.
     */
    private _lhPlaceholders(txt: string): string {
        let n = 0;
        // 路径判据 = 以 .lm/.lmat 结尾(兼容根级无斜杠引用如 d3/court@0.lh 引 net.lmat——旧判据强制含
        // 斜杠致其漏网走引擎 lmat loader, join(blob:base) 产 blob:http://net.lmat 必失败);
        // uuid 形态(c4d8...@lm0/纯 uuid 无扩展名)不吞——留引擎依赖加载失败由 setDress 代码通道接管
        const isResPath = (v: string) => /\.(lm|lmat)$/i.test(v);
        txt = txt.replace(/"sharedMaterials"\s*:\s*\[((?:\s*\{\s*"_\$uuid"\s*:\s*"[^"]*"\s*\}\s*,?)*)\]/g, (full: string, body: string) => {
            const paths: string[] = [];
            let allRes = true;
            body.replace(/"_\$uuid"\s*:\s*"([^"]+)"/g, (_f: string, v: string) => {
                if (isResPath(v)) paths.push(v); else allRes = false;
                return _f;
            });
            if (!paths.length || !allRes) return full; // 混合形态(uuid+路径)不转防位序错位
            n += paths.length;
            return '"__mats":' + JSON.stringify(paths);
        });
        txt = txt.replace(/"sharedMesh"\s*:\s*\{\s*"_\$uuid"\s*:\s*"([^"]*)"\s*\}/g, (full: string, v: string) => {
            if (!isResPath(v)) return full;
            n++;
            return '"__mesh":' + JSON.stringify(v);
        });
        if (n > 0) console.log(`[Res] lh 3D 引用占位符化: ${n} 处`);
        return txt;
    }

    /**
     * lh/ls 内相对引用 → Res 键(用户规格: 根据预制体所在位置解析)。
     * 引用首段已是挂载包名(如 ui/internal/...) → 原样(自带包前缀);
     * 否则(如 court/floor.lm 相对 d3/court@0.lh) → 包名 + lh所在包内目录 + 引用
     * (= nor/d3/court/floor.lm)。根级 lh(court.lh) lhDir='' 时退化为旧形态 nor/court/floor.lm。
     */
    private _relKey(packName: string, lhDir: string, key: string): string {
        const slash = key.indexOf('/');
        if (slash > 0 && this.source.hasPack(key.substring(0, slash))) return key;
        if (key.indexOf('@') >= 0) return key;
        // 相对引用统一走 _normPath 按 lh 所在目录消解: girl/lmat/ 的 lh 引 ../boycolor.png
        // → girl/boycolor.png(裸拼接产出 girl/lmat/../boycolor.png 带相对段, 索引必 miss);
        // 顶层 .. 上溯出包根被 normPath 吞, 退化为包根级(合理降级); lhDir='' 根级退化旧形态
        return packName + '/' + this._normPath(lhDir + key);
    }

    /** 遍历节点树补 3D mesh/材质(占位符 __mesh/__mats → 包内 Res.get 赋回), 全部就绪才 resolve 保证上层时序 */
    private async _applyNode3DRes(node: any, packName: string, lhDir: string = ''): Promise<void> {
        if (!node) return;
        const getComp = (cls: any): any => {
            try { return typeof node.getComponent === 'function' ? node.getComponent(cls) : null; } catch { return null; }
        };
        const mf = getComp(Laya.MeshFilter);
        if (mf && typeof mf.__mesh === 'string') {
            const key = mf.__mesh as string;
            delete mf.__mesh;
            const mesh = await this.source.get(this._relKey(packName, lhDir, key)).catch((): any => null);
            if (mesh) mf.sharedMesh = mesh;
            else console.warn(`[Res] 3D mesh 获取为空: ${key}`);
        }
        const mr = getComp(Laya.MeshRenderer);
        if (mr && Array.isArray(mr.__mats)) {
            const keys = mr.__mats as string[];
            delete mr.__mats;
            const mats = await Promise.all(keys.map((k) => this.source.get(this._relKey(packName, lhDir, k)).catch((): any => null)));
            const arr = mats.map((m) => m || null);
            if (arr.some((m) => m)) (mr as any).materials = arr;
            else console.warn(`[Res] 3D 材质全部获取为空: ${keys.join(',')}`);
        }
        const count = node.numChildren;
        if (count > 0) {
            const tasks = new Array<Promise<void>>(count);
            for (let i = 0; i < count; i++) tasks[i] = this._applyNode3DRes(node.getChildAt(i), packName, lhDir);
            await Promise.all(tasks);
        }
    }

    private _prepareLhData(raw: any): any {
        if (!raw) return raw;
        const walk = (node: any) => {
            if (!node) return;
            const s = node.src? node.src : node.skin;
            if (typeof s === 'string' && s.length > 0) {
                node.__res_src_key__ = s;
                delete node.src;
                delete node.skin;
            }
            const children = node._$child || node._$children;
            if (children instanceof Array) {
                for (let i = 0; i < children.length; i++) walk(children[i]);
            }
        };
        walk(raw.data);
    }

    private async _applyNodeTextures(node: any, packName: string, lhDir: string = ''): Promise<void> {
        if (!node) return;
        // 组件库图集帧表懒加载(prefab 合并产物含默认皮肤 src 引用 ui/internal/UI/images/*, 散图不在包文件列表)
        await this._ensureUiFrames();
        let key = node.__res_src_key__;
        if (key) {
            // 空文件名脏数据守卫(.ls 残留 "ui@.png" 之类): 剥目录后为空或以 . 开头跳过本节点纹理(不影响子节点递归)
            const seg = key.indexOf('@') >= 0 ? key.substring(key.indexOf('@') + 1) : key;
            const file = seg.slice(seg.lastIndexOf('/') + 1);
            if (file && !file.startsWith('.')) {
                try {
                    // 组件库帧(_uiFrames)直取; 其余走包内文件(散图/图集组)。
                    // key 第一段已是挂载包名(路径算法 v2: 场景 src 引用 "ui/main/bg.jpg" 自带包前缀)时不再补,
                    // 否则按 lh 所在包内目录解析(相对引用, 同 _relKey; lhDir='' 根级退化为旧形态)
                    const res = _uiFrames[key] !== undefined ? _uiFrames[key]
                        : await this.source.get(this._relKey(packName, lhDir, key));
                    if (res) {
                        // GImage 渲染走 comp(FrameAnimation) 的 atlas 通道, node.texture 赋值无效
                        const comp = node.comp;
                        if (comp && typeof comp.setAtlas === "function") {
                            const atlas = new Laya.AtlasResource(key, [res], [res]);
                            comp.setAtlas(atlas);
                        } else {
                            node.texture = res;
                        }
                    } else console.warn(`[Res] lh 节点纹理获取为空: ${key}`);
                } catch (e) {
                    console.warn(`[Res] lh 节点纹理替换失败: ${key}`, e);
                }
            }
        }
        const count = node.numChildren;
        if (count > 0) {
            const tasks = new Array<Promise<void>>(count);
            for (let i = 0; i < count; i++) tasks[i] = this._applyNodeTextures(node.getChildAt(i), packName, lhDir);
            await Promise.all(tasks);
        }
    }

    createAtlas(pngBlob: Blob, atlasBlob: Blob, cacheKey: string, callback: (atlas: Laya.AtlasResource | null) => void): void {
        const imageUrl = URL.createObjectURL(pngBlob);
        Laya.loader.load({ url: imageUrl, type: Laya.Loader.IMAGE }).then((texture: Laya.Texture) => {
            const reader = new FileReader();
            reader.readAsText(atlasBlob, 'utf-8');
            reader.onload = () => {
                try {
                    const atlasJson = JSON.parse(reader.result as string);
                    const subTextures = this._createSubTextures(atlasJson, texture);
                    const atlasResource = new Laya.AtlasResource(cacheKey, [texture], subTextures);
                    if (atlasJson.animation) atlasResource.animation = atlasJson.animation;
                    callback(atlasResource);
                } catch (e) {
                    console.error('[Res] 解析 Atlas 失败', e);
                    callback(null);
                } finally { URL.revokeObjectURL(imageUrl); }
            };
            reader.onerror = () => { URL.revokeObjectURL(imageUrl); callback(null); };
        }).catch(() => { URL.revokeObjectURL(imageUrl); callback(null); });
    }

    createSpine(pngBlob: Blob, atlasBlob: Blob, skBlob: Blob, cacheKey: string, callback: (spine: Laya.SpineTemplet | null) => void): void {
        const imageUrl = URL.createObjectURL(pngBlob);
        const skReader = new FileReader();
        const isBinary = cacheKey.endsWith('.skel') || cacheKey.endsWith('.sk');
        if (isBinary) skReader.readAsArrayBuffer(skBlob);
        else skReader.readAsText(skBlob, 'utf-8');

        skReader.onload = () => {
            const skData = skReader.result as (string | ArrayBuffer);
            const asReader = new FileReader();
            asReader.readAsText(atlasBlob, 'utf-8');
            asReader.onload = () => {
                const rawAsText = asReader.result as string;
                if (!rawAsText || !skData) { URL.revokeObjectURL(imageUrl); callback(null); return; }

                const atlasPages: Laya.ILoadURL[] = [];
                const templet = new Laya.SpineTemplet();
                // @ts-ignore
                const atlas = new spine.TextureAtlas(rawAsText, () => {
                    atlasPages.push({ url: imageUrl, type: Laya.Loader.TEXTURE2D, propertyParams: { premultiplyAlpha: false } });
                    return new Laya.SpineTexture(null);
                });

                Laya.loader.load(atlasPages).then((res: Laya.Texture2D[]) => {
                    const textures: Record<string, Laya.Texture2D> = {};
                    const n = res.length;
                    const pages = atlas.pages;
                    for (let i = 0; i < n; i++) {
                        const tex = res[i];
                        if (tex) tex._addReference();
                        const page = pages[i];
                        if (tex) {
                            // @ts-ignore
                            page.texture.realTexture = tex;
                            // @ts-ignore
                            page.texture.setFilters(page.minFilter, page.magFilter);
                            // @ts-ignore
                            page.texture.setWraps(page.uWrap, page.vWrap);
                        }
                        page.width = tex?.width || 1;
                        page.height = tex?.height || 1;
                        textures[page.name] = tex;
                    }

                    const regions = atlas.regions;
                    for (let i = 0; i < regions.length; i++) {
                        const region = regions[i];
                        const page = region.page;
                        const width = Math.max(page.width, 1);
                        const height = Math.max(page.height, 1);
                        region.u = region.x / width;
                        region.v = region.y / height;
                        // @ts-ignore
                        if (region.rotate) {
                            region.u2 = (region.x + region.height) / width;
                            region.v2 = (region.y + region.width) / height;
                        } else {
                            region.u2 = (region.x + region.width) / width;
                            region.v2 = (region.y + region.height) / height;
                        }
                    }

                    try {
                        // @ts-ignore
                        templet._parse(skData, atlas, textures);
                        callback(templet);
                    } catch (e) {
                        console.error('[Res] 解析 Spine 失败', e);
                        callback(null);
                    } finally { URL.revokeObjectURL(imageUrl); }
                }).catch(() => { URL.revokeObjectURL(imageUrl); callback(null); });
            };
            asReader.onerror = () => { URL.revokeObjectURL(imageUrl); callback(null); };
        };
        skReader.onerror = () => { URL.revokeObjectURL(imageUrl); callback(null); };
    }

    private _createSubTextures(atlasJson: any, texture: Laya.Texture): Laya.Texture[] {
        const subTextures: Laya.Texture[] = [];
        const scaleRate = parseFloat(atlasJson.meta?.scale || "1");
        texture.scaleRate = scaleRate;
        const frames = atlasJson.frames;
        for (const frameName in frames) {
            const frameData = frames[frameName];
            const frame = frameData.frame;
            const subTexture = Laya.Texture.create(texture, frame.x, frame.y, frame.w, frame.h,
                frameData.spriteSourceSize?.x || 0, frameData.spriteSourceSize?.y || 0,
                frameData.sourceSize?.w || frame.w, frameData.sourceSize?.h || frame.h);
            subTexture.url = `${texture.url}_${frameName}`;
            Laya.loader.cacheRes(subTexture.url, subTexture);
            subTextures.push(subTexture);
        }
        return subTextures;
    }
}
