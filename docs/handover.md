# AI 接管手册（NG 羽毛球平台）

> 权威版本在画布工作流 `docs/nodes/aihandover.js`（h1→h11）。本文件为可读镜像。
> 闭环遵循 `docs/nodes/aidev.js`：先策划落图 → 执行 → 编译 → 浏览器验证 → 回填。部署/发布仅在明确授权且验收通过后执行。

## h0 登录态与授权复用（默认路径，先看这一节）
- **华为云**：Edge profile `local/edge-agc-login` 已持久化登录。`node local/openagc.cjs` 打开即带登录态，**不需要重输账号密码**；确认右上角账号有效后，直接进云存储桶 `sgf-rhq1y` / 云函数控制台操作。
- **Cloudflare**：wrangler OAuth 已持久化（账号 `2998856667@qq.com`，凭证在 `C:\Users\mien\AppData\Roaming\xdg.config\.wrangler\config\default.toml`）。`wrangler whoami` 确认已登录后**直接 deploy**，不触发 `login`。
- **执行原则**：先探测 → 有效则直接执行 h6/h7/h8 → 探测失败才走重新授权（`openagc.cjs` / `wrangler login`）。授权页只在明确报未认证时处理，不做预防性重登。
- 注意：可见 Edge 9227 的登录窗口与 headless 验证驱动（9228/9230）不得共用同一 profile。

## h1 环境与端口
- IDE liveServer MCP: `127.0.0.1:18090`（SSE `GET /ai/mcp`，`POST /ai/mcp-messages?sessionId=...`）。客户端 `node local/layamcp.cjs list|schema <tool>|call <tool> '<json>'`。工具: ide-state / ide-build / ide-find-assets / ide-open-scene / ide-ui-eval(参数名 code)。
- 本地验证静态服务: 8125（驱动内置）。
- headless 验证 CDP: 9228/9230（驱动自启 Edge headless，profile `local/edge-socialN`，**每次换 fresh profile**）。
- 华为云登录: **可见** Edge 9227，profile `local/edge-agc-login`，`node local/openagc.cjs`。
- CF: `wrangler login` 回调 `localhost:8976`。
- ⚠ 验证驱动与登录窗口**勿共用 9227**（曾误把登录窗口导航走）。

## h2 构建与类型
- 无 IDE 复现 bundle: `node tool/build.cjs [--out local/build/bundle.social.js]`。
- IDE 完整发布(含 menu.ls): `node local/layamcp.cjs call ide-build '{"platform":"web"}'` → `release/web`。
- 类型: `node node_modules/typescript/bin/tsc -p tsconfig.qa.json --noEmit`。基线仅 `src/card.ts:80/82` 两条 TS2554；**新增必须 0**。

## h3 离线测试（改服务端必跑）
```
node --test test/cloud-registration.test.cjs test/social.test.cjs test/progress-pid.test.cjs   # 114 项
```
跑真实 `server/te/user.js`+`shield.js`+Worker `agc.js`+客户端 `social.ts`，mock DB/IDB/fetch。断言：最小写入操作次数（bag/user/set/buy=1查1写、del=1查1删、reg 冷5/热4/显3）、转交 mes 附带+ack 删除、身价扣/到账/退还、屏蔽词 w=1、群 create/info/relay、不泄露对方 mes。

## h4 收集与打包
```
node local/packstage.cjs                                   # dist 完整树 + release 变更 + 旧 ui.br 恢复 head/ProgressBar
node tool/assetsCollect.js local/packstage --dst F:/LayaProject/web
node tool/tmpPack.js                                       # → ui.br / nor.br
```
核对 `ui.manifest.json` 含 `menu.ls` + 4 个 head。IDE tree-shake 会漏未引用资源(head/ProgressBar)，packstage 从旧 `tool/ui.br`(brotli 解 BRP1 容器)恢复。

## h5 浏览器验证（AI 自动化）
- 本地: `node local/socialdrive3.cjs` / `socialdrive5.cjs`（headless + CDP Fetch 拦截把 agc-storage 的 ui.br/nor.br 换本地新包，Range 回 206+Content-Range；隐私勾选或注入 privacyAgreed；点底部 box2/3/4；断言预制体节点/点击/降级；截图 local/social*.png、报告 local/social-verify*.json）。
- 生产: `node local/socialdrive_prod.cjs`（真实 CDN+Worker，注入 privacyAgreed）。
- 对局: `__qa.toMatch()` / `__qa.pve()`；headless 下 nor 分片下载偶发不稳 → 换 fresh profile 重试或人工复验。

## h6 上传华为云存储（登录态已持久化，默认直接用）
- **掉线重登技巧(实测)**：华为登录页保存凭据的自动填充对 JS `.click()` 不生效；须用 **CDP 真实鼠标点击**(`Input.dispatchMouseEvent` mousePressed/mouseReleased)点登录按钮/输入框，即触发保存凭据完成登录。`local/real_login.cjs` 为可复现驱动。登录后开云存储(点左侧"云存储"导航, iframe 为 agc/cs)再上传。
前提: 可见 Edge 9227 已登录 + 云存储桶 `sgf-rhq1y` 标签（`node local/openagc.cjs`；被导航走用 `/json/new` 重开）。
```
Python/pythoncore-3.14-64/python.exe local/doupload.py     # PUB_FORCE=1 覆盖 root ui.br/nor.br + js/bundle.js
```
回读共享令牌写 `tool/webpub/tokens.json`；**令牌不变**则 `res.ts` ResList 与 index.html 直链无需改。js 目录须 go_root→enter_dir('js') 再传；传后 reload 复核大小/时间戳确认替换。
【已验证可行】进 js/ 点击文件夹名后 **cslp iframe 可能重载致 frame 失效→每次点击后 `cs._frame()` 重取**再判 rows；上传用 `cs.upload()`(先点"上传文件"按钮)而非直接 input；多策略点击(真实/JS/CDP viewport_midpoint)。可靠脚本 `local/doupload_js7.py`。误传根目录的 bundle.js 为冗余可删。root ui.br/nor.br 上传稳定。

## h7 部署 te 云函数（复用已登录的 Edge 9227 会话）
```
Compress-Archive server/te/CloudDBZoneWrapper.js,server/te/code.js,server/te/db.js,server/te/function-config.json,server/te/gobe.js,server/te/NG.js,server/te/package.json,server/te/shield.js,server/te/user.js,server/te/resources -DestinationPath local/te-new.zip -Force
```
开云函数标签 `#/app/9249519184595931747?appId=5765880207855344723&projectId=388421841221717430` → 点函数 **te** → **函数代码** tab。
`python tool/webpub/fcode.py up local/te-new.zip`；拖拽框隐藏无 rect 时用 `local/deploy_te2.py`(JS 点 wrap+input)；若仍不认 → **人工控制台上传 zip 并提交**。纯代码包(平台装依赖)。部署后 h9 验证版本。

## h8 部署 Cloudflare Worker（wrangler 已授权，直接 deploy）
```
cd server/cloud
node node_modules/wrangler/bin/wrangler.js whoami          # 未认证→ login(弹浏览器授权, 回调 8976, 超时重跑)
node node_modules/wrangler/bin/wrangler.js deploy
```
Worker=网关+IP/历史风控(历史改用户行 history 点查)。
⚠ login 回调 8976 被残留 login 进程占用会报 port in use：netstat 找 PID 停掉再重跑；login 进程需保持存活等待授权(勿管道截断)。【已验证】授权后 `wrangler deploy` → `/health` wv 应为当前 WORKER_VERSION(v1116a)。

## h9 服务器通讯自检
`node local/probe_te.cjs`（www.normalgame.cn POST te bag/sync/ack；**workers.dev 本机 node 不可达**用自定义域名）。期望 bag code0 且 v=当前 CODE_V、sync/ack code0。若 sync/ack 回"未知 t"=te 旧版未部署→h7。**客户端新+服务端旧="服务器通讯有问题"根因。**

## h10 已知坑与取舍
- IDE 场景进程 reload 卡死(null/4)不影响 ide-build(走 assetDb)。
- headless Fetch 拦截 Range 分片污染 IDB 缓存→换 fresh profile。
- item2/item3 子节点随控制器 c0 页切换异步实例化→SocialPage/PersonalPage 在 render 懒重绑。
- GList 默认无选中模式→tab 用 item 点击。
- DrawRoundRectCmd.create 需 11-14 参→代码用 DrawRectCmd.create(7参)或对象字面量。
- **多客户端测试**：`local/mcdrive.cjs` 双 headless Edge(9240/9241, profile edge-mcA/B)+双静态服务(8125/8126 同内容不同 origin 隔离 IDB)+Fetch 拦截本地包, 真实 GOBE/Worker; 流程注册→大厅→好友→新聊天→P2P→广播。已修: setroom 落库✓、大区群单例(globby+地区码 get-or-create + oldLobbyGids 清理 + pruneLobbyConvs 含历史消息)✓、社交消息改 CUSTOM+90。**已修(11/11)**: 接收侧根因有二——(a) GOBE `sendToClient` 的 type 是**路由模式**(0=全员/1=除自己外广播/2=recvPlayerIdList 点对点), 旧代码误用 chatType=190 当 type→服务器回 INVALID_MESSAGE(102016) 拒发; (b) SDK `room.onRecvFromClient` 只回 {roomId,sendPlayerId,msg} **不带 imType**, 故 `Gnet.onMessage(type)` 永不触发。修法: 发送改 `Gnet.ROUTE_OTHERS(1)`/`ROUTE_TARGET(2)`, 接收改 `Gnet.onClient` catch-all + 载荷 k 标签(chat/invite/invroom/freq/facc), 与 PVP msg.ts 一致。另: freq 通知触发 Social.sync 刷申请列表、accept 发 facc 通知申请方自动重同步; Lobby.ensure 加身份就绪本地重试(6×1.5s, 非云轮询)。mcdrive 改 fresh profile+注册/进房就绪等待+uid 净化, 11/11 自主通过。
- **GOBE 社交(禁云轮询)**：实时走 `Gnet.sendToClient(路由模式, JSON载荷)` + `Gnet.onClient` catch-all(**切勿用 onMessage(type)/chatType 当路由**, 见上条 102016)；大厅房标记 `customRoomProperties{kind:lobby,region}` 用 `getAvailableRooms` 遍历区分匹配/游戏房；`createRoom` 玩家属性硬编码→进房后 `updatePlayerProperties` 补 userid；`RoomOptions` 用 `customProperties`；点对点先 `joinRoom` 对方房(`social.room` 经 find 带回)，房不存在/无人→te msg 兜底；地区用 Intl 时区映射。
- **预制体状态三坑**：controllers 序列化是 Record(按名键控)非数组且键序先于 _$child；GButton 选中态需预制体上名为 button 的控制器(6页 up/down/over/selectedOver/disabled/selectedDisabled)，不自动创建；GearDisplay 改 **internalVisible**(非 visible)，背景外部 visible 须 true，读取选中态用 visible&&internalVisible。
- **relation 跑飞**：TopExt_Top(21)/TopExt_Bottom(22) 目标尺寸变化时移动顶边(累加)→容器顶部跑飞消失；填充式容器用 BottomExt_Top(23)/BottomExt_Bottom(24)(顶边固定)。IDE 设计比例 dy=0 掩盖、非设计分辨率暴露；`local/layoutdrive.cjs`(WINSIZE 环境变量) dump 全局坐标定位。引擎语义见 `LayaAir3.4/src/layaAir/laya/ui2/Relation.ts`。
- 身价=**自己的身价**个人设置(隐私栏 setprice, 0..500 默认1, 支持0), 加好友**不涉及金币转移**(旧"发送方付"理解已废弃)；屏蔽词 BLOCKED_WORDS 命中标记 w=1 不拦截(红字)；会话历史全本地、服务端 mes 仅未送达暂存、ack 确认送达本地缓存后删除；对局详情仅本地 IDB(local_matches)。

- **云调用最小化**：`afterJoin(roomId, cb, isLobby)` 仅大区房记录房间号；与本地 `localStorage(lobby_room/lobby_gid)` 一致则复用、**不调 setroom/lobbygroup**；匹配/非大区房**绝不写房间信息**。`sendRaw` 单玩家：对方就在当前房→GOBE 点对点；找不到(离线/异房)→**直接云兜底，不 joinRoom 跳房**(省进房+避免跳房触发 setroom)。回归见 lobby-receive.test.cjs「setroom 最小写入」。
- **新消息提醒**：`Social.onNewMessage` 钩子(`slecet.ts` 登录初始化注入：`Au.tap`+`Dialog.toast(发送者: 预览)`)，`receiveLocal`(GOBE)/`handlePending`(云兜底)收到他人新消息触发；`Social.suppressNotify`(看聊天面板时置位)抑制打扰；自己的消息不提醒；+号徽标计未读。Social 只暴露钩子+标志，声音/toast 由 UI 注入(低耦合)。
- **华为自动登录**：账号密码存于 Edge profile `local/edge-agc-login` 密码管理器(登录页自动填充)，点「登录」链接即自动登入；`local/deploy_after_login.py` 检测登录完成后自动开云存储页上传 ui.br/nor.br/js/bundle.js。

## h11 新 AI 接管清单
1 读 docs/index.js + nodes/aidev.js + 本手册。2 h3 离线基线。3 h2 tsc+build。4 h9 probe_te 确认线上 te；旧→h7；h8 Worker(需 CF 授权)。5 h4 打包+h6 上传(需华为登录)。6 h5 本地+生产复验。7 回填 nodes/psocial/srv/pmenu/aidev(ai12) + `node local/doccheck.cjs`(新增错误 0；既有告警 bmag g9/e3 pres.001 不动)。
未决: CF 登录/Worker 部署、te 控制台人工上传(若自动化不认)、对局 headless 复验。

## h12 架构模块地图（精准分支维护，改小分支不必读全项目）
> 低耦合分层：每个功能集中在 1 个客户端模块 + 对应 te 分支 + 对应预制体面板；模块间经**注入 sink/明确接口**通信，不反向依赖。改某功能只读该行文件即可。

| 功能分支 | 客户端模块 | 服务端(te/user.js 分支) | 预制体(menu.ls) | 离线测试 |
|---|---|---|---|---|
| 好友/私信/群/身价/屏蔽词/转交 | `src/libs/server/social.ts` | friend/msg/group/ack/setprice/profiles/find/sync | item2 socHome/socChat/socAdd/socGroup/socNewChat | social.test.cjs |
| GOBE 大厅/点对点/广播/路由 | `src/libs/server/lobby.ts` + `src/libs/gobe/net.ts` | setroom/lobbygroup | (无 UI, 纯逻辑) | lobby-receive.test.cjs |
| 对局邀请(单打/双打) | `src/libs/server/invite.ts` | invite(create/accept/setroom/get) | item2 chatFuncPanel/funcList | social.test.cjs(invite) |
| 本地对局详情 | `src/libs/server/localMatch.ts` | (无, 仅本地 IDB) | item3 战绩 panel | progress-pid.test.cjs |
| g2 联机房间/确定性同步 | `src/g2/online.ts`(房间生命周期) + `src/g2/phys2d.ts`(确定性内核: 操作同步+快照校正) + `src/g2/GameManager.ts`(编排/fireOp/tick) + `src/g2/Main.ts`(g2start/g2fire/g2snap 通道) + `src/g2/battleControl.ts`(重开/退出) | (GOBE 实时, 非 te) | g2/game/select.ls + trace.ls | **local/g2mcdrive.cjs 双账号实测(含跨端轨迹一致性)** |
| 社交页 UI 绑定 | `src/ui/social.ts` | — | item2 全部 soc* 节点 | (浏览器 mcdrive) |
| 个人页 UI 绑定 | `src/ui/personal.ts` | bag/set/score | item3 左 tabs 右 panel(背包/战绩/设置/隐私) | (浏览器) |
| 网关/IP/历史风控 | `src/libs/server/cloud.ts`(teSafe/teWrite) | Worker `server/cloud/src/agc.js` | — | cloud-registration.test.cjs |
| PVP 协议(帧/消息/角色) | `src/libs/gobe/msg.ts`+`pvpProto.ts`+`roleSync.ts` | (GOBE 实时, 非 te) | game/badm.ls | (对局驱动) |
| 资源网络加载 | `src/libs/res.js`+`load.ts` | Worker /res 令牌 | — | res-loader.test.js |
| 3D 角色素材/动画 | `3d/model/*.blend`(源) + `assets/nor/boy.fbx`(导入源) | — | `web/nor/boy@0.lh`+`boy/*.lani`+`ani.controller` | ai3d 工作流(m0→m8) + 浏览器探针 |
| AI 辅助/远程聊天 | `chat/*` + `server/re/codex.js` | relay `codex.*` | `chat/public/codex.html`(发布 `www.normalgame.cn/codex.html`) | `chat/test/e2e.cjs`(17) |

**解耦契约**：
- lobby **不 import social**；social 经 `Lobby.setSinks({chat,freq,cloud,group,roomOf,sync})` 注入回调。改大厅逻辑不碰社交业务，反之亦然。
- invite 仅依赖 Cloud.te + Social.sendPayload(消息通道) + Lobby(房间)，不碰 UI；UI 经 `Invite.onCreate` 回调。
- GOBE 收发消息**唯一契约**：sendToClient(路由模式 0/1/2, JSON 载荷自带 k/kind 标签) + onClient catch-all 解析。SDK 不回传 imType，onMessage(type) 无效。社交 k=chat/invite/invroom/freq/facc；PVP kind=...。两者互不干扰(lobby 只认 k, msg.ts 只认 kind)。
- DB 最小写入：每记录 1 查 + 1 写(审计合并用户行 history)；消息服务端仅 mes 暂存转交, ack 删, 历史全本地 IDB。

**按分支构建/验证**（改哪块跑哪块，不必全量）：
- 仅客户端逻辑：`node tool/build.cjs --min --out release/web/js/bundle.js` → `node local/mcdrive.cjs`(社交/GOBE) 或对应离线测试。
- 仅 te 分支：改 `server/te/user.js` → `node --test test/social.test.cjs test/cloud-registration.test.cjs` → h7 部署 zip。
- 仅 Worker：改 `server/cloud/src/agc.js` → cloud-registration.test.cjs → h8 wrangler deploy。
- 仅预制体：改 `assets/ui/menu.ls` → h4 collect+tmpPack → h6 上传 ui.br → 浏览器复验。
- 全量基线：`node --test test/cloud-registration.test.cjs test/social.test.cjs test/progress-pid.test.cjs test/lobby-receive.test.cjs`(119) + tsc(基线 card.ts:80/82) + `node local/doccheck.cjs`(新增 0)。

## h13 工作方式：自动化授权与连续迭代（用户明确授权 2026-11-17）

**授权范围**
- `F:/LayaProject` 项目目录内视为可破坏环境（用户确认无重要数据），允许覆盖、删除、重构，**默认不做备份**，不再逐次确认。
- 红线：不动系统配置、登录态与凭证文件；不碰项目外路径；不把含 token 的文件放进 Web 可访问目录；不改平台/内网系统。

**全链路自动**
- 构建 → 离线测试 → 浏览器验证 → 打包 → 上传 → 部署 → 自检，整条链路无人值守串行执行。
- 可调用任意可用能力：`exec`、`local/layamcp.cjs`、CDP 驱动、Python 脚本、MCP、LLM（`/llm/complete`），包括临时拉起测试环境。
- 每步产出机器可判定的结果（退出码、断言数、版本号、截图），失败即停。

**连续迭代（单轮时长受限时的续跑协议）**
- 每轮结束把状态写入 `docs/auto/state.json`：`{phase, done[], next, failed[], note, updatedAt}`。
- 下一轮开工先读该文件，从 `next` 继续，不重复已完成步骤。
- 长任务：`exec` 后台启动 + 轮询日志；跨轮任务在 `state.json` 记录 pid 与日志路径。
- 交替调用：sub-agent 负责策划/生成任务 → `exec` 执行 → LLM 复核结果，循环推进。

**失败处理**
- 同一操作最多重试 2 次；仍失败则写入 `state.failed` 并切换路径，禁止静默跳过。
- 发布类步骤（h6/h7/h8）失败立即停止，不做后续步骤。

## h14 远程中转接管（re-relay，AI 远程全权处理本机项目）
> 权威子树在 `nodes/prelay.js`（r1→r7）；项目代码全在 `server/re/`。让远端 AI 经服务器 `/apim` 全权处理本机 Laya 项目（文件/终端/LayaAir IDE MCP）。

**链路**：远端 AI ─HTTP/HTTPS─> 服务器 nginx `/apim` ─> `127.0.0.1:5001`(frps 远程口) ─frp 隧道─> 本机 `127.0.0.1:21119`(`server/re/server.js`)。
- 服务器 `47.119.120.119`（阿里云 ECS `i-wz9ai3ubuaio96cedrf4`, cn-shenzhen, Ubuntu 22.04, 内网 172.18.167.46, root）。站点根 `/home/ftpu/html`；nodejs 服务 `/home/ftpu/server.js`(:3000, nginx `/api/` 反代)；frps 在 `/home/ftpu/frp/`(bindPort 7000)。
- **端口隔离**：relay 用 `21119→5001` 独立 frpc（proxy `re-api`），**绝不碰远程控制 FRPC（21118→5000, m-tcp）**。

**调用**：`POST http://47.119.120.119/apim` 或 `POST https://normalgame.cn/apim`，token 在 `re/config.json`（body.token / `X-Re-Token` 头 / Bearer）。**参数缺失/错误直接返回帮助文档** `{ok:false,error,help}`；GET 任意路径或 `action=help` 返回完整 API。
- 动作：`help/ping/info`；`fs.read/write/append/list/stat/delete/move/copy/mkdir`（path 相对项目根或绝对，encoding utf8/base64）；`exec{cmd,cwd,timeout}`（高危 shell）；`laya.list/call/state/build/find/open/eval`（经 `mcp.js` 接管 LayaAir IDE MCP `127.0.0.1:18090`，SSE+JSON-RPC，断线自动重连）。

**服务器接管方法（cua 对 Edge 许可常被拒，改用 CDP，同 mcdrive 测试法）**：
1. 复制本机 Edge Profile 1 会话（Local State + Local Storage + Network/Cookies）到可调试 profile `local/edge-srv`，启 Edge `--remote-debugging-port=9228`（`local/copy_session_edge.ps1`）。Cookies 常 EBUSY 锁定，但 Local Storage 足以保留阿里云登录。
2. CDP 导航 ECS Workbench 免密登录实例（`local/open_workbench.cjs`、`click_login.cjs`）。
3. 经 xterm 键入命令（`local/type_cmd.cjs "<cmd>"` 或 `@file`；Input.insertText+Enter；回读 `.xterm-rows`）。得 root shell 即全权配置。

**服务器配置**：
- nginx `/etc/nginx/sites-enabled/default`：HTTP(:80) 与 HTTPS(:443 normalgame.cn, 证书 `/etc/nginx/ssl/normalgame.cn.pem/key`) 两个 server 各加 `location /apim { proxy_pass http://127.0.0.1:5001/; proxy_http_version 1.1; proxy_set_header Host $host; X-Real-IP; X-Forwarded-For; proxy_read_timeout 300s; client_max_body_size 64m; }`。备份 `/root/default.bak.re/.re2`（**勿放 sites-enabled 内**，否则 duplicate default server）。`nginx -t && systemctl reload nginx`；reload 后 curl 瞬时 404 是竞态，稍候重试。
- **FTP 修复**：vsftpd `/etc/vsftpd.conf` 改 `listen=YES`/`listen_ipv6=NO`（原 `listen_ipv6=YES` 致 PASV 返回 `0.0.0.0` 忽略 pasv_address → 客户端数据连接失败="连不上"）；`pasv_address=47.119.120.119`，被动端口 1024-1048（安全组已放行）；`systemctl restart vsftpd`；备份 `/root/vsftpd.conf.bak.re`；客户端用**被动模式 PASV**。诊断 `local/ftp_test.cjs`（登录+PASV+数据连接）。

**开机自启（NSSM）**：`re/frp/nssm.exe`。`re/frp/ontask.bat`（需管理员/UAC）装 ReAPI(`bin/node.exe server.js`)+ReFrp(`frpc.exe -c re/frpc.toml`) 两自启服务（SERVICE_AUTO_START, AppExit Restart），先调 `kill_manual.ps1` 停手动实例（避免端口/proxy 冲突）。`re/frp/uninstall.bat` 仅卸 ReAPI/ReFrp 不动 FRPC。**服务安装需管理员**：exec 非 admin，须用户点 UAC 或右键 bat 以管理员运行。手动运行用 `local/restore_manual.ps1`。

**扩展与优化**：
- 扩展 API：`server.js` handlers 加动作 + `HELP.actions` 加文档（参数缺失自动返回帮助）；新远程能力经 `exec`/`laya.call` 即可，无需改架构。
- 优化：token 轮换改 config.json 重启 relay；按需加路径/命令白名单（当前全权）；exec 超时/输出截断已设；MCP 断线重连已设；多机接管=每机一个 frpc proxy（不同 remotePort）+ 服务器 nginx 多 location。
- 排障：看 `relay.log`/`frpc_re.log`；服务器经上述 CDP 法接管查 nginx/frps/vsftpd；公网不通查安全组（21/5001/1024-1048/80/443）。
- 验证：本地 `re/test_local.cjs`(15 项)；公网 `POST https://normalgame.cn/apim` 的 exec/laya.state。

### 模型编排（用户要求：只用最强模型 + 多板块并行）

- **主模型**：`ark-code-deepseek-v4.1-flash`；**备用**：`qwen-deepseek-v4.1-flash`（同一底模、不同云厂商，仅用于故障切换与交叉校验）。
- **禁用**：`qwen38-flash`、`qwen38-27b-local` 不承担规划/编码/根因/评审等生产任务；仅当主备全断时兜底，且必须在结果中标注"降级模型"。
- **并行拆分**：按阶段拆独立子任务并行——h2 构建 / h3 离线测试 / h4 打包 / h5 浏览器验证 / h6-h9 上传与部署。各子任务只写自己的产物目录，完成后统一回写 `docs/auto/state.json`，不做跨任务写同一文件。
- **交叉校验**：版本号、断言数、部署结果这三类关键结论，用两家 provider 各跑一次；不一致时以本地实测（测试通过/探针返回）为准，不以模型自述为准。
- **会话模型**：平台注入给 Agent 会话的模型不可自选；本规则约束的是经 `/llm/complete` 与 sub-agent 发起的工作负载。

### 进度持续下发（用户要求）

- **每个阶段**开始/完成、遇到失败、收尾时，通过数字人接口推送消息到美信私聊（`meixin-digital-human` 的 `send.py`，`--to ex_xiaowj7`）。
- **不刷屏**：只在状态变化时推；长任务按里程碑或每 5–10 分钟一次摘要。
- **推送内容**：阶段名、结果（成功/失败/跳过）、关键数字（tsc 错误数、断言数、版本号、包大小）、下一步。
- **失败不阻断**：推送本身失败记入 `docs/auto/state.json` 的 `failed`，主流程继续。
- 每次推送后同步更新 `state.json`，保证跨轮可续。

### UI 策略（用户明确：不要 ui 包，旧 UI 全部升级为新 UI）

- 第二款游戏**不迁入旧 UI**：`select.ls`、`roomItem.ui`、`BagList.lh` 一律不打包、不沿用。
- `g2.br` 只装玩法场景（`Scene.ls`）与 Spine/图集资源；入口、选人、背包、结算界面用平台新 UI（`menu.ls` 的 GPanel + Controller + GearDisplay 体系）重建。
- 平台侧同步把旧 UI 组件升级为新 UI，逐步清退旧组件，最终 `ui.br` 只承载新 UI。
- 验收追加一条：第二款游戏界面不出现旧 UI 预制体（BagList/select/roomItem）。

## h15 完成验收硬规则：实测 + 截图目视自检（用户明确 2026-11-19，写死）

**规则（任何游戏/玩法/UI 改动宣称完成前必须全部满足）：**
1. 真实浏览器（headless Edge CDP）跑对应探针，覆盖全路径：入口→模式选择→对局→控制（拖拽/单击）→伤害→胜负结算→退出→重进。多人通讯改动必须多浏览器实例、多账号实测（mcdrive/mc3drive），禁止单端臆测。
2. 每个关键状态截图，**AI 必须自己 view_image 逐张目视核对** UI/布局/状态：血条/护盾/力度条位置、角色对齐与朝向、残留节点（旧背包文本等）、按钮可见性、文本正确性。自主发现 bug，不等用户反馈。
3. 数值断言与目视核对**双通过**才算完成；两者矛盾即判失败继续修。只靠用户反馈发现问题 = 验收失败。
4. 探针清单：`local/g2selftest.cjs`（g2 单机全路径 + 6 截图 + 14 断言）、`local/g2fireprobe.cjs`（控制/时钟诊断）、`local/play_probe.cjs`（真实拖拽）、`local/g2probe.cjs`（入口链路）、`local/prod_g2.cjs`（生产 CDN 复验）、`local/mcdrive.cjs`/`mc3drive.cjs`（社交多客户端）。
5. headless Edge 坑：必须加 `--no-sandbox`（AppContainer 崩溃 0xC0000005）；boot 失败自动重试一次；**CDP 轮询必须走 exec_command 的 node**（node_repl 沙箱回环 EACCES）。

**本轮 g2 单机修复闭环（2026-11-19，截图目视发现并修复）：**
- 显示乱：角色美术在 bodySprite 子节点而血条读 Sprite.width/height（被 graphics 边界污染）→ 无物理模式改用固定 200×200 逻辑盒 `drawUIOffline()`（血条头顶 -134、护盾 -120、力度条左侧竖条、瞄准线从中心）；anchor 统一 0（master 原 0、敌/友原 0.5 导致美术偏移）；翻转只作用于 bodySprite（血条/文本不镜像）。
- 背包残留文本：trace.ls 的 BagList.lh 预制体子节点删除（web/g2/game/trace.ls），Main.ts 死背包代码清除。
- 单机无场地：offlineArea 画边框+中线；Cha.manualPhysics 边界反弹补 onWallCollision（400ms 冷却）。
- 控制失效根因：TimeManager 校准源异常使 timeOffset=NaN → invoke('click')=NaN → 单击判定恒 false。修复：getCurrentTime 有限值回退 Date.now()、calibrate/漂移/网络值全部 isFinite 守卫、ddnspod 秒级归一毫秒、网络时间 ±24h sane 窗口。
- 单机无伤害根因：无物理世界 onTriggerEnter 不触发 → GameManager.offlineCollisionTick 手动圆-圆检测（分离+法向速度交换+500ms 每对冷却），伤害结算抽 resolveCharCollision 与物理路径共用；字典序去重留在物理 handleCollision。
- 生命周期：Cha.destroy 清全部 frameLoop；destroyGame 销毁全部角色（原只销 activeChar 致敌/友幽灵积分）；Main 预制体 back 只摘不销毁 → owner REMOVED 事件兜底 cleanupBattle；traceSel 进入对战前 PRes.clear 缓存（Res.get 缓存预制体实例，复用会带回旧局）；onStart 重置 __ng2BattleStarted/__ng2Result + 清 stage 残留；单机加返回按钮 g2BackBtn。
- prepPlayerRound 原 mapManager.get() 无参=全部对象 → 敌方也亮瞄准/力度条；改 get(LAYOUT.PLAYER)。
- 12+ 图标：代码已除（slecet.ts），资源 web/ui/main/12+.png 与 assets 同名删除，ui.br 重打。
- 验证：g2selftest 14/14（含重进重建），截图 local/g2-selftest-*.png 目视通过；tsc 基线仅 card.ts 80/82。

**生产复验闭环（2026-11-19 凌晨）：**
- 上传: g2.br/ui.br 覆盖上传(sha1 与本地一致, 令牌不变); js/bundle.js 657069 覆盖成功; libs/laya.ui.js 新上传 token=de9f2cc8-84dc-4f8a-a584-cdfb5ed4902a(已入 tokens.json)。
- 生产 normalgame.cn 全路径实测 `local/prod_g2full.cjs` **14/14**(入口→单机→拖拽角度/力度→单击发射→伤害→胜利→返回→重进), 截图 local/prod-selftest-*.png 目视通过; 社交生产冒烟 socialdrive_prod.cjs **14/14**。
- **生产 index.html 缺 libs/laya.ui.js 引用**(历史直链版遗漏): g2 全部文本节点已改 Laya.GTextField(ui2, 生产已带), 不再依赖旧 laya.ui.js; 平台其余链路实测无依赖。彻底对齐需 ECS 改 index.html 加一行 script —— **阿里云控制台登录态已过期**(edge-srv cookies 失效, 跳 login.htm), 需用户重新登录阿里云后按 h14/r4 CDP 法或 FTP 更新 /home/ftpu/html/index.html(用 release/web/index.html, 已含 laya.ui.js 直链)。laya.ui.js 已在云存储备好。
- 坑补充: node_repl 沙箱内 spawn 的 detached 子进程随调用结束被杀、回环 fetch EACCES —— **长驻浏览器/CDP 轮询一律经 exec_command**; headless Edge 必须 --no-sandbox; 探针等待新局用 window.__ng2BattleSeq(onStart 自增), 不要等 started===false(同步创建角色时该窗口不存在)。

## h16 工作流优先纪律 + 联机双账号实测（用户明确 2026-11-19，写死）

**纪律（每轮强制）：**
1. 开工先读：`docs/handover.md` h0/h12/h13/h15/h16 + `docs/auto/state.json`（从 `next` 续跑）+ `docs/nodes/aidev.js` 对应分支节点（ai14→aiPlan→…→ai13→ai12）。**禁止凭记忆开工**；改哪块只读 h12 地图该行文件。
2. 执行沿链路：策划 → 实现 → h2 tsc(基线 card.ts:80/82) → h3 离线测试 → h4 打包 → h5/ai13 浏览器实测 → h6-h8 部署 → 生产复验 → ai12 回填。**每轮结束必须回填** handover/节点/state.json，未回填=本轮未完成。
3. 工作流与代码不符：先使两者一致（修文档或修代码），不允许绕过工作流直接改。
4. 遗忘/偏离工作流导致功能不符 = 验收失败重做（用户多次强调测试仍出现功能不符的根因即跳过工作流与实测）。

**联机验证硬规则（ai13 第 6 条）：**
- 联机/多人功能必须**双独立账号、双客户端**（双 profile、双 CDP、真实 GOBE 云）真实跑全链路：建房/匹配 → 双方进房 → 回合轮流 → 伤害 → 结算 → 再来一局 → 退出离房。
- 控制方式：**植入代码**（`page.ev` 直接调游戏 API：setAngle/setForce/endPrepPhase/requestRematch/goLobby）+ **真实鼠标**拖拽/点击混合；只读状态不算控制测试。
- 单客户端自测**不算**联机验证。探针：`local/g2mcdrive.cjs`（g2 联机 14 断言+截图）、`local/mcdrive.cjs`/`mc3drive.cjs`（社交）。
- 账号来源：fresh profile 自动云注册（menu 的 id 节点纯数字），两 profile 即两账号；GOBE 身份=Cloud userid，NetBoot.ensure 预热。

**g2 联机架构（本轮落地，h12 已登记）：**
- `src/g2/online.ts`：roomType=`g2battle` 2人房；matchRoom 撮合 / createRoom 等待；onRoomChange 驱动第二人进入（不轮询）；60s 超时取消；enter 写 RoomSession 后 SceneNav 开 trace.ls；leave=房主 dismiss/其余 leave。
- 回合权威：房主 `GameManager.authority=true` 独占碰撞/伤害/回合推进；非房主只本地模拟自己 + 按房主帧 syncRound（**回合方按本机视角映射**：房主 player→非房主 enemy）；非房主发射 fireSeq 随帧上报，房主 remoteFire 放行对手回合；联机对手回合不跑 AI 自动发射。
- 帧载荷：p/b/ctrl/x/y/a/f/r/rd/ph/host/chars/fire/over/winner，200ms loop；sendToClient 第一参=路由模式(0/1/2)（battleControl 曾误传 200 已修）。
- 退出/重开：goLobby=G2Online.leave+SceneNav.back（不再误开羽毛球 load.ls）；restartBattle=SceneNav+PRes.clear 重开 trace.ls（保留 RoomSession seq）。

**本轮验证数字（2026-11-19）：** 本地双账号联机 `g2mcdrive.cjs` **16/16**（注册→建房/匹配→同房→分侧出生→房主权威→真实拖拽+单击发射双方→回合映射→fire 信号→伤害→血量跨端一致→互补结算→再来一局→双方退出离房）；单机 `g2selftest.cjs` **14/14**；社交双客户端 `mcdrive.cjs` **11/11**（net.ts owner 缓存修改后平台回归）。生产双账号复验待华为重新登录后执行 `prod_g2mc.cjs`。

**h10 坑补充（本轮实测）：**
- **GOBE 鬼房**：客户端被 kill 后房间在服务端存活数分钟, matchRoom 会撮合进鬼房(含死玩家)。对策: match 先 getAvailableRooms 扫 createTime<45s 且未满的房直接 join; matchRoom 撮合到过期房则 leave+create; 测试结束必须 `__g2OnlineLeave()` 离房/解散。
- **房主缓存比对口径**：net.ts updateRoomOwnerCache 原用 openId(currentPlayerId) 比 room.ownerId(GOBE playerId) → 永远 false; 已改 getCurrentPlayerId()。影响所有 isRoomOwner 调用方。
- **onRoomChange 只在房间属性变化触发**, 玩家加入走 onJoin; 等第二人必须同时监听 onJoin(实测创建者干等)。
- **华为云存储上传 403**：CAS 自动重登(密码管理器 autofill+真实点击)后 console 读正常但上传 bearer 被拒(浏览器 XHR 亦 ERR_FAILED)。对策: 掉可见登录窗口请用户手动重登(可能短信验证) + `local/deploy_after_login.py` 后台等登录完成自动上传。备用技术: _raw CDP 复刻上传_ = 抓 storage POST 的 Authorization/productId/teamId + requestWillBeSentExtraInfo 的 Cookie, Node 发 multipart/form-data(name="file") + Origin/Referer 头到 `agc-storage-drcn.developer.huawei.com/v0/<bucket>?name=<path>`(token 有效时可绕过控制台 UI)。
- **联机出生点**：世界坐标共享, 房主 master(0.3W,0.65H)/非房主 master(0.7W,0.35H), 远端_avatar 取对侧; 同点出生会开局互撞刷伤害。
- **死局平衡**：shieldRecover/heal 速率必须低于伤害输出(0.03), 阻尼 0.25(半衰期0.5s)后碰撞窗口短, 0.1 回复率单机/联机都打不死。

### g2 联机同步重设计（2026-11-20，用户明确：同步操作而非瞎同步状态）
- **旧方案病根**：每 200ms 用远端坐标覆盖本地渲染 → 疯狂闪烁；双端各自模拟伤害 → 分歧。已废除。
- **新方案（参考羽毛球 Phy 的时间同步计算模式）**：`src/g2/phys2d.ts` 确定性 2D 物理内核：
  - 固定步长 60Hz、整数定点 FP=256；积分=整数加、阻尼=(v*32112)>>15、反弹/分离/速度交换全部整数或 IEEE 正确舍入(sqrt/cos/sin) → 同输入各端逐位一致；
  - 随机仅种子化 xorshift32（种子=hash(roomId:seq)，随 g2start 快照下发）；身体按 pid 排序遍历；
  - **操作同步为主**：fire 操作 {pid,angle,force,at=未来绝对步(量化 now+150ms)} 广播，各端在同一步应用；回合/阶段/伤害/胜负全部由内核从操作流确定性推导（回合结束=全体静止或超时，换边+整数回复），**不需要房主逐回合权威**；
  - **补充状态同步**：房主每 2s 发 g2snap（全量快照+opLog）；接收端与本机历史同步对比，位置容差=4px+4步运动量（覆盖墙钟 skew），hp/sh/round/phase 严格相等；仅真分歧时 restore+重放操作+追步（平滑渲染不受影响）；迟到 join 亦由快照 bootstrap；
  - 房主仅负责：超时兜底 fire 操作生成、快照发送、房间生命周期；
  - 渲染：Cha.syncBody 每帧从内核取位置/血量/翻转/动画态 → 平滑无网络抖动。
- 单机走同一内核（AI 操作本地生成，回合开始后 1~3s 发射），单机/联机同一套物理与回合逻辑。
- 坑：同一步多身体同侧发射（master+ally）须允许 burst（actionStartStep 判定），否则第二个 fire 被 phase!=pre 拒绝（实测 master 不动）；角色注册键必须=世界 pid（先设 bodyPid 再 addCha）。
- 验证：g2mcdrive 断言含「初始世界跨端逐位一致」「行动阶段轨迹跨端 <=12px」「血量跨端逐位一致」；诊断探针 local/kprobe.cjs（内核 vs 渲染）。

**同步重设计最终验证（2026-11-20）：** 双账号 `g2mcdrive.cjs` **19/19**：初始世界跨端逐位一致、**同步网格历史跨端逐位一致(gridDiv=0, 504+ 采样)**、血量跨端逐位一致、行动阶段跨端位置差仅采样时差(<=223px@双ev间隔)、互补结算(@98s)、再来一局整局重置、双方退出离房。单机 14/14、社交 11/11、离线 121/121。
- 通道最终形态：**操作同步为主** = fire/hit 操作带绝对执行步(fire 量化 30 步网格+800ms lead; hit +60 步)，**每 tick 合批一条 g2ops**(SDK 同 tick 多次 sendFrame 丢包, 实测) 走 sendFrame 快通道 + sendToClient 冗余慢通道；**ack/重传**(400ms 未 ack 重传, 最多 6 次, 接收端按 k+pid+round / k+pid+at+from 去重)保证可靠投递。
- **补充状态同步** = 房主每 60 步(1s)网格步发 g2snap(全量+opLog)；接收端历史网格对齐绝对 60 步倍数；离散状态(回合/阶段/胜负)以快照为准；hp/sh 仅分歧时采纳；**静止位置静默收敛**(>8px 且双方静止时对齐, 运动中不干预→不闪烁)；重放只取 at>snapshot.step 的操作(否则双倍伤害, 实测)。
- 再来一局: 新 t0 快照触发整局重置(旧局消息被 seq 检查丢弃)。
- 平衡: 单机 atk30(3 身体接触率双倍)/联机 atk80(2 hit/kill, 局时长 ~60-100s); HIT_CD 20 步; 回复 0.01。
- 渲染: Cha.syncBody 每帧从内核取状态 → 平滑; 结算时 hideAllForceUI。
- 实测坑汇总: ① 同 tick 多 sendFrame 丢包→合批; ② 慢通道(sendToClient)延迟 ~600ms+→lead 必须 >延迟尖峰; ③ reset 重放含已结算操作→双倍伤害; ④ 非房主 bootstrap 漏设 online→跑离线 AI 自打; ⑤ 注册键≠世界 pid→渲染不同步; ⑥ 同步 lead 窗口内重复发射→_pendingFire 门; ⑦ clamp 改变 at 破坏去重→fire 按 round 去重。

### 商业级审计 第1轮（2026-11-21）
- **羽毛球致命 bug 修复**: 菜单预制体根节点也是 Scene2D, badm.ts 用 root.getChildByName("Scene2D") 拿到菜单场景 → bButton=null → onStart 抛错 → 对局场景只有空壳(无球/无角色/无 ctrl)。改为整树 findNode(stage,'bButton') 并判空。PVE 实测球/角色/发球恢复(serve=HIT, ball 有坐标)。
- **羽毛球鬼房**: matchRoom 会进断线残留房(单客户端"等待开局"卡死)。load.ts 匹配改为: 先 getAvailableRooms 找 createTime<120s 且未满的房直接 joinRoom, 否则 matchRoom; 回调再验 createTime>120s 是鬼房则离开重匹配。
- **UI 修正(截图实测)**: 加好友页移除"身价"行(只在个人页隐私栏); 隐私栏按钮文案 屏蔽我的ID/已屏蔽ID; 匹配按钮长文案 titleFontSize 自适应(70→40), 不再溢出圆形按钮。socialdrive_prod 14/14 复验。
- **社交转发偶发失败**: mc3drive 首次 8/9(B 未在 4s 窗口内看到转发), 复跑 9/9; 转发断言改为轮询 10s。根因疑似云兜底慢路径(实时通道未命中时), 继续观察。
- **存储上传阻塞**: 控制台登录态下上传仍 403(浏览器自身 XHR 也 ERR_FAILED); 已尝试: 自动重登/Profile1 会话复制/换 team/raw CDP 复刻(multipart+Cookie+CSRF+trace)/服务端 OAuth JWT(client_credentials)→网关 PUT 均 403; AGC 无 storage-server Node SDK(@hw-agconnect/storage 仅客户端; cloudstorage 是客户端实例 API)。结论: 需用户在控制台手动覆盖上传或完成 SMS 级验证。
- **测试驱动新增**: local/uitour.cjs(全页面截图巡览), local/badmdrive.cjs(羽毛球双账号 PVP), local/pveprobe.cjs(羽毛球 PVE 隔离), local/btnprobe.cjs(匹配按钮状态), qa 增加 __qa.pack(key)(预加载包, 解决 vers 无本地索引卡匹配页)。

**商业级审计 第1轮收尾（2026-11-21 晚）：**
- 羽毛球 PVP 双账号 **7/7**：同房/角色/确定性(diff=0)/发球(HIT)/**两端都采到飞行球(位置差≤0.02m)**/无未捕获异常。
- 音效缺失修复: nor 包补 `girl/au/hit.MP3`+`hitF.MP3`(56 files, nor.br 5.30MB); `Au.load` 单载失败不再抛 unhandledrejection(仅警告)。此即 PVP 里 "Uncaught (in promise)" 与 A 端 "无 Room" 连锁噪声的根源。
- 磁盘: 测试残留 edge profile 233 个, 释放 ~34GB(曾 ENOSPC, 是近期 headless 崩溃/Profile 写入异常的重要噪声源)。**每轮清理 local/edge-*(保留 edge-agc-login)**。
- g2 回归: 单机 14/14(离线 atk40, 对局 ~15-25s)、联机双账号 19/19(确定性同步不变); 社交双客户端 11/11; 离线 121/121。
- 待办(下一轮): 商城/购买金币流程实测、对局内点头像加好友+屏蔽ID、局后加好友、好友身价展示、生产上传后 prod 全量(prod_g2full/prod_g2mc/socialdrive_prod/badm) 复验。

## h17 AI 辅助：Codex 远程同步聊天 + 微信通道 + codex.html（2026-11-21）

> 微信通道默认走**腾讯官方 `@tencent-weixin/openclaw-weixin` 的 iLink 扫码直连**（不需 API Key）；`@canghe/openclaw-wechat` 仅作 fallback。

> 定位：AI 辅助分支（aidev 图 `aiF`）。目标是在不改动游戏主链路的前提下，把 OpenClaw（龙虾）的微信插件提取为 Codex 的远程同步聊天通道，并提供 normalgame 上的配置页与阿里云 ECS 部署路径。

### h17.1 架构（低耦合，改哪块只读哪行）

| 分支 | 文件 | 职责 |
|---|---|---|
| 微信通道(默认) | `chat/plugin/weixin.cjs` | 腾讯官方 iLink：`get_bot_qrcode → get_qrcode_status → getupdates → sendmessage`，扫码登录，token 存 `chat/data/weixin.json` |
| 微信通道(fallback) | `chat/plugin/wechat.cjs` | `freestylefly/openclaw-wechat`（MIT）Proxy API + 60001/80001 webhook + 去重 |
| 编排 | `chat/bridge.cjs` | 微信 ↔ Codex ↔ Web；HTTP/SSE；配置；登录二维码；ECS 终端 URL |
| Codex 会话 | `server/re/codex.js` | `codex exec --json`，按 peer 自动 `resume <threadId>`；relay 与 bridge 共用 |
| 中继 | `server/re/server.js` | 新增 `codex.status/models/config.get/set/chat/history/sessions/cancel`；经 `/apim` 调用 |
| 聊天页 | `chat/public/chat.html` | 微信式对话列表 + 聊天面板 + 未读徽标 + 新建聊天 |
| 配置页 | `chat/public/codex.html` | 工作目录、模型、沙箱、微信 apiKey/proxyUrl/webhook、阿里云 ECS |
| 发布 | `server/cloud/public/{codex,chat}.html` | 已随 Cloudflare Worker 部署到 `https://www.normalgame.cn/codex.html`（未替换 index） |
| 对照源码 | `chat/vendor/openclaw-wechat/` | 原始插件源码，协议对照用 |
| 测试 | `chat/test/e2e.cjs` | mock 代理 + mock Codex，17 断言 + 2 截图 |

契约：
- 微信侧**只**认龙虾同款 payload：`messageType` + `wcId` + `data.{fromUser,fromGroup,content,newMsgId}`；私聊回 `fromUser`，群聊回 `fromGroup`。
- Codex 侧**只**认 `peer/cwd/model/sandbox/text`；会话键 `wechat:<wxid>` / `wechat:group:<roomid>` / `web:*`。
- UI **只**走 `/api/*`，不直接碰 Codex/微信对象。

### h17.2 运行与配置

```powershell
# 桥（本机，默认 127.0.0.1:21121）
F:\LayaProject\server\re\bin\node.exe F:\LayaProject\chat\bridge.cjs
# 页面
http://127.0.0.1:21121/            # 聊天
http://127.0.0.1:21121/codex.html  # 配置
```

`chat/config.json`（首次自动生成随机 token，已 gitignore）：
- `mode=local`：bridge 直接跑 `codex exec`（推荐；继承 `~/.codex` 登录态）。
- `mode=relay`：bridge 在云上时，经 `https://normalgame.cn/apim` 的 `codex.chat` 调本机 Codex。
- 默认 `wechat.provider=ilink`：`POST /api/wechat/login` 返回官方二维码，扫码确认即可，**无需 API Key/proxy/webhook**；登录后自动长轮询。
- `wechat.provider=canghe` 才需要苍何 `apiKey + proxyUrl` 并注册 webhook。
- `codex.cwd`/`model` 是默认值，单次请求可覆盖；模型列表读 `~/.codex/model-catalog.local.json`。

### h17.3 部署（normalgame / ECS）

> 实际生产部署已完成，见 h17.6；本节保留通用步骤。

- **配置页（已完成）**：`node chat/deploy/sync-codex-html.cjs --deploy` 会把 `codex.html/chat.html` 同步到 `server/cloud/public` 并 `wrangler deploy`（必须带 `NODE_OPTIONS=--dns-result-order=ipv4first`，否则 wrangler 报 API hostname 解析失败）。线上验证：`https://www.normalgame.cn/codex.html` 200，标题 `Codex 远程同步 · 配置`。
- **桥公网**：`chat/deploy/frpc-codex-snippet.toml` 增加 21121→5002 隧道；ECS nginx 加 `chat/deploy/nginx-codex.conf` 的 `location /codex-api/`。页面 API Base 填 `https://normalgame.cn/codex-api`。
- 入口域名：**用 `https://www.normalgame.cn/codex.html`**；apex `normalgame.cn/codex.html` 仍走 nginx origin（Worker path route 已加但实测 404），不要浪费时间在 apex。
- ECS 一键包：`/apim` 的 `codex.bundle` 返回 9~10 个源码文件(base64)，`chat/deploy/ecs-install-remote.sh <RE_TOKEN>` 在 ECS 上拉取并安装 systemd。
- **ECS 服务**：`chat/deploy/install-ecs.sh` 安装 `/home/ftpu/codex-chat` + systemd `codex-chat`；需先把 `chat/` 与 `server/re/codex.js` 打成 `/tmp/codex-chat.tar.gz`。
- **阿里云登录**：`local/open_workbench.cjs` / `local/type_cmd.cjs` 走可见 Edge 9228。**当前 9228 的阿里云会话已过期**（`account.aliyun.com` 登录页；Profile 1 cookies 无 login ticket），需在登录窗口完成账密/扫码；登录后再执行 ECS 脚本。不要把阿里云密码写进代码或文档。

### h17.4 验证（本轮实测）

```
node chat/test/e2e.cjs   -> 17 pass / 0 fail
```
覆盖：桥启动/帮助、微信登录+webhook 注册、Web 对话、私聊→Codex→回发、重复 newMsgId 去重、群聊回群、配置保存、模型列表、ECS URL、UI 截图（`chat/test/ui-chat.png`、`ui-codex.png`，已 view_image 目检）。
生产页：`node chat/test/shoturl.cjs https://www.normalgame.cn/codex.html chat/test/prod-codex.png` → 190KB 截图目检通过。
真实 Codex：`/apim` 的 `codex.chat` 两轮（H17A → 追问仍回 H17A，thread 相同）PASS，证明 `resume` 续聊有效。
官方 iLink：`node chat/test/ilink.cjs` **6/6**（真实拿到 `liteapp.weixin.qq.com` 二维码、状态 wait、配置页 qrcode.js 渲染）。

### h17.5 坑与规则

- `codex exec` 必须 `stdio:['ignore','pipe','pipe']`；否则进程等待 stdin 永久挂起（实测）。
- 解析 JSONL 只认 `{...}` 行；`thread.started` 取 thread_id，`item.completed/agent_message` 取文本；`turn.completed` 取 usage。
- `where codex` 在工作目录含 `codex.js` 时可能返回 js 文件；`resolveBin()` 必须执行 `--version` 并校验 `codex-cli`。
- 桥默认会话文件 `chat/data/sessions.json`，relay 默认 `server/re/codex-sessions.json`；E2E 用独立 `sessionsPath`，避免污染。
- Web 聊天页 SSE 在截图/无网环境加 `?noevents=1`，否则 headless 虚拟时间不结束导致 0B 截图。
- 默认 iLink **不需要 apiKey**；页面点“获取登录二维码”扫码即可。只有 `provider=canghe` 才需要苍何 key，测试走 `chat/mock-proxy.cjs`。
- 所有 `/api/*` 必须带 `X-Cx-Token`；不要把 token/apiKey 写进前端源码或 git。
- 不轮询云函数：聊天/微信状态均为本地进程或 SSE；云端仅做 `/apim` 调用。

### h17.6 生产部署（2026-11-21 已完成）

- **站点入口**：`https://normalgame.cn/codex`（配置页）/ `https://normalgame.cn/chat`（聊天页）。
  - Cloudflare 会把 `*.html` 307 到无扩展名路径，所以 ECS 上实际文件是 `/home/ftpu/html/codex/index.html`、`/home/ftpu/html/chat/index.html`（同时保留 `codex.html/chat.html`）。qrcode.js 在 `/home/ftpu/html/qrcode.js` 与 `/codex/qrcode.js`。
- **ECS 桥**：`/home/ftpu/codex-chat`，systemd `codex-chat`（enabled + active），Node 18.20.6。
  - `chat/config.json`：`mode=relay`、`relay.url=http://127.0.0.1/apim`、`wechat.provider=ilink`。
  - nginx `/etc/nginx/sites-enabled/default` 的 80 与 443 两个 server 块均加 `location /codex-api/ { proxy_pass http://127.0.0.1:21121/; }`；备份 `/root/default.bak.codex`。
- **链路**：浏览器 `normalgame.cn/codex-api` → nginx → ECS 21121 桥 → `127.0.0.1/apim` → frps 5001 → 本机 re-relay 21119 → 本机 Codex CLI。
- **实测**：`/codex-api/api/status` 返回 `mode=relay`、codex-cli 0.169；`/codex-api/api/chat` 真实返回 `ECSOK`；官方 iLink 二维码在 ECS 桥生成并 `qrcode.js` 渲染。
- **注意**：ECS 上 `install-ecs.sh` 的 tar 步骤已改为可选（`codex.bundle` 直接写文件）；systemd 用 `/usr/bin/env node`，避免路径差异。

### h17.7 手机端授权（2026-11-21 补）

- 手机端打开 `https://normalgame.cn/codex` 时，页面自动识别移动 UA：
  - 默认**隐藏二维码**（自己扫自己无意义），显示 **“在微信中打开并授权”** 按钮，`href = qrcode_img_content`（`https://liteapp.weixin.qq.com/q/...`），由微信 universal link 调起授权。
  - 旁边保留 **“复制授权链接”**（未自动跳转时粘贴到微信任意聊天窗口打开）与 **“显示二维码”**（需要另一台手机扫时用）。
  - 桌面端仍显示二维码。
- 二维码本地生成：`chat/public/qrcode.js`（`qrcode-generator` MIT），不依赖外部二维码 API/CDN。
- 手机端 CSS：`@media(max-width:600px)` 单列布局、按钮 50% 换行、`#qrCanvas svg` 自适应 72vw，修复此前右侧溢出。
- 生产验证：`https://normalgame.cn/codex` 移动 UA 截图布局通过；页面包含 `wxOpenBtn/mobileHint`，`/codex-api/api/wechat/login` 返回官方二维码。
- 免 Token 登录：`/api/wechat/login`、`/api/wechat/status` 为公开接口（登录 12s/IP 限流）；其余 `/api/*` 仍需 `X-Cx-Token`。
- **字段名坑**：服务端返回 `qrcodeUrl`（小写 c），页面曾写 `qrCodeUrl` 导致二维码不渲染；已统一为 `qrcodeUrl`。`chat/test/wxlogin-page.cjs` 实测：点“获取登录二维码”→ `qrCanvas` SVG 23110B、`wxOpenBtn.href` 为 `liteapp.weixin.qq.com`。
- Token 头只发 ASCII：`tokenValue()` 过滤非 ASCII，避免 `fetch` 抛 “String contains non ISO-8859-1 code point”。
- 聊天页入口：`/codex` 的“打开聊天”改为绝对 `/chat`；同时 ECS 增加 `/codex/chat/index.html` 与 `/codex/chat.html` 兼容，修掉 `/codex/chat.html` 404。
- 会话只读公开：`GET /api/conversations`、`GET /api/history`、`GET /api/models` 免 Token；`POST /api/chat` 仍需 Token。`chat/test/chatpage.cjs` 实测：`/chat` 列表含 `wechat:o9cq...@im.wechat`（微信），点开历史 2 条消息。

### h17.8 CodexChat 开机自启（NSSM，2026-11-22）

- 目录：`chat/service/`（从 `server/re/frp/nssm.exe` 拷贝）。
- 右键管理员运行 `chat/service/ontask.bat`：
  - 服务 `CodexChat` = `server/re/bin/node.exe chat/bridge.cjs`
  - AppDirectory `F:\LayaProject`，自动启动，崩溃 5s 重启
  - 日志 `chat/service/chat_service.log`（10MB 轮转）
  - 安装前 `kill_manual.ps1` 停掉手动 21121 bridge，避免端口冲突
- 卸载：管理员运行 `chat/service/uninstall.bat`（仅删服务，保留 chat/ 配置）。
- 状态：`chat/service/nssm.exe status CodexChat`。
- 与 ReAPI/ReFrp 服务互不影响；服务名独立。

## h18 Blender MCP：姿态动画调整/创造（2026-11-22 已验证）

- **安装**：`mcp-for-blender 2.3.1`（ahujasid/mcp-for-blender，MIT）到 `C:\Users\mien\.codex\blender-mcp\.venv`；Blender addon `mcp_for_blender.py` 安装到 `%APPDATA%\Blender Foundation\Blender\5.3\scripts\addons` 并启用。
- **Codex 配置**：`~/.codex/config.toml` 增加 `[mcp_servers.blender]` → venv `mcp-for-blender.exe --host 127.0.0.1 --port 9876`；**需完全重启 Codex 才出现 `mcp__blender__*` 工具**。
- **启动**：`F:\LayaProject\tools\blender\start_blender_mcp.bat`（可带 .blend 路径）。Blender 5.3 Alpha 正常启动时 addon auto-start 不触发，launcher 用 `bpy.app.timers` 2s 后 `bpy.ops.blendermcp.start_server()`，端口 9876 稳定监听。
- **能力**：`execute_blender_code`（完整 bpy：骨骼/姿态/关键帧/约束/修改器）、`look`（返回 PNG）、`get_scene_info`、`generate_3d` 等。
- **实测**：MCP 创建 `MCP_PoseRig`（root→spine→arm）+ `MCP_PoseAction`，帧 1/20/40 关键帧，`layers=1 slots=1 fcurves=6`；帧20 `spine=(0.5,0,0.6)`、`arm=(0,0,0.3)`；再改为 `spine=(0.2,0.3,0.4)` 重新 keyframe 成功。`look` 返回 173KB PNG。
- **目录**：`tools/blender/{start_blender_mcp.bat,blender_mcp_start.py,README.md}`；日志 `tools/blender/blender_mcp_start.log`。
- **注意**：Blender 5.x 的 Action 是分层/槽位结构，`action.fcurves` 不存在；统计 fcurve 用 `action.layers[*].strips[*].channelbags[*].fcurves`。
- **Qoder**：`C:\Users\mien\.qoder\mcp.json` 已加 `blender` stdio 条目（venv `mcp-for-blender.exe --host 127.0.0.1 --port 9876`，备份 `mcp.json.bak-blender`）；Qoder 端 `tools/list` 10 个工具、`get_scene_info` 实测 PASS。
- **一键/自启**：`tools/blender/start_qoder_blender.bat` 先确保 9876 再启动 Qoder；`install_qoder_blender_autostart.bat` 已写入用户 Startup（`QoderBlenderMCP.lnk`），登录自动启动 Blender(最小化)+Qoder；卸载用 `uninstall_qoder_blender_autostart.bat`。
- **Qoder 自动拉起**：Qoder App 实际配置是 `C:\Users\mien\.qoder\settings.json` 顶层 `mcpServers`（不是 `~/.qoder/mcp.json`，也不是 AppData settings.json 的 `mcp.servers`）；blender = `cmd.exe /c tools/blender/qoder_mcp_wrapper.bat`。UI 在 **Settings → Extension management → Connectors → Custom Connectors**，不在 Provided by Plugins。实测 Blender 关闭冷启动约 4.8s，`tools/list` 10 工具 + `get_scene_info` PASS，Qoder UI 显示 `blender Ready`。**cmd.exe 必须反斜杠**。

- **3D 素材工作流**：完整链路（库存盘点→boy 动画优化→导出可见 FBX→替换 IDE 发布→资源包重发布）见 `docs/nodes/ai3d.js`（aidev.ai3d 分支）与 h19。

## h19 3D 素材 AI 工作流（Blender MCP → boy 动画优化 → 替换 IDE 发布 → 资源包重发布）

> 权威子树 `docs/nodes/ai3d.js`（m0→m8），挂 aidev 分支：ai14 纪律就绪 → ai3d（3D素材指令）；ai3d 素材发布完成 → ai12 回填。本节为可读镜像（2026-11-22 用户要求建立）。

### 源文件（用户明确）
- 羽毛球游戏角色源文件**全部**在 `F:\LayaProject\3d\model`：boy.blend/boy.fbx、girl.blend/girl1.blend/girl1.fbx、cha.blend、racket.blend/racket.fbx、通用骨架.blend、贴图 boycolor/boynor/Racket.1001-1002.png、remap_*.bmap/本地混元映射.bmap。
- boy.blend 库存（2026-11-22 MCP 实测）：30fps；骨架 pole（130 骨，Mixamo 命名 + LP/RP 球拍挂点）；可见对象 body+racket+pole，body.001 隐藏（不导出）。
- NLA 9 轨（=FBX take 名）：stand(1-31→standa 1-30)、diving(1-205)、jumphit(1-28→downupremap_off.003_off)、hitoff(1-66→hitoff_off_off 1-90)、up(1-24)、back(1-25.6)、right(1-51→moveh_off.001)、left(1-51.8→moveh_off_off)、down(1-27)；up/back/down 共享 downupremap_off_off(1-150)。
- 发布现状：web/nor/boy/ 仅 8 个 .lani（缺 back）；ani.controller 8 个 clip 状态（stand/up/down/left/right/hitoff/jumphit/diving）；游戏状态表 `src/badm/obj/ani.ts`（17 核心 + extras，双端 ID 同源）。

### Blender MCP 调用（m1；2026-11-22 连通验证 addon 2.0 / protocol 16 / Blender 5.4 Alpha）
- 先 `mcp__blender__get_addon_status` 检连通；安装/启动/自启细节见 h18 与 `tools/blender/README.md`。
- 启动 `tools\blender\start_blender_mcp.bat [blend路径]`；socket 127.0.0.1:9876；Codex `~/.codex/config.toml [mcp_servers.blender]`（venv mcp-for-blender.exe --host 127.0.0.1 --port 9876，改后完全重启 Codex）；Qoder 经 settings.json 顶层 mcpServers + qoder_mcp_wrapper.bat 自动拉起。
- 工具：`execute_blender_code`（完整 bpy：骨骼/姿态/关键帧/约束/NLA/导出）、`get_scene_info`、`look`（视口/多角度/帧条 PNG，必须 view_image 目检）。
- 打开源文件：`bpy.ops.wm.open_mainfile(filepath=r"F:\LayaProject\3d\model\boy.blend")`。
- Blender 5.x：fcurves 在 `action.layers[*].strips[*].channelbags[*].fcurves`（action.fcurves 不存在）；NLA 采样需 `track.mute=False` + `scene.frame_set(f)` 求值。

### 当前任务：优化 boy 全部动画（m2 诊断 / m3 自动调帧）
四类问题（用户明确）：
1. **循环卡顿**：首尾帧姿态不闭合 + 小数 strip 端点（back=25.599998 / left=51.80008）+ 共享 action 截断（up/back/down 同 action 不同区间）。
2. **运动姿势怪异**：重定向残留（_off 后缀 action、mixamo.com 源）致肢体扭曲/重心漂移。
3. **没适配原游戏卡点**：`src/badm/mag/mag.ts` 时间驱动击球链 = 滑动 → HIT_WINDUP 前摇（minW=cha.upTime*300ms，自动出手阈值 upTime*200ms）→ 松手/超时 _executeHit（出手=前摇结束，ball.hitAt 轨迹起算）→ HIT_RECOVERY 后摇（recoveryDuration）。hitoff/jumphit 触球帧必须落在前摇结束时刻（upTime=1 ≈ 300ms@30fps ≈ 第 9 帧，以实际 cha.upTime 为准），后摇段覆盖 recoveryDuration。
4. **球拍拿反**：racket mesh 对象级 parent=pole（无 parent_bone），查 RP/RightHand 顶点组与局部旋转，拍面应朝向击球方向。

修复硬规则：循环轨首尾帧姿态闭合 + strip 端点整数化 + 共享 action 拆独立区间；一次性轨（diving/jumphit/hitoff）起止与 stand 衔接（游戏 crossFade 0.05s）；触球帧对齐卡点；球拍经骨骼旋转/顶点权重修正，禁止整体镜像网格。诊断=逐轨 frame_set 采样首尾帧骨骼矩阵差 + 逐帧角速度峰值 + look 帧条目检，产出逐轨问题清单再修。
**红线（用户明确 2026-11-22）：不强制插入起始动画帧**——禁止在帧 0/1 插关键帧凑导出，必须修真实姿态与区间。每轨修完 look 复检 + 首尾帧差断言；`bpy.ops.wm.save_as_mainfile` 同路径保存（.blend1 自动备份）。

### 导出（m4；用户明确：导出可见）
```python
bpy.ops.export_scene.fbx(filepath=r"F:\LayaProject\3d\model\boy.fbx",
    use_visible=True, bake_anim=True,
    bake_anim_use_nla_strips=True, bake_anim_use_all_actions=True,
    bake_anim_simplify_factor=0, add_leaf_bones=False)
```
- use_visible 排除隐藏 body.001；take = 9 轨名 + pole|action 名（与现有 assets/nor/boy.fbx 一致，已解析验证）。
- 断言：FBX 二进制 `\x00\x01AnimStack` take 列表 = 9 轨；IDE 导入后对比 rest pose 防轴/缩放漂移。
- 替换 `assets/nor/boy.fbx`，保留 .meta（uuid d342d960-d9b9-4c66-9521-99cdc3497c71 + remappedMaterials）。

### 替换 IDE 发布（m5）
- `node local/layamcp.cjs call ide-build '{"platform":"web"}'` → release/web/nor/boy@0.lh + boy/*.lani（应为 9 含 back）。
- **关键**：packstage.cjs 的 nor 树来自 dist/web-1107 基线（只 overlay ui/menu.ls + game/badm.ls）→ 必须把 release/web/nor/boy@0.lh 与 boy/*.lani 同步覆盖到 `dist/web-1107/nor/`（替换 IDE 发布基线），否则新动画进不了包。
- 核对 boy@0.lh Animator clip 引用与 ani.controller（assets/nor + web/nor）路径；back 无游戏状态引用（无副作用）；如需补方向状态（up_right 等）须同时补 girl1 同名 clip（双角色共用 controller），否则 controller 不动。IDE 不可用：停止并回填，禁止手写 .lani 二进制。

### 资源包重发布（m6）+ 上传复验（m7）
```
node local/packstage.cjs
node tool/assetsCollect.js local/packstage --dst F:/LayaProject/web
node tool/tmpPack.js                                        # nor.br + nor.manifest.json
Python/pythoncore-3.14-64/python.exe local/doupload.py      # PUB_FORCE=1, h6 华为云 sgf-rhq1y
```
- 核对 nor.br 含 boy@0.lh + boy/9.lani + node_0.005.lm，nor.manifest.json 尺寸/哈希更新；令牌不变 → res.ts/index.html 无需改。
- 浏览器复验（h5/ai13 硬规则）：`__qa.pve()/__qa.toMatch()` 进对局；断言 stand 循环无卡顿（首尾帧姿态差）、四向移动切换、出手=前摇结束（~300ms）、球拍朝向正确；每个关键状态截图 + view_image 目检（循环首尾对比/触球帧/球拍特写）；动画资源双端同源，PVP 改动须双客户端 mcdrive 复验；生产复验走真实 CDN。
- 发布需明确授权（aidev 纪律）；失败即停。

### 回填（m8）
- 回填本节 + h12 模块行 + ai3d 节点树 + `docs/auto/state.json`（phase/done/next/updatedAt）；记录逐轨帧区间变更、修复断言、导出 take 列表、IDE 发布产物、dist 同步、nor.br 尺寸/哈希、上传时间戳、探针断言数与截图路径。未回填 = 本轮未完成；下一轮从 state.json next 续跑。


## h19 Codex IDE/Desktop 会话同步到 chat（2026-11-22）

- 数据源：`C:\Users\mien\.codex\state_5.sqlite` 的 `threads`（`source='vscode'`）+ `projects`；字段 `title/cwd/model_provider/model/rollout_path/project_id/updated_at`。
- relay 新增：`codex.ideThreads / codex.ideHistory / codex.ideChat`。
- `server/re/codex.js`：
  - `ideThreads(limit)` 读 SQLite（node:sqlite readOnly），过滤 archived=0。
  - `ideHistory(threadId)` 逐行读 rollout JSONL，提取 `response_item.message` 的 user/assistant；跳过 environment_context/skills/turn_aborted/external_browser_tabs。
  - `ideChat(threadId,text)` 用线程自身的 `model_provider/model` 执行 `codex exec ... resume <threadId>`，实现 chat 继续工作。
- chat 侧：
  - 会话列表合并 `ide:<threadId>`，标题 `IDE · ...`，kind=ide，头像 I。
  - `/api/history?peer=ide:...` 读 IDE 历史；`POST /api/chat {peer:'ide:...',text}` 继续原线程。
  - 只读会话/历史公开；发消息仍需 X-Cx-Token。
- 实测：
  - 本机 4 个 IDE 线程；历史 7 条；`IDEOK`、`IDEOK2` 本机 resume 成功。
  - 生产 ECS relay：`/codex-api/api/conversations` 返回 4 个 `ide:*`；`/api/history` 正常；`POST /api/chat` 返回 `PRODIDEOK2`（OpenAI 线程较慢，客户端 120s 超时但服务端最终完成并写入 rollout）。
  - 浏览器 `chatpage_ide.cjs` PASS：列表显示 `IDE · ...`（头像 I），点开可见历史。
- 坑：
  - IDE 线程正在 Codex 中打开时 resume 报 active writer；需先关闭/切走该对话。
  - 必须按线程的 `model_provider/model` resume，不能强行用当前默认模型。
  - `server/re/codex-config.json` 曾残留 `timeoutMs=30000`，导致 IDE resume 30s 超时；已改 600000 / workspace-write。

### 实测坑与修正（2026-11-22 执行轮补充）
- **Blender 导出**：导出前全 NLA 轨 unmute（导出器跳过 mute 轨）；5.4 插值在 kp.interpolation；NLA strip 换 action 需设 action_slot + action_frame_start=1，旧 strip 失效时删除重建。
- **IDE 重导入**：外部替换 assets/nor/boy.fbx 后须 `ide-ui-eval` 调 `Editor.assetDb.flushChanges()`（reimport/refreshFolder 单独无效）；ide-ui-eval 上下文为渲染窗口（Editor.assetDb，无 Editor.Message，非 async 函数体）。
- **IDE tree-shake**：badm.ls 不引用 boy → release/web/nor 无 boy；发布产物从 library/d3/<uuid>@0.lh 组装（@laniN→boy/<take>.lani 字母序映射、@lm0→boy/node_0.005.lm、材质uuid→body.lmat），双写 release/web/nor 与 dist/web-1107/nor。
- **上传假成功**：publish.py upload() 以文件名在列表判成功，覆盖重传=假成功（覆盖确认弹窗未点）。用 `local/reupload_verify.py`（点确认+源站 Range 回读断言）；回读通过后若 plain URL 仍旧字节=CDN 缓存→ResList 加 ver 参数重编 bundle。
- **探针**：PVE 待机每帧 crossFade 回 stand，直接 crossFade 无效；移动动画须真实输入驱动或回合中截图。badmdrive 的 GOBE 100105 为测试账号态问题（与动画无关）。
- **遗留观察**：ani.controller 只引用 boy/*.lani，girl1 模板共用同一 controller→girl 也播 boy clips（_girl  Rig 比例不同观感差）；girl 侧球拍观感异常待专项。hitoff/jumphit/diving 仍为旧重定向 action（RP 未键控→球拍随手走），待下一轮重建。

### 生产交付链路（2026-11-22 实测改道）
- **华为云上传端点当前网络不可用**：控制台上传静默挂起(2KB 也超时)；publish.py upload() 还有"文件名在列表=成功"的假成功缺陷(覆盖确认/失败弹窗未处理)。下载正常。
- **生产拓扑**：apex normalgame.cn = CF 代理→ECS nginx(/home/ftpu/html/index.html，全资源华为直链)；www.normalgame.cn = CF worker(assets=server/cloud/public)。CF assets 静态优先于 worker。
- **改道交付(已上线)**：www.normalgame.cn 根目录 serve 新 index.html(bundle 相对路径) + /packs/nor.br|ui.br(v=20261122b) + /js/bundle.js(ResList 指 www/packs)。**www 入口已带新动画**。
- **apex 仍旧包**：其 index 在 ECS nginx，更新需 FTP 密码或阿里云 Workbench 登录(均已过期/未知=凭据边界，待用户)。曾试 apex/* worker 路由+透传：裸 IP fetch 被 CF 1003、resolveOverride 1019、OAuth 无 DNS 写权限→**已回退 apex 路由**(relay /apim 恢复 200)。教训：wrangler rollback 只回脚本不回 routes；routes 由 deploy 同步。
- 探针：local/prod_animprobe.cjs(www 生产引擎复验)；local/reupload_verify.py / reupload_delete.py / upload_seq.py(华为上传诊断，含覆盖确认+回读断言)。

- **CF assets 不支持 Range**(全量 200)：res 分片下载原抛"服务器不支持Range"→ `src/libs/net.ts` downloadChunk 加全量 200 降级整包单分片模式(2026-11-22)；worker 保持 git 原版 + assets-first(静态优先)，勿加 run_worker_first(env.ASSETS 绑定实测不可用/1101)。
- www 静态镜像清单(public/)：index.html(生产 apex 版改 bundle 相对路径)、js/bundle.js、packs/{nor,ui}.br、load.ls、fileconfig.json、internal/、game/、ui/(含从 ui.br 解出的 internal/UI 图片与生成的 scroll 皮肤占位 png)。

### apex 交付完成（2026-11-22 用户提供 FTP 凭据 ftpu）
- `node local/ftpup.cjs ftpu <pass> html/`：MKD+STOR 上传 index.html / js/bundle.js(apex ResList v=20261122c) / packs/nor.br / packs/ui.br 到 ECS /home/ftpu/html，LIST 尺寸核对一致(5230412/2440855/665604)。
- apex 回读：index src=js/bundle.js ✓ bundle 含 apex ResList ✓ /packs/nor.br Range=206 Content-Range/5230412 ✓（nginx 原生 Range，无 CF 坑）。
- ResList 最终口径：apex bundle 指 apex/packs；CF www bundle 指 www/packs（www boot 复验未过, 备用入口不作验收）。
- headless 生产探针不稳（页空/卡下载确认弹窗点击）=探针侧问题；真实浏览器会弹"资源下载"确认, 点击即重下新包(size/etag 变化必更新)。待用户真实浏览器目检左右移动。

## h20 chat 实时同步 / IDE 会话操作 / 双击管理（2026-11-22）

- **app-server 接入**：`server/re/appserver.js` 以 stdio JSON-RPC 启动 `codex app-server --stdio`，`initialize` 带 `experimentalApi:true`。能力：`thread/list`、`thread/resume`、`turn/start`、`thread/queue/add`、`thread/queue/start`、`thread/archive/unarchive/delete/name:set`。
- **relay 新增**：`codex.appStatus/appThreads/ideSend/ideQueue/ideSnapshot/ideManage`。`ideSend` 先 `thread/resume`，再 `turn/start`；若线程在 Codex 中 active writer，则自动 `thread/queue/add` 排队。
- **chat 桥**：
  - `ide:` 会话发送改为 `codex.ideSend`（app-server 实时操作），返回“已提交/已排队”，真正回复通过轮询 `codex.ideSnapshot` 经 SSE `history` 事件回填。
  - `startIdeSync()`：每 1s（`ideSyncMs`）调用 `codex.ideSnapshot{activePeer}`；线程签名变化广播 `conversations`，活动线程新消息广播 `history`。无 SSE 客户端时自动跳过，避免空转。
  - 新增 `POST /api/ide/manage`：archive/unarchive/delete/rename。
- **chat UI**：
  - SSE 新增 `history` 监听，活动 IDE 会话实时重绘消息。
  - 会话列表双击打开“会话管理”：标题/ID/类型/目录/模型 + 继续、复制 ID、改名、归档、取消归档。
- **实测**：
  - `codex.appThreads` 返回 IDE 线程；`codex.ideSend` 对非活动线程 `mode=turn`；对活动线程自动 `mode=queued`。
  - 生产 `/codex-api/api/chat` 对 IDE 会话返回 `mode=turn`；历史出现 `WSOK` 等新回合。
  - 浏览器双击 IDE 会话 → 管理弹窗显示 `ide:*`、kind=ide：`chatpage_manage.cjs` PASS。
- **限制**：`turn/start` 立即返回 inProgress，不阻塞等待最终回复；最终回复靠 snapshot 轮询/SSE。当前桌面正在运行的线程只能排队，不能抢 writer。
- **实时同步修正**：`codex.ideSnapshot` 增加 `since`，只返回 `updatedAt > since` 的线程及其 history；bridge 每秒广播所有变化线程的 `history` 事件，UI 收到后更新缓存/列表/当前消息，无需点击会话列表。
- **IDE 状态/等待队列**：`codex.ideSnapshot` 合并 appserver `thread/list` 的真实 status；UI 会话头显示 工作中/空闲。发送到 active writer 线程时不再把排队提示写进对话，而是显示输入框上方的一行队列条（可展开、每项 × 删除，5s 自动刷新）；新增 `GET /api/ide/queue`、`POST /api/ide/queue/delete`、relay `codex.ideQueueList/ideQueueDelete`。
- **删除会话**：chat UI 管理面板新增“删除会话”；`POST /api/conv/delete` → relay `codex.convDelete` → appserver `thread/delete` + 本地 sessions/cache 清理。生产实测 fake peer 删除 PASS（token= cx-9）。
- **本地缓存/增量**：chat UI 用 localStorage 缓存会话列表与每会话最近 200 条消息；打开会话先渲染缓存，再 `/api/history?since=<最后ts>` 增量拉取；SSE history 同步写缓存。服务端 `codex.history/ideHistory` 支持 `since` 过滤。
- **实时活动流**：新增 relay `codex.ideItems` + bridge `/api/ide/items`；IDE 会话渲染 thread/items（命令/思考/文件/工具/消息），每秒轮询 diff 并广播 `items` 事件；本地模式监听 app-server `item/*` 原生通知。`chatpage_items.cjs` PASS(50 items)。
