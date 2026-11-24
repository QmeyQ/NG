# chat — Codex 远程同步聊天（微信通道）

从 OpenClaw（龙虾）微信插件提取通道协议，改为 **Codex CLI** 的远程同步聊天桥。默认使用腾讯官方 `@tencent-weixin/openclaw-weixin` 的 **iLink 扫码直连**（无需 API Key）；苍何代理作为可选 fallback。

```
微信好友/群  ── webhook(60001/80001) ──┐
                                        ├─> chat/bridge.cjs ─> codex exec (cwd/model) ─> 回复微信
Web 聊天页  ── /api/chat (SSE) ─────────┘
配置页 codex.html ── /api/config ──> 工作目录 / 模型 / 微信 / ECS
```

- **不经过游戏云数据库**：会话与消息只落本机 `chat/data/` 与 Codex 自身会话文件。
- **扫码即可**：官方 iLink `get_bot_qrcode → get_qrcode_status → getupdates → sendmessage`，登录后 token 存 `chat/data/weixin.json`。
- **与龙虾接口一致**：苍何 fallback 保留 `openclaw-wechat` 的 Proxy API 路径、`60001/80001` webhook 负载、`/v1/iPadLogin` 登录流程。
- **低耦合**：`plugin/wechat.cjs` 只负责微信收发；`server/re/codex.js` 只负责 Codex 会话；`bridge.cjs` 负责编排；UI 只调 HTTP。

## 目录

| 路径 | 作用 |
|---|---|
| `plugin/weixin.cjs` | 官方 iLink 扫码通道（二维码/长轮询/发送/去重），默认 |
| `plugin/wechat.cjs` | 苍何代理 fallback（ProxyClient + webhook 归一化） |
| `bridge.cjs` | 编排服务：微信 ↔ Codex ↔ Web，HTTP/SSE |
| `public/chat.html` | 微信式对话列表 + 聊天面板 |
| `public/codex.html` | 配置页（工作目录/模型/微信/阿里云），已发布到 `www.normalgame.cn/codex.html` |
| `server/re/codex.js` | Codex CLI 会话执行器（按 peer 续聊，relay 与 bridge 共用） |
| `mock-proxy.cjs` | 本地模拟苍何微信代理，离线 E2E 用 |
| `test/e2e.cjs` | 17 项端到端断言 + 两张 UI 截图 |
| `vendor/openclaw-wechat/` | 提取的原始插件源码（MIT，供协议对照） |
| `deploy/` | nginx / ECS 安装脚本与说明 |

## 运行

```powershell
# 1) 生成本地配置（首次运行自动生成，含随机 token）
F:\LayaProject\server\re\bin\node.exe F:\LayaProject\chat\bridge.cjs

# 2) 打开
http://127.0.0.1:21121/            # 聊天
http://127.0.0.1:21121/codex.html  # 配置
```

`chat/config.json` 关键字段：

```json
{
  "port": 21121,
  "token": "cx-...",
  "mode": "local",
  "codex": { "cwd": "F:/LayaProject", "model": "qwen4-max-preview", "sandbox": "workspace-write" },
  "wechat": { "provider": "ilink", "enabled": true, "botType": "3", "botAgent": "Codex/1.0" },
  "ecs": { "regionId": "cn-shenzhen", "instanceId": "i-wz9..." }
}
```

- `mode=local`：bridge 进程直接跑 `codex exec`（推荐，本机有 Codex 登录态）。
- `mode=relay`：bridge 部署在云上时，经 `https://normalgame.cn/apim` 的 `codex.chat` 调本机 Codex。
- 默认 `provider=ilink`：`POST /api/wechat/login` 返回官方二维码，手机微信扫码确认即可，无需 API Key；登录后自动开始长轮询。
- 只有 `provider=canghe` 才需要苍何代理的 `apiKey` + `proxyUrl`。

## 协议

### 官方 iLink（默认）

| 方向 | 接口 |
|---|---|
| 二维码 | `POST https://ilinkai.weixin.qq.com/ilink/bot/get_bot_qrcode?bot_type=3` |
| 扫码状态 | `GET /ilink/bot/get_qrcode_status?qrcode=...`（长轮询） |
| 收消息 | `POST {baseurl}/ilink/bot/getupdates`（`get_updates_buf`） |
| 发消息 | `POST {baseurl}/ilink/bot/sendmessage`（`message_type=2` + `text_item`） |

### 苍何 fallback（与 openclaw-wechat 一致）

| 方向 | 接口 |
|---|---|
| 登录 | `POST /v1/iPadLogin` → `wId,qrCodeUrl`；`POST /v1/getIPadLoginInfo` → `waiting/need_verify/logged_in` |
| 收消息 | 代理回调 `POST /webhook/wechat`，`messageType` `60001`(私聊文本)/`80001`(群文本)，字段 `wcId,data.fromUser,data.fromGroup,data.content,data.newMsgId` |
| 发消息 | `POST /v1/sendText` `{wcId,content}`；图片 `POST /v1/sendImage2` |
| 注册 | `POST /v1/webhook/register` `{webhookUrl,wcId}` |

去重按 `newMsgId`，30 分钟窗口；文本按 2000 字分段。

## 测试

```powershell
node F:\LayaProject\chat\test\e2e.cjs
# 17 pass / 0 fail，截图 chat/test/ui-chat.png、ui-codex.png
```

覆盖：桥启动/帮助、微信登录+webhook 注册、Web 对话、私聊转交回复、重复去重、群聊回群、配置保存、模型列表、ECS URL、UI 截图。

## 部署

- **配置页已发布（生产）**：`https://normalgame.cn/codex` / `https://normalgame.cn/chat`（ECS nginx 静态；Cloudflare 会去掉 `.html`）。
  - 备用入口：`https://www.normalgame.cn/codex.html`（Cloudflare Worker 静态资源）。
  - 未替换 `index.html`。
- **桥服务（已部署）**：ECS `/home/ftpu/codex-chat` + systemd `codex-chat`，监听 127.0.0.1:21121；nginx `/codex-api/` 反代到它。
  - ECS `chat/config.json`：`mode=relay`、`relay.url=http://127.0.0.1/apim`，再经 frp 调本机 Codex。
  - 本机也可直接 `node chat/bridge.cjs`（mode=local）。
- **阿里云 ECS**：已完成登录/部署（Workbench 免密连接）。`deploy/install-ecs.sh` 可重复安装；`codex.bundle` + `ecs-install-remote.sh` 可一键更新。

## 安全

- 所有 `/api/*` 需 `X-Cx-Token`；token 在 `chat/config.json`，不要提交。
- 微信 `apiKey` / 阿里云 AccessKey 仅存本地配置，页面不回显完整密钥。
- `codex` 默认 `workspace-write`；需要全权时显式改 `danger-full-access`。

## ECS 一键部署（登录 Workbench 后）

```bash
# 把 chat/deploy/ecs-install-remote.sh 内容贴到 ECS，或：
curl -fsS https://www.normalgame.cn/ecs-install-remote.sh -o /tmp/ecs.sh  # 可选：自行上传到站点
bash /tmp/ecs.sh <RE_TOKEN> http://127.0.0.1/apim
```

`codex.bundle` 返回 9 个文件（bridge/plugin/UI/config/deploy/codex.js），ECS 写入 `/home/ftpu/codex-chat` 后由 `install-ecs.sh` 建 systemd 服务。桥在 ECS 上应设 `mode=relay`（调本机 `/apim`）。
## 手机端

- 手机打开 `https://normalgame.cn/codex`，默认不显示二维码，显示 **“在微信中打开并授权”**（官方 `liteapp.weixin.qq.com` 链接，调起微信）。
- 若未自动跳转：点 **“复制授权链接”**，粘贴到微信任意聊天窗口打开。
- 需要另一台手机扫时，点 **“显示二维码”**。

## Codex IDE / Desktop 会话

- 数据源：`C:\Users\mien\.codex\state_5.sqlite` 的 `threads`（`source='vscode'`）与 `projects`。
- `/chat` 会话列表合并 `ide:<threadId>`，标题 `IDE · ...`，头像 `I`。
- 点开读取 rollout JSONL 的 user/assistant 历史；发送消息会执行 `codex exec resume <threadId>`，**在原 IDE 线程里继续工作**。
- 只读会话/历史不需要 Token；从网页发消息仍需 `X-Cx-Token`。
- 若线程正在 Codex 中打开，resume 会报 `active writer`，请先关闭/切走该对话。
- resume 使用线程自身的 `model_provider/model`，不能强行改模型。

## 实时同步 / IDE 会话操作 / 会话管理

- chat 桥每 1 秒调用 relay `codex.ideSnapshot`，线程变化推送 SSE `conversations`，活动 IDE 会话新消息推送 SSE `history`。
- IDE 会话发送走 relay `codex.ideSend`：`thread/resume` + `turn/start`；若线程正在 Codex 中运行，自动 `thread/queue/add` 排队。
- 双击会话列表打开“会话管理”：继续、复制 ID、改名、归档、取消归档。
- 当前 Codex 正在运行的线程不能被第二个进程抢 writer，只能排队；等 Codex 释放后会处理。

## 本地缓存与增量同步

- 会话列表缓存：`localStorage.cx_cache_convs`
- 每个会话消息缓存：`localStorage.cx_cache_msgs_<peer>`（最近 200 条）
- 打开会话：先渲染缓存，再带 `since=<最后一条 ts>` 增量拉取新消息
- SSE `history` 到达时同步写入缓存
- 服务端 `/api/history?peer=...&since=...` 只返回 `ts > since` 的新消息

## 删除会话

- 双击会话 → 管理面板 → **删除会话**
- 会同时：
  1. 删除 chat 端本地缓存与会话记录
  2. 调 Codex app-server `thread/delete` 删除 Codex 端线程
- 删除前会弹确认，不可恢复。
- 当前生产 token 为 `cx-9`。

## 实时同步（无需点列表）

- chat 桥每 1 秒调用 `codex.ideSnapshot{since}`，只取有变化的 IDE 线程。
- 有变化时直接广播 `history` 事件，消息会自动推送到页面。
- 页面收到 `history` 后：
  - 写入本地缓存
  - 更新会话列表预览和未读数
  - 如果是当前打开的会话，直接重绘消息
- 不需要点击会话列表来触发同步。

## IDE 状态与等待队列

- 会话头部现在显示真实线程状态：`工作中 / 空闲 / notLoaded`
- 发送到正在运行的 IDE 线程时，不再把“已排队”写进对话，而是显示在输入框上方的**等待队列条**
- 队列条默认只占一行，显示 `队列 N` + 第一条预览
- 点“展开”显示完整等待列表，每项带 `×` 可删除
- 队列每 5 秒自动刷新，任务开始/完成后自动从队列消失

## 实时活动流（命令/思考/文件/工具）

- IDE 会话现在读取 app-server `thread/items/list`
- chat 页面渲染完整活动流：
  - 用户消息
  - Codex 回复
  - 正在执行的命令（含输出、状态、耗时）
  - 思考 / 推理
  - 文件变更
  - MCP 工具调用
- 每秒自动同步一次，命令执行、输出增长、状态变化都会实时更新
- 本地模式还会监听 app-server 原生 `item/*` 通知


## IDE 活动流（单条消息 + 实时）

- 打开 IDE 会话显示为**一条消息/轮次**：头部(角色+执行状态+时间)、主体(最终回复或用户消息)、可折叠"执行过程"(命令/思考/工具，含输出)。
- 实时：\`codex.ideItemsLive\`（relay）直接解析 rollout JSONL——执行中的命令**立即**出现为"执行中"，完成后自动翻转为"完成/失败"；bridge 每秒 diff 广播 SSE \`items\`。
- 折叠状态跨刷新保持（\`state.openTurns\`）；执行中的轮次默认展开；向上翻阅时不强制拉底。
- 测试：\`node chat/test/chatpage_turns.cjs\`、\`node chat/test/chatpage_turn_realtime2.cjs RT-<任意标记>\`（需另一会话同时发含 \`<标记>-SLEEP\` 的长命令）。
- 第二轮：用户消息=原样右对齐绿底气泡；Codex 回复=左侧气泡，过程收在消息内，**点击消息本体收展**（无按钮）；执行中的轮次默认展开。数据不变不重渲（签名守卫），多标签每页独立 2s 拉取互不干扰，空数据不广播不覆盖。

## 会话级模型切换（2026-11-23）

- chat 页顶部模型下拉**按会话记忆**：切换会话时显示该会话上次用的模型，
  手动改选后写入 `localStorage.cx_modelOf[peer]` 并随每条消息发送
  `POST /api/chat {peer,text,cwd,model}`。
- 模型清单来自 `~/.codex/model-catalog.local.json`；
  `aigc.midea.com/<站点模型>` 这类 slug 会被中转映射到网页端
  模型下拉并真实切换（resume 会话同样生效）。
- `/api/conversations` 每条会话带 `cwd` / `model`。

## 新建聊天工作目录 + 目录选择器（2026-11-23）

- 新建聊天弹窗新增"工作目录"输入与"浏览…"按钮：
  `GET /api/dirs?path=<dir>` 返回 `{path,parent,dirs:[{name,path}]}`
  （local 模式直接 fs；relay 模式走 `fs.listDir` action，token 保护）。
- 面板支持逐级进入、"↑ 上级"、"选择此目录"；发送时带 `cwd`，
  Codex 会在该目录下执行，会话记录保存 cwd。

## 图片输入（2026-11-23）

- `POST /api/chat` 支持 `images: [本机路径...]`（微信图片下载后的
  本地文件）；空文本 + 图片时默认提示"请看图片内容并回答。"。
- 微信 `image_item`：CDN 下载 + AES-128-ECB 解密，落盘
  `chat/data/media/`，经 bridge → relay `codex.chat(images)` →
  `codex exec -i <path>`（可多张，resume 同样支持）。
- 本机桥已生效；ECS 桥需重新部署：
  `bash chat/deploy/ecs-install-remote.sh <RE_TOKEN> <APIM_URL>`。

## 图片回传（附件回传，2026-11-23）

- codex.chat 结果新增 imagePaths（执行机本机路径）与 images:[{name,size,b64}]（≤8MB/张、≤4 张）：来源是事件流 ImageView 项（view_image 真实看过的图）+ 回复正文引用的本机图片路径。
- 微信：文本回复后逐张 sendImage（iLink：getuploadurl → AES-128-ECB 上传 CDN（响应头 x-encrypted-param 为下载参数）→ sendmessage image_item，no_need_thumb 免缩略图）。
- chat Web UI：POST /api/chat 返回 imageUrls（data URL），消息气泡渲染缩略图。
- relay 模式：ECS 桥收到 images[].b64 落盘 chat/data/media/return-* 再发微信；本机模式直接用 imagePaths。

**生效条件**：本机 relay（21119）已带新代码并实测；ECS 桥需重新部署一次（见 chat/deploy/ecs-install-remote.sh，WeChat 登录态与 config.json 不受影响）；本地 chat UI 图片渲染需重启本地桥一次（管理员 net stop CodexChat && net start CodexChat）。

- 模型主动回传：输出协议含 `[attach]完整本机路径[/attach]`——用户要图时模型在结论末尾标记（语义决策，非关键词拦截），网关解析后把图发给用户并从正文剥离标记。
