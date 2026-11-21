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
