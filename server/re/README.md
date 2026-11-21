# re-relay — AI 远程中转

让远端 AI 通过服务器 `/apim` 全权处理本机 LayaAir 项目：**文件读写 / 终端命令 / LayaAir IDE MCP 接管**。

## 链路
```
远端 AI ──HTTP──> 服务器 nginx /apim ──> 127.0.0.1:5001 (frps 远程口)
   ──frp隧道──> 本机 127.0.0.1:21119 (re/server.js relay)
```
- 本机 relay 监听 `127.0.0.1:21119`（**新端口，不与远程控制 21118 冲突**）。
- 独立 frpc 隧道 `re/frpc.toml`：proxy `re-api`，21119 → 服务器 5001。**不触碰既有 FRPC 服务（m-tcp 21118→5000）**。
- 服务器 nginx 需配置 `location /apim { proxy_pass http://127.0.0.1:5001/; }`。

## 鉴权
token 在 `re/config.json`：`<RE_TOKEN>`
每次请求携带：JSON body `token` 字段，或请求头 `X-Re-Token`，或 `Authorization: Bearer <token>`。

## 调用
`POST http://47.119.120.119/apim`（或直连隧道 `http://47.119.120.119:5001`），`Content-Type: application/json`。
**参数缺失/错误时接口直接返回帮助文档**（`{ok:false,error,help}`）；`GET` 任意路径或 `action=help` 返回完整帮助。

请求体：`{ "token":"<token>", "action":"<动作>", ...参数 }`

## 动作清单
| action | 说明 | 必填参数 |
|---|---|---|
| help / ping / info | 帮助 / 健康 / 环境 | — |
| fs.read | 读文件 | path（encoding 可选 utf8/base64） |
| fs.write | 写文件 | path, content（mkdir 可选） |
| fs.append | 追加 | path, content |
| fs.list | 列目录 | path（recursive 可选） |
| fs.stat | 元信息 | path |
| fs.delete | 删除 | path（recursive 可选） |
| fs.move / fs.copy | 移动/复制 | from, to |
| fs.mkdir | 建目录 | path |
| exec | 终端命令(高危) | cmd（cwd, timeout 可选） |
| laya.list | 列 IDE MCP 工具 | — |
| laya.call | 调任意 MCP 工具 | tool（args 可选） |
| laya.state | IDE 状态 | — |
| laya.build | IDE 构建 | platform 可选(默认 web) |
| laya.find | 查资源 | keyword |
| laya.open | 打开场景/预制体 | id |
| laya.eval | IDE UI 进程执行 JS | code |

path 相对路径基于项目根 `F:/LayaProject`，也接受绝对路径。

## 示例
```bash
curl -X POST http://47.119.120.119/apim -H "Content-Type: application/json" \
  -d '{"token":"<RE_TOKEN>","action":"exec","cmd":"node local/layamcp.cjs list"}'

curl -X POST http://47.119.120.119/apim -H "X-Re-Token: <RE_TOKEN>" \
  -d '{"action":"laya.build","platform":"web"}'

curl -X POST http://47.119.120.119/apim -H "X-Re-Token: <RE_TOKEN>" \
  -d '{"action":"fs.read","path":"src/index.ts"}'
```

## 安装 / 卸载（开机自启, NSSM）
- 安装：右键管理员运行 `frp/ontask.bat` → 安装并启动 `ReAPI`(node relay) 与 `ReFrp`(relay 隧道) 两个自启服务。
- 卸载：管理员运行 `frp/uninstall.bat` → 仅移除 `ReAPI`/`ReFrp`。
- **两者都不改动既有远程控制 `FRPC` 服务。**

## 文件
- `server.js` relay 主服务；`mcp.js` LayaAir MCP 客户端；`config.json` token/端口；`frpc.toml` relay 隧道。
- `bin/node.exe` 自带 Node 运行时（服务用，避免依赖用户 WindowsApps node）。
- `test_local.cjs` 本地自检（15 项）。

## 部署状态（已完成）
- **服务器 /apim 已配置并验证**：nginx `/etc/nginx/sites-enabled/default` 增加 `location /apim { proxy_pass http://127.0.0.1:5001/; ... }`（原配置备份在服务器 `/root/default.bak.re`）。frps 监听 5001。
- **端到端实测通过**：`POST http://47.119.120.119/apim` 的 `exec` 与 `laya.state` 均成功（远程执行命令 + 读取 LayaAir IDE 状态）。
- 服务器接管方式：复制本机 Edge Profile 1 会话到可调试 Edge（CDP 9228）→ 免密登录 ECS Workbench → 经 xterm 终端配置 nginx。脚本见 `local/copy_session_edge.ps1`、`local/type_cmd.cjs`。
- **开机自启**：右键 `frp/ontask.bat` → 以管理员身份运行（需 UAC 同意），安装 ReAPI/ReFrp 服务。卸载用 `frp/uninstall.bat`。

## 补充配置（已完成）
- **HTTPS /apim**：nginx 443 server 块（normalgame.cn，证书 /etc/nginx/ssl/normalgame.cn.pem/key）也加了 `location /apim { proxy_pass http://127.0.0.1:5001/; ... }`。HTTP 与 HTTPS 均可调用。实测 `POST https://normalgame.cn/apim` exec 成功。备份 /root/default.bak.re2。
- **FTP 修复**：本机连不上服务器 FTP 的根因——vsftpd `listen_ipv6=YES` 导致 PASV 返回 `0,0,0,0`（忽略 pasv_address），客户端无法建立数据连接。改 `listen=YES`/`listen_ipv6=NO` 并重启 vsftpd 后，PASV 正确返回公网 IP 47.119.120.119，被动端口 1024-1048 数据连接实测 OK。备份 /root/vsftpd.conf.bak.re。FTP 客户端请用**被动模式(PASV)**。

## Codex 远程会话（v1.1，2026-11-21）

| action | 说明 | 必填参数 |
|---|---|---|
| codex.status | Codex 版本 / 模型 / 会话 | — |
| codex.models | 模型列表（读 ~/.codex/model-catalog.local.json） | — |
| codex.config.get / set | 读/改 bin、cwd、model、sandbox、timeoutMs | set: patch |
| codex.chat | 以 peer 为键执行一次 `codex exec`，自动 resume | text（peer/cwd/model/sandbox 可选） |
| codex.history | 某 peer 的对话历史 | peer |
| codex.sessions | 所有会话 | — |
| codex.cancel | 取消当前子进程 | peer 可选 |

```bash
curl -X POST https://normalgame.cn/apim -H "X-Re-Token: <token>" -H "Content-Type: application/json" \
  -d '{"action":"codex.chat","peer":"wechat:wxid_x","text":"检查项目状态"}'
```

实现：`re/codex.js`，`codex exec --json` + `resume <threadId>`；stdin 必须关闭（否则会等待输入）。会话文件 `re/codex-sessions.json`（本地，勿提交）。

