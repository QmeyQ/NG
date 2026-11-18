/**
 * games - 平台游戏注册表(可扩展)。
 * 游戏列表(gList)按索引映射到 GAMES; 新增游戏只需在此登记 + 放对应 main/game/N.jpg 图标 + 游戏分包。
 * 每个游戏统一流程: 加载分包 → SceneNav.open(entryScene) → 游戏自己的匹配/选择/对战页(用平台 libs)。
 * 羽毛球(index0)走既有 nor 包匹配流程(badmJump); 其余游戏走通用分包入口。
 */
import { Res } from "./res/res";
import { SceneNav } from "./nav";
import { Dialog } from "../ui/DIalog";

export interface GameDef {
    id: string;
    name: string;
    /** Res.ResList 分包键; "" 表示羽毛球(走 nor 匹配流程) */
    packKey: string;
    /** 入口场景(平台 Res 路径, 含分包前缀) */
    entryScene: string;
}

export const GAMES: GameDef[] = [
    { id: "badm", name: "羽毛球", packKey: "", entryScene: "nor/match/match.ls" },
    { id: "g2", name: "NG2 对战", packKey: "g2", entryScene: "g2/game/select.ls" },
];

/** 按游戏列表索引启动游戏。badmJump=羽毛球既有 nor 检查+匹配跳转。 */
export function launchGame(idx: number, badmJump: () => void): void {
    if (idx === 0) { badmJump(); return; }
    const g = GAMES[idx];
    if (!g || !g.packKey) { Dialog.toast("暂未开放，敬请期待"); return; }
    const url = (Res.ResList as any)[g.packKey];
    if (!url) { Dialog.toast("暂未开放，敬请期待"); return; }
    Res.url(url, (info: any) => {
        if (!info) { Dialog.toast("资源加载失败"); return; }
        SceneNav.open(g.entryScene, undefined, (done) => {
            Res.get(g.entryScene).then((n: any) => done(n || null)).catch(() => done(null));
        });
    });
}
