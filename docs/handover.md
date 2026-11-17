# AI 接管手册（NG 羽毛球平台）

> 权威版本在画布工作流 `docs/nodes/aihandover.js`（h1→h11）。本文件为可读镜像。
> 闭环遵循 `docs/nodes/aidev.js`：先策划落图 → 执行 → 编译 → 浏览器验证 → 回填。部署/发布仅在明确授权且验收通过后执行。

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

## h6 上传华为云存储（需用户登录）
前提: 可见 Edge 9227 已登录 + 云存储桶 `sgf-rhq1y` 标签（`node local/openagc.cjs`；被导航走用 `/json/new` 重开）。
```
Python/pythoncore-3.14-64/python.exe local/doupload.py     # PUB_FORCE=1 覆盖 root ui.br/nor.br + js/bundle.js
```
回读共享令牌写 `tool/webpub/tokens.json`；**令牌不变**则 `res.ts` ResList 与 index.html 直链无需改。js 目录须 go_root→enter_dir('js') 再传；传后 reload 复核大小/时间戳确认替换。
【已验证可行】进 js/ 点击文件夹名后 **cslp iframe 可能重载致 frame 失效→每次点击后 `cs._frame()` 重取**再判 rows；上传用 `cs.upload()`(先点"上传文件"按钮)而非直接 input；多策略点击(真实/JS/CDP viewport_midpoint)。可靠脚本 `local/doupload_js7.py`。误传根目录的 bundle.js 为冗余可删。root ui.br/nor.br 上传稳定。

## h7 部署 te 云函数（需华为登录）
```
Compress-Archive server/te/CloudDBZoneWrapper.js,server/te/code.js,server/te/db.js,server/te/function-config.json,server/te/gobe.js,server/te/NG.js,server/te/package.json,server/te/shield.js,server/te/user.js,server/te/resources -DestinationPath local/te-new.zip -Force
```
开云函数标签 `#/app/9249519184595931747?appId=5765880207855344723&projectId=388421841221717430` → 点函数 **te** → **函数代码** tab。
`python tool/webpub/fcode.py up local/te-new.zip`；拖拽框隐藏无 rect 时用 `local/deploy_te2.py`(JS 点 wrap+input)；若仍不认 → **人工控制台上传 zip 并提交**。纯代码包(平台装依赖)。部署后 h9 验证版本。

## h8 部署 Cloudflare Worker（需用户 CF 授权）
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
| 社交页 UI 绑定 | `src/ui/social.ts` | — | item2 全部 soc* 节点 | (浏览器 mcdrive) |
| 个人页 UI 绑定 | `src/ui/personal.ts` | bag/set/score | item3 左 tabs 右 panel(背包/战绩/设置/隐私) | (浏览器) |
| 网关/IP/历史风控 | `src/libs/server/cloud.ts`(teSafe/teWrite) | Worker `server/cloud/src/agc.js` | — | cloud-registration.test.cjs |
| PVP 协议(帧/消息/角色) | `src/libs/gobe/msg.ts`+`pvpProto.ts`+`roleSync.ts` | (GOBE 实时, 非 te) | game/badm.ls | (对局驱动) |
| 资源网络加载 | `src/libs/res.js`+`load.ts` | Worker /res 令牌 | — | res-loader.test.js |

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
