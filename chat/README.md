# chat — Codex 远程同步聊天（微信通道）

从 OpenClaw（龙虾）微信插件 `@canghe/openclaw-wechat` 提取通道协议，改为 **Codex CLI** 的远程同步聊天桥：

```
微信好友/群  ── webhook(60001/80001) ──┐
                                        ├─> chat/bridge.cjs ─> codex exec (cwd/model) ─> 回复微信
Web 聊天页  ── /api/chat (SSE) ─────────┘
配置页 codex.html ── /api/config ──> 工作目录 / 模型 / 微信 / ECS
```

- **不经过游戏云数据库**：会话与消息只落本机 `chat/data/` 与 Codex 自身会话文件。
- **与龙虾接口一致**：保留 `openclaw-wechat` 的 Proxy API 路径、`60001/80001` webhook 负载、`/v1/iPadLogin` 登录流程。
- **低耦合**：`plugin/wechat.cjs` 只负责微信收发；`server/re/codex.js` 只负责 Codex 会话；`bridge.cjs` 负责编排；UI 只调 HTTP。

## 目录

| 路径 | 作用 |
|---|---|
| `plugin/wechat.cjs` | 独立版微信通道（ProxyClient + webhook 归一化 + 去重 + 分段发送） |
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
  "wechat": { "enabled": true, "apiKey": "wc_live_...", "proxyUrl": "http://代理:3000", "webhookHost": "公网地址", "webhookPort": 18790 },
  "ecs": { "regionId": "cn-shenzhen", "instanceId": "i-wz9..." }
}
```

- `mode=local`：bridge 进程直接跑 `codex exec`（推荐，本机有 Codex 登录态）。
- `mode=relay`：bridge 部署在云上时，经 `https://normalgame.cn/apim` 的 `codex.chat` 调本机 Codex。
- 微信需要苍何代理的 `apiKey` + `proxyUrl`；首次 `POST /api/wechat/login` 返回二维码，扫码后自动注册 webhook。

## 协议（与 openclaw-wechat 一致）

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

- **配置页已发布**：`server/cloud/public/codex.html` + `chat.html` → Cloudflare Worker `www.normalgame.cn` 静态资源；未替换 `index.html`。
  - 访问 `https://www.normalgame.cn/codex.html`。
- **桥服务**：本机运行 `chat/bridge.cjs`；如需公网访问，在 `server/re/frpc.toml` 增加 21121→5002 隧道，并在 ECS nginx 增加 `location /codex-api/ { proxy_pass http://127.0.0.1:5002/; }`（见 `deploy/nginx-codex.conf`）。
- **阿里云 ECS**：`deploy/install-ecs.sh` 安装 systemd 服务；当前 ECS 控制台会话过期，需在可见 Edge 9228 的登录窗口完成阿里云登录后执行（`local/open_workbench.cjs` 可打开 Workbench）。

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
