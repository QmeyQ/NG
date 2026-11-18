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
