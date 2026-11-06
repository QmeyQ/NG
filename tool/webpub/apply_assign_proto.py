"""一次性改造: pvpProto 加角色指派消息 + load.ts 换成单权威指派。

幂等保护: 目标串找不到就直接报错退出, 不做半截修改。
"""
import io

ROOT = 'E:/LayaProject/'


def read(p):
    return io.open(ROOT + p, encoding='utf-8').read()


def write(p, s):
    io.open(ROOT + p, 'w', encoding='utf-8', newline='').write(s)


# ---------------- 1) pvpProto ----------------
KIND_OLD = "    RoleOkPlay: 'okplay'\n} as const;"
KIND_NEW = ("    RoleOkPlay: 'okplay',\n"
            "    /** 角色指派单源化: 房主出表 → 全员 ack → 房主广播 start */\n"
            "    RoleAssign: 'role_assign',\n"
            "    RoleAck: 'role_ack',\n"
            "    MatchStart: 'match_start'\n} as const;")

TAIL = """
// ==================== 角色指派(单一权威源) ====================

/** 房主等 ack 的上限: 到点就广播 match_start, 弱网不能让全场干等 */
export const ASSIGN_ACK_WAIT_MS = 600;

/** roleId → 队伍号: 单人 0/1 各一队; 双打 0/1 一队、2/3 另一队 */
export function teamOfRoleId(roleId: number, players: number): number {
    if (players <= 2) return roleId === 0 ? 0 : 1;
    return roleId <= 1 ? 0 : 1;
}

/** 分配表完整性: 有条目/有 seq、roleId 唯一且覆盖 0..n-1、必须包含本机 */
export function checkAssign(d: any, myId: string): string | null {
    if (!d || !Array.isArray(d.assignments) || !d.assignments.length) return 'no-assignments';
    if (!isNum(d.seq) || d.seq <= 0) return 'no-seq';
    const n = d.assignments.length;
    const roles: number[] = [];
    let hasSelf = false;
    for (const a of d.assignments) {
        if (!a || !isNum(a.roleId) || !a.playerId) return 'bad-entry';
        if (roles.indexOf(a.roleId) >= 0) return 'dup-roleId';
        roles.push(a.roleId);
        if (String(a.playerId) === String(myId)) hasSelf = true;
    }
    for (let i = 0; i < n; i++) if (roles.indexOf(i) < 0) return 'role-gap';
    if (!hasSelf) return 'self-missing';
    return null;
}
"""

p = 'src/libs/pvpProto.ts'
s = read(p)
if 'RoleAssign' not in s:
    assert KIND_OLD in s, 'pvpProto: Kind 表锚点没找到'
    write(p, s.replace(KIND_OLD, KIND_NEW) + TAIL)
    print('pvpProto: 已加 role_assign/role_ack/match_start + 校验')
else:
    print('pvpProto: 已改过, 跳过')

# ---------------- 2) load.ts ----------------
CALL_OLD = "            this._buildAndSendPlayerInfo(players);"
CALL_NEW = "            this._assignRoles(players);"

ROUTE_OLD = ("                if (data && (data.kind === Proto.Kind.RoleFirst || data.kind === Proto.Kind.RoleFinal "
             "|| data.kind === Proto.Kind.RoleOkPlay)) {\n"
             "                    this._onReceiveAssignmentMsg(data, info.sendPlayerId);")
ROUTE_NEW = ("                if (data && (data.kind === Proto.Kind.RoleAssign || data.kind === Proto.Kind.RoleAck "
             "|| data.kind === Proto.Kind.MatchStart)) {\n"
             "                    this._onAssignMsg(data, info.sendPlayerId);")

BLOCK = io.open('E:/LayaProject/tool/webpub/_assign_block.txt', encoding='utf-8').read()

p = 'src/load.ts'
s = read(p)
if '_assignRoles' not in s:
    assert CALL_OLD in s, 'load: 满员调用点没找到'
    assert ROUTE_OLD in s, 'load: 消息路由点没找到'
    a = s.find("    private _resetAssignmentState(): void {")
    b = s.find("    private _roomEventsBound: boolean = false;")
    assert a > 0 and b > a, (a, b)
    s = s[:a] + BLOCK + s[b:]
    s = s.replace(CALL_OLD, CALL_NEW).replace(ROUTE_OLD, ROUTE_NEW)
    write(p, s)
    print('load.ts: 协商块已换成单权威指派')
else:
    print('load.ts: 已改过, 跳过')
