# CodexChat 开机自启（NSSM）

与 `server/re/frp/ontask.bat` 同样的方式，把 `chat/bridge.cjs` 注册为 Windows 服务。

## 安装

右键 **以管理员身份运行** `ontask.bat`：

- 服务名：`CodexChat`
- 程序：`F:\LayaProject\server\re\bin\node.exe`
- 参数：`F:\LayaProject\chat\bridge.cjs`
- 工作目录：`F:\LayaProject`
- 启动类型：自动
- 崩溃：自动重启（5s）
- 日志：`chat/service/chat_service.log`（10MB 轮转）
- 端口：`127.0.0.1:21121`

安装前会自动停止手动运行的 chat bridge（21121 端口），避免端口冲突。

## 常用命令

```bat
chat\service\nssm.exe status CodexChat
chat\service\nssm.exe restart CodexChat
chat\service\nssm.exe stop CodexChat
chat\service\nssm.exe start CodexChat
```

## 卸载

右键 **以管理员身份运行** `uninstall.bat`：仅移除 `CodexChat` 服务，保留 `chat/` 文件与配置。

## 文件

- `nssm.exe`：从 `server/re/frp/nssm.exe` 拷贝
- `ontask.bat`：安装 + 启动
- `uninstall.bat`：停止 + 移除
- `kill_manual.ps1`：停止手动 bridge（端口 21121）
