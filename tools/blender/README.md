# Blender MCP（姿态动画）

## 已验证可用（2026-11-22）

- Blender：`F:\ENV\3D\blender\blender.exe`，版本 **5.3.0 Alpha**
- MCP 服务：`mcp-for-blender 2.3.1`（ahujasid/mcp-for-blender，MIT）
- venv：`C:\Users\mien\.codex\blender-mcp\.venv`
- Blender 插件：`C:\Users\mien\AppData\Roaming\Blender Foundation\Blender\5.3\scripts\addons\mcp_for_blender.py`
- Blender socket：`127.0.0.1:9876`
- Codex MCP 配置：`~/.codex/config.toml` 的 `[mcp_servers.blender]`

MCP 工具（重启 Codex 后出现）：

- `execute_blender_code`：在 Blender 内执行任意 bpy Python（姿态/骨骼/关键帧/约束）
- `look`：截取视口/帧，返回 PNG
- `get_scene_info` / `get_addon_status`
- `generate_3d` / `search_assets` / `import_asset` 等

## 启动

```bat
F:\LayaProject\tools\blender\start_blender_mcp.bat
:: 打开指定工程：
F:\LayaProject\tools\blender\start_blender_mcp.bat F:\path\character.blend
```

启动脚本会等 Blender UI 起来后调用 `bpy.ops.blendermcp.start_server()`，监听 9876。  
原因：Blender 5.3 Alpha 直接正常启动时，插件 auto-start timer 未触发；用本 launcher 的 `bpy.app.timers` 可稳定启动。

## 实测姿态动画

通过 MCP `execute_blender_code` 创建：

- 骨架 `MCP_PoseRig`：`root -> spine -> arm`
- Action `MCP_PoseAction`
- 帧 1 / 20 / 40 插入 `rotation_euler` 关键帧
- 结果：`layers=1, slots=1, fcurves=6`
- 帧 20：`spine=(0.5,0,0.6)`、`arm=(0,0,0.3)`
- 调整测试：帧 20 改为 `spine=(0.2,0.3,0.4)` 并重新 keyframe，成功

## Codex 配置

```toml
[mcp_servers.blender]
command = "C:/Users/mien/.codex/blender-mcp/.venv/Scripts/mcp-for-blender.exe"
args = ["--host", "127.0.0.1", "--port", "9876"]
startup_timeout_sec = 60
```

改完必须**完全退出并重启 Codex**，侧栏工具里才会出现 `mcp__blender__*`。

## 重新安装（换机器/升级）

```powershell
# 1) venv + MCP server
F:\ENV\3D\blender\5.3\python\bin\python.exe -m venv C:\Users\mien\.codex\blender-mcp\.venv
C:\Users\mien\.codex\blender-mcp\.venv\Scripts\python.exe -m pip install mcp-for-blender

# 2) addon
$d="$env:APPDATA\Blender Foundation\Blender\5.3\scripts\addons"
New-Item -ItemType Directory -Force $d
Copy-Item "C:\Users\mien\.codex\blender-mcp\.venv\Lib\site-packages\blender_mcp\bundled\addon.py" "$d\mcp_for_blender.py"

# 3) 启用（一次性；或用 Blender UI 启用 Interface: MCP for Blender）
F:\ENV\3D\blender\blender.exe --background --python-expr "import bpy; bpy.ops.preferences.addon_enable(module='mcp_for_blender'); bpy.ops.wm.save_userpref()"

# 4) 用 launcher 启动 Blender
tools\blender\start_blender_mcp.bat
```

## Qoder

全局配置：`C:\Users\mien\.qoder\mcp.json`（已备份为 `mcp.json.bak-blender`）。

```json
{
  "mcpServers": {
    "blender": {
      "type": "stdio",
      "command": "C:/Users/mien/.codex/blender-mcp/.venv/Scripts/mcp-for-blender.exe",
      "args": ["--host", "127.0.0.1", "--port", "9876"],
      "env": { "PYTHONIOENCODING": "utf-8" }
    }
  }
}
```

使用前先运行 `tools\blender\start_blender_mcp.bat`，再打开 Qoder。Qoder 会启动 `mcp-for-blender`，连接 Blender 9876。已验证 `tools/list` 10 个工具、`get_scene_info` 成功。
