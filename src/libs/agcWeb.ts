/**
 * agcWeb - web 端 AGC 直连实现(仅 web 端执行)
 *
 * 启用条件: agcWebOn(宏 AGCWEB / 运行时 !wxEnv), 微信端不加载本实现
 * (agcCore.agcWebOn 为 false 时 cloud.ts 不会调到此处; 微信端即使本模块进包也永不执行)
 *
 * CORS 降级: AGC 服务端网关(connect-api.cloud.huawei.com)面向服务端调用,
 * 浏览器 fetch 可能被 CORS 拦截(preflight/响应头缺失)。网络级失败(TypeError,
 * 拿不到任何响应)后会话级降级——后续调用直接走 Worker 代理, 不再重试直连。
 */
import { agcWebOn, agcToken, agcDirect } from "./agcCore";

/** 会话级降级: true=web 直连不可用(网络级失败, 大概率 CORS), 永久走 Worker 代理 */
let degraded = false;

/** web 直连是否可用(宏 + 未降级) */
export function webReady(): boolean {
    return agcWebOn && !degraded;
}

/**
 * web 端直连调用: token → AGC 网关
 * 返回: 业务 JSON / null(直连不可用或失败, 调用方回退 Worker 代理)
 */
export function webCall(name: string, data: any, userid?: string, key?: string): Promise<any> {
    if (!webReady()) return Promise.resolve(null);
    return agcToken(userid, key).then((t) => {
        if (!t || !t.token) return null;
        return agcDirect(name, data, t.token).then((res) => {
            if (res === null) {
                // 网络级失败: 浏览器端大概率 CORS 拦截, 会话级降级
                degraded = true;
                console.warn('[AgcWeb] web 直连降级(本次会话走 Worker 代理)');
            }
            return res;
        });
    });
}