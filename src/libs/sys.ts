/**
 * sys - 系统级操作(平台分支收口)
 *
 * 返回/退出/外链等跨平台差异操作统一入口, 调用方无感:
 *   - back:  web 浏览器历史回退(离开页面) / 微信退出小游戏(exitMiniProgram)
 *   - openLink: web 新窗口打开 / 微信复制剪贴板提示
 */
import { wxEnv } from "./wx";
import { Dialog } from "../ui/DIalog";

export class Sys {

    /**
     * 系统返回(根场景离开游戏语义):
     * - web: window.history.back() 回上一页
     * - 微信: wx.exitMiniProgram 退出小游戏(失败 toast 提示, 如工具模拟器不支持)
     * @param failTip 微信退出失败时的提示文案
     */
    static back(failTip?: string): void {
        if (wxEnv) {
            (globalThis as any).wx?.exitMiniProgram?.({
                fail: () => { if (failTip) Dialog.toast(failTip); }
            });
        } else {
            try { window.history.back(); } catch (e) { }
        }
    }

    /**
     * 打开外部链接:
     * - web: 新窗口打开
     * - 微信: 无 window.open, 复制到剪贴板并提示(复制成败由回调判定, 失败降级展示网址)
     */
    static openLink(url: string): void {
        if (!url) return;
        const w: any = (globalThis as any).wx;
        if (wxEnv && w && w.setClipboardData) {
            w.openPrivacyContract({
                success: () => {
                    
                }, // 打开成功
                fail: () => {} // 打开失败
            })
            w.setClipboardData({
                data: url,
                success: () => { Dialog.toast("链接已复制，可在浏览器打开"); },
                fail: (e: any) => {
                    console.error('[Sys] setClipboardData fail:', e && e.errMsg);
                    Dialog.toast("复制失败，请手动访问：\n" + url, 3000);
                }
            });
        } else {
            try { window.open(url); } catch (e) { }
        }
    }
}