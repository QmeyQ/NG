/**
 * LocalMatch - 对局详情本地存储(仅 IDB, 不经过服务器)
 * 结算时 badm 保存一条详情; 个人页"战绩"列表读取; 点列表项在右 panel 切到详情;
 * 详情内玩家行带加号可加好友(仅有 userid 的真实玩家)。
 */
import { IDBStorage } from "../IDBStorage";

export interface MatchPlayer {
    userid?: string;
    name: string;
    head?: string;
    side: number;      // 0=左/红 1=右/蓝
    self?: boolean;
}

export interface MatchDetail {
    id: string;
    ts: number;
    mode: "pve" | "pvp";
    win: boolean;
    score: [number, number];
    players: MatchPlayer[];
}

const KEY = "local_matches";
const MAX = 100;

export class LocalMatch {
    private static db: IDBStorage = new IDBStorage();
    private static _list: MatchDetail[] | null = null;

    static load(cb?: (list: MatchDetail[]) => void): void {
        if (LocalMatch._list) { if (cb) cb(LocalMatch._list); return; }
        LocalMatch.db.get(KEY, (rec: any) => {
            LocalMatch._list = Array.isArray(rec) ? rec : [];
            if (cb) cb(LocalMatch._list);
        });
    }

    static list(): MatchDetail[] { return LocalMatch._list || []; }

    static get(id: string): MatchDetail | null {
        return (LocalMatch._list || []).find(m => m.id === id) || null;
    }

    static save(d: MatchDetail): void {
        const list = (LocalMatch._list || []).slice();
        list.unshift(d);
        if (list.length > MAX) list.length = MAX;
        LocalMatch._list = list;
        LocalMatch.db.set(KEY, list, (): void => { });
    }
}
