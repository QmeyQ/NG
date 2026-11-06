/**
 * agcWx - 微信端 AGC 直连实现(wx.request 无 CORS 概念, 直连恒可行)
 *
 * 直连协议与华为服务端 SDK 请求形态一致(agcCore.agcDirect, pFetch 微信分支走 wx.request)
 * 失败回退 Worker 代理由 cloud.ts teOnce 统一处理(本模块只管直连一次)
 *
 * 上线前置: 微信公众平台 → 开发管理 → 开发设置 → 服务器域名 → request 合法域名
 *   添加 https://connect-api.cloud.huawei.com 与 https://www.normalgame.cn
 */
import { agcToken, agcDirect } from "./agcCore";

/**
 * 微信端直连调用: token → AGC 网关
 * 返回: 业务 JSON / null(失败, 调用方回退 Worker 代理)
 */
export function wxCall(name: string, data: any, userid?: string, key?: string): Promise<any> {
    return agcToken(userid, key).then((t) => {
        if (!t || !t.token) return null;
        return agcDirect(name, data, t.token);
    });
}