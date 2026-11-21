window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/aif.js"]={
  "location": [-905, 520],
  "width": 300,
  "height": 220,
  "name": "aiF",
  "label": "AI 辅助：Codex 远程同步聊天 + 微信通道",
  "type": "Group",
  "desc": "AI 辅助分支：提取 OpenClaw(龙虾) 微信插件协议 → chat/ 独立桥 → Codex CLI 远程会话 → chat.html 微信式对话列表 / codex.html 配置页（工作目录、模型）→ normalgame 静态发布 + 阿里云 ECS 部署。不改游戏主链路；消息只存本地，不经过游戏云数据库。",
  "inputs": [{"name": "AI辅助指令", "type": "Event"}],
  "outputs": [{"name": "辅助完成", "type": "Event"}],
  "use_custom_color": true,
  "color": [0.25, 0.65, 0.85],
  "node_tree": {
    "name": "AI 辅助 子树",
    "nodes": {
      "fPlan": {
        "location": [0, 0], "width": 270, "height": 190,
        "name": "fPlan", "label": "需求与边界", "type": "规则",
        "desc": "目标：微信(OpenClaw/龙虾同款) ↔ Codex ↔ Web 远程同步。非目标：不改 index.html、不碰游戏社交/对局代码、不走游戏云数据库。允许修改：chat/*、server/re/codex.js、server/re/server.js(codex.*)、server/cloud/public/{codex,chat}.html、docs。验收：e2e 17/17 + 截图目检 + 生产 URL 200。",
        "inputs": [{"name": "AI辅助指令", "type": "Event"}],
        "outputs": [{"name": "边界与验收", "type": "Event"}]
      },
      "fChannel": {
        "location": [320, 0], "width": 280, "height": 210,
        "name": "fChannel", "label": "微信通道（龙虾协议）", "type": "流程",
        "desc": "chat/plugin/wechat.cjs 从 freestylefly/openclaw-wechat 提取：ProxyClient(/v1/iPadLogin,/v1/getIPadLoginInfo,/v1/sendText,/v1/sendImage2,/v1/webhook/register)；webhook 60001/80001；data.{fromUser,fromGroup,content,newMsgId}；newMsgId 30 分钟去重；2000 字分段；群聊回 fromGroup。",
        "inputs": [{"name": "边界与验收", "type": "Event"}],
        "outputs": [{"name": "微信通道", "type": "Event"}]
      },
      "fBridge": {
        "location": [640, 0], "width": 280, "height": 210,
        "name": "fBridge", "label": "Codex 会话桥", "type": "流程",
        "desc": "server/re/codex.js: codex exec --json --skip-git-repo-check -s sandbox -m model；按 peer 保存 thread_id 并 resume；stdio 必须 ['ignore','pipe','pipe']；解析 thread.started/item.completed(agent_message)/turn.completed；resolveBin 用 --version 校验 codex-cli，防 where 命中 codex.js。",
        "inputs": [{"name": "微信通道", "type": "Event"}],
        "outputs": [{"name": "Codex会话", "type": "Event"}]
      },
      "fUI": {
        "location": [960, 0], "width": 280, "height": 210,
        "name": "fUI", "label": "聊天页 + 配置页", "type": "流程",
        "desc": "chat/public/chat.html: 微信式对话列表(左) + 聊天(右) + 未读徽标 + 新建聊天 + SSE。codex.html: API Base/Token、工作目录、模型下拉、沙箱、微信 apiKey/proxyUrl/webhook、阿里云 ECS 终端 URL。所有 /api/* 带 X-Cx-Token。",
        "inputs": [{"name": "Codex会话", "type": "Event"}],
        "outputs": [{"name": "页面与配置", "type": "Event"}]
      },
      "fDeploy": {
        "location": [1280, 0], "width": 280, "height": 220,
        "name": "fDeploy", "label": "normalgame / ECS 部署", "type": "流程",
        "desc": "静态页: chat/deploy/sync-codex-html.cjs --deploy → server/cloud/public → wrangler deploy（NODE_OPTIONS=--dns-result-order=ipv4first）→ https://www.normalgame.cn/codex.html，不替换 index。桥公网: frpc 21121→5002 + nginx /codex-api/。ECS: install-ecs.sh + systemd codex-chat；Workbench 登录态过期需先登录。",
        "inputs": [{"name": "页面与配置", "type": "Event"}],
        "outputs": [{"name": "部署验证", "type": "Event"}]
      },
      "fTest": {
        "location": [1600, 0], "width": 280, "height": 210,
        "name": "fTest", "label": "实测与截图", "type": "规则",
        "desc": "chat/test/e2e.cjs: mock-proxy + mock Codex，17 断言（登录/webhook/私聊/群聊/去重/配置/模型/ECS URL）+ ui-chat.png/ui-codex.png；必须 view_image 目检。生产页用 chat/test/shoturl.cjs 截图。禁止只跑静态断言不做真实消息回环。",
        "inputs": [{"name": "部署验证", "type": "Event"}],
        "outputs": [{"name": "实测证据", "type": "Event"}]
      },
      "fBackfill": {
        "location": [1920, 0], "width": 280, "height": 190,
        "name": "fBackfill", "label": "回填工作流", "type": "规则",
        "desc": "回填 docs/handover.md h17 + h12 模块行 + docs/auto/state.json；记录生产 URL、token 存放位置、ECS 登录阻塞点；提交并推送。未回填=本轮未完成。",
        "inputs": [{"name": "实测证据", "type": "Event"}],
        "outputs": [{"name": "辅助完成", "type": "Event"}]
      }
    },
    "links": [
      {"from_node": "__group_in__", "from_socket": "AI辅助指令", "from_socket_identifier": "AI辅助指令", "from_socket_type": "Event", "to_node": "fPlan", "to_socket": "AI辅助指令", "to_socket_identifier": "AI辅助指令", "to_socket_type": "Event"},
      {"from_node": "fPlan", "from_socket": "边界与验收", "from_socket_identifier": "边界与验收", "from_socket_type": "Event", "to_node": "fChannel", "to_socket": "边界与验收", "to_socket_identifier": "边界与验收", "to_socket_type": "Event"},
      {"from_node": "fChannel", "from_socket": "微信通道", "from_socket_identifier": "微信通道", "from_socket_type": "Event", "to_node": "fBridge", "to_socket": "微信通道", "to_socket_identifier": "微信通道", "to_socket_type": "Event"},
      {"from_node": "fBridge", "from_socket": "Codex会话", "from_socket_identifier": "Codex会话", "from_socket_type": "Event", "to_node": "fUI", "to_socket": "Codex会话", "to_socket_identifier": "Codex会话", "to_socket_type": "Event"},
      {"from_node": "fUI", "from_socket": "页面与配置", "from_socket_identifier": "页面与配置", "from_socket_type": "Event", "to_node": "fDeploy", "to_socket": "页面与配置", "to_socket_identifier": "页面与配置", "to_socket_type": "Event"},
      {"from_node": "fDeploy", "from_socket": "部署验证", "from_socket_identifier": "部署验证", "from_socket_type": "Event", "to_node": "fTest", "to_socket": "部署验证", "to_socket_identifier": "部署验证", "to_socket_type": "Event"},
      {"from_node": "fTest", "from_socket": "实测证据", "from_socket_identifier": "实测证据", "from_socket_type": "Event", "to_node": "fBackfill", "to_socket": "实测证据", "to_socket_identifier": "实测证据", "to_socket_type": "Event"},
      {"from_node": "fBackfill", "from_socket": "辅助完成", "from_socket_identifier": "辅助完成", "from_socket_type": "Event", "to_node": "__group_out__", "to_socket": "辅助完成", "to_socket_identifier": "辅助完成", "to_socket_type": "Event"}
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/aif.js"];
