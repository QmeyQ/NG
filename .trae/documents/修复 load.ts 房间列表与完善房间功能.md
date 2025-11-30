## 现状与问题
- `src/load.ts` 仅在 `onAwake` 中执行匹配（level 规则），未展示房间列表，也未提供加入/离开/解散等交互。
- 早期资源下载逻辑仍残留且被 `return` 阻断，易混淆实际流程。
- 已有的封装能力（查询房间、加入、事件监听）在 `src/libs/GNet.ts` 可用，但 `load.ts` 未集成房间列表与房间管理 UI。

## 目标
1. 在 `load.ts` 修复/新增房间列表的展示与交互（刷新、分页、加入）。
2. 完善房间功能：匹配（level 规则）、加入/离开/解散、帧同步开关、消息广播/服务器消息、房间属性更新。
3. 完善事件处理：玩家加入/离开、连接断开、房间解散，确保 UI 与房间状态同步。

## 具体改动
### UI 接入（房间列表）
- 新增/绑定 `roomList: Laya.List` 属性并从场景中获取（例如 `owner.getChildByName("Area2D").getChildByName("View").getChildByName("list")`，若路径不同，提供可配置常量）。
- 为 `roomList` 设置 `array` 数据源、`renderHandler`、`mouseHandler`、`selectHandler`。
- 列表项显示：房间名（`roomName`）、房间ID或短码（`roomId/roomCode`）、当前人数/最大人数（`players.length/maxPlayers`）、状态（是否帧同步）。
- 提供“刷新房间列表”按钮（或定时器）调用 `Gnet.getAR({ limit, offset?, sync:false })` 更新 `roomList.array`。

### 房间查询与分页
- 首次进入执行：`Gnet.getAR({ limit: 20, sync: false })`。
- 保存 `offset`/`hasNext`（`AvailableRoomsInfo`）用于下一页请求，支持“上一页/下一页”按钮更新 `offset`。
- 选择列表项时，显示房间详情（`ownerId/isLock/isPrivate/createTime`等）。

### 加入房间与匹配
- 列表项点击“加入房间”：调用 `Gnet.joinR(roomId, cb, { /* 可选玩家自定义参数 */ })`，成功后进入房间并调用 `setupRoom(room)`。
- 若加入失败，直接走匹配：`Gnet.matchR({ matchParams: { level }, maxPlayers: 4, roomType: "demo" }, cb)`。
- 匹配规则：`level` 取自 `load.text` 字段（已有），默认 `"1"`。

### 房间管理功能
- “离开房间”：`Gnet.leaveR(cb)`；“解散房间”（房主）：`Gnet.dismissR(cb)`。
- 帧同步控制：`Gnet.startF(cb)` 与 `Gnet.stopF(cb)`；发送帧：`Gnet.sendF(data)`。
- 消息：广播到客户端 `Gnet.sendC({ type: 0, msg })`；服务器消息 `Gnet.sendS(msg)`。
- 房间属性更新：`Gnet.updateR(roomName?, customProperties?)`，示例把房间名改为 `room-<level>`。

### 事件与状态同步
- 已有事件：
  - 加入：`Gnet.onJoin(cb)`；离开：`Gnet.onLeave(cb)`；连接：`Gnet.onConnect(cb)`；解散：`Gnet.onDismiss(cb)`；客户端广播：`Gnet.onClient(cb)`；服务器消息：`Gnet.onServer(cb)`。
- 在事件中刷新 UI：对 `room.players` 重新映射并更新房间详情显示；离开/解散后返回房间列表视图并自动刷新 `getAR()`。

### 错误处理与日志
- 统一错误输出：错误码与信息；对 `91001`（创建/加入失败）直接切换到 `matchR(level)`。
- 去除或下移 `return;` 阻断，确保流程清晰；保留资源逻辑时加条件分支避免冲突。

## 代码位置与参考
- 列表接入与房间事件绑定：`src/load.ts`（现有打印在 29–60 行，匹配在 62–71 行）。
- 封装能力：`src/libs/GNet.ts`，查询房间 `getAR`、匹配 `matchR`、加入 `joinR`、离开 `leaveR`、解散 `dismissR`、消息/帧同步相关方法（见 200、310、318 行附近）。

## 交互流程
1. 初始化 → 获取房间列表 → 展示列表。
2. 选中房间 → 加入；失败 → 按 `level` 匹配。
3. 进入房间 → 打印信息 → 事件监听 → 消息/帧同步演示。
4. 离开/解散 → 返回列表 → 自动刷新。

## 验证
- 在本地运行时观察控制台打印：列表刷新、加入/离开事件、消息收发、帧同步回调。
- 两端客户端设置相同 `level` 进行匹配确认；不同 `level` 确认不会匹配。

## 后续可选增强
- UI 添加“创建房间”与“房间属性修改”面板（仅房主可用）。
- 自动重连与房间信息 `room.update()` 定时刷新。
- 列表项增加锁定/私有状态图标；分页页码与总数显示。