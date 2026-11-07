window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/aidev.js"]={
  "location": [
    -905.31,
    159.74
  ],
  "width": 240,
  "name": "aidev",
  "label": "AI 开发辅助",
  "type": "Group",
  "desc": "AI 开发闭环：web-api+tool 浏览器自动化把网页 AI 转 OpenAI 兼容 API(含工具调用中继) → com.layabox.mcp 在 LayaAir IDE 起 SSE MCP(动态 tool/prompt、跨进程回调) → AI 自动编译 → 自动运行 web → 浏览器自动测试 → 自动服务端配置 → 自动上传/发布，测试反馈回灌形成迭代。",
  "inputs": [
    {
      "name": "开发指令",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "编译运行",
      "type": "Event"
    },
    {
      "name": "服务端部署",
      "type": "Event"
    },
    {
      "name": "上线",
      "type": "Event"
    }
  ],
  "use_custom_color": true,
  "color": [
    0.6,
    0.4,
    0.9
  ],
  "group_output_location": [
    1446.8,
    258.65
  ],
  "height": 198,
  "node_tree": {
    "name": "AI 开发辅助 子树",
    "nodes": {
      "ai1": {
        "location": [
          -203.24,
          -4.19
        ],
        "width": 240,
        "name": "ai1",
        "label": "Web-to-API 桥接",
        "type": "代码",
        "desc": "web-api+tool：DrissionPage 控制本地 Chrome，把 ChatGPT/Grok/DeepSeek 等网页 AI 转成 OpenAI 兼容 /v1/chat/completions(SSE 流式)。FastAPI 服务 127.0.0.1:8199，作为 AI 大脑供 MCP 客户端(Cursor/Claude/Qoder)调用。start.bat 一键起 venv+独立 Chrome+API。",
        "inputs": [
          {
            "name": "开发指令",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "模型响应",
            "type": "Event"
          }
        ],
        "height": 160
      },
      "ai2": {
        "location": [
          158.94,
          -76.59
        ],
        "width": 240,
        "name": "ai2",
        "label": "工具调用中继",
        "type": "规则",
        "desc": "ToolSchemaConformer 对齐 OpenAI / Anthropic(input_schema) / Gemini(parameters) 三种工具声明；ToolCallStreamParser 解析 5 种工具调用文本格式；续聊保留 tool_calls 配对；深度思考走 reasoning_content 独立通道，流式头部净化。把网页 AI 输出转成标准 tool_calls。",
        "inputs": [
          {
            "name": "模型响应",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "工具调用",
            "type": "Event"
          }
        ],
        "height": 160
      },
      "ai3": {
        "location": [
          477.99,
          -80.41
        ],
        "width": 240,
        "name": "ai3",
        "label": "并发与自恢复",
        "type": "流程",
        "desc": "request_manager：FIFO 队列+全局锁+取消/客户端断开检测。多账号实例(browser_config INSTANCES，deploy profile，相对 user_data_dir)；页面可用性守卫 PageUnavailableError、_wait_for_composer 等 SPA 渲染、显式代理注入、faulthandler 崩溃落盘、uploads 提示词分片(FILE/CHUNKED)。",
        "inputs": [
          {
            "name": "工具调用",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "稳定会话",
            "type": "Event"
          }
        ],
        "height": 170
      },
      "ai4": {
        "location": [
          831.02,
          -74.24
        ],
        "width": 240,
        "name": "ai4",
        "label": "Laya MCP 服务器",
        "type": "代码",
        "desc": "com.layabox.mcp 插件在 IDE liveServer(Express) 起 SSE MCP：GET {liveServer.url}/ai/mcp + POST /ai/mcp-messages?sessionId。server name LayaAirIDE；资源 res://{uuid}(asset)、内置 tool get-product-version、prompt greeting。MCP 客户端填该 URL 接入。",
        "inputs": [
          {
            "name": "稳定会话",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "MCP 通道",
            "type": "Event"
          }
        ],
        "height": 160
      },
      "ai5": {
        "location": [
          1126.59,
          -74.31
        ],
        "width": 240,
        "name": "ai5",
        "label": "工具/提示动态注册",
        "type": "规则",
        "desc": "@IEditor.mcp.tool(UI进程) / @IEditorEnv.mcp.tool(场景进程) 装饰器注册 tool/prompt；handlers 分 scene/editor/package。reload() 热更新并 sendToolListChanged/PromptListChanged；参数经 parsePropType→Zod(required/type/desc)。用户脚本加载即 reload。",
        "inputs": [
          {
            "name": "MCP 通道",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "可调用工具",
            "type": "Event"
          }
        ],
        "height": 160
      },
      "ai6": {
        "location": [
          150.41,
          246.43
        ],
        "width": 240,
        "name": "ai6",
        "label": "跨进程回调路由",
        "type": "流程",
        "desc": "toolCallback：场景进程回调直接执行；UI进程回调(callback 为 id)经 EditorEnv.runUIScript(\"McpPluginEditor.invokeCallback\", id, args)；promptCallback 经 port.invoke(\"invoke-mcp-callback\")。UI handlers 由 runSceneScript(\"McpPluginEnv.syncUIHandlers\") 同步。",
        "inputs": [
          {
            "name": "可调用工具",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "IDE 操作",
            "type": "Event"
          }
        ],
        "height": 160
      },
      "ai7": {
        "location": [
          468.07,
          272.33
        ],
        "width": 240,
        "name": "ai7",
        "label": "自动编译",
        "type": "流程",
        "desc": "AI 经 MCP 工具触发 LayaAir 编译/构建：TS→JS 产物、资源刷新(flushChanges)。编译错误回传 AI 修正。",
        "inputs": [
          {
            "name": "IDE 操作",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "编译产物",
            "type": "Event"
          }
        ],
        "height": 133,
        "use_custom_color": true,
        "color": [
          0.3,
          0.7,
          0.45
        ]
      },
      "ai8": {
        "location": [
          785.53,
          265.12
        ],
        "width": 240,
        "name": "ai8",
        "label": "自动运行 Web 端",
        "type": "流程",
        "desc": "启动/刷新 IDE liveServer 预览，浏览器自动化打开 web 运行页(index.html)。产出可交互运行页面供测试。",
        "inputs": [
          {
            "name": "编译产物",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "运行页面",
            "type": "Event"
          },
          {
            "name": "编译运行",
            "type": "Event"
          }
        ],
        "height": 155,
        "use_custom_color": true,
        "color": [
          0.3,
          0.7,
          0.45
        ]
      },
      "ai9": {
        "location": [
          -153.71,
          524.55
        ],
        "width": 240,
        "name": "ai9",
        "label": "自动测试",
        "type": "流程",
        "desc": "浏览器自动化驱动运行页：点击/输入/断言，覆盖启动→菜单→选局→匹配→对局黄金路径与边界；采集 console/network 错误回传 AI。",
        "inputs": [
          {
            "name": "运行页面",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "测试反馈",
            "type": "Event"
          }
        ],
        "height": 140,
        "use_custom_color": true,
        "color": [
          0.3,
          0.7,
          0.45
        ]
      },
      "ai10": {
        "location": [
          286.39,
          521.96
        ],
        "width": 240,
        "name": "ai10",
        "label": "自动服务端配置",
        "type": "流程",
        "desc": "deploy Chrome profile 登录 AGC / Cloudflare 控制台：配置云函数(te/user、mag)、wrangler vars/secrets、CloudDB zone(User/NG)；或经 API/CLI 下发。对应服务端后端 srv 分组。",
        "inputs": [
          {
            "name": "测试反馈",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "部署就绪",
            "type": "Event"
          },
          {
            "name": "服务端部署",
            "type": "Event"
          }
        ],
        "height": 155,
        "use_custom_color": true,
        "color": [
          0.3,
          0.7,
          0.45
        ]
      },
      "ai11": {
        "location": [
          787.97,
          537.28
        ],
        "width": 240,
        "name": "ai11",
        "label": "自动上传 / 发布",
        "type": "流程",
        "desc": "编译产物与资源上传/发布：web 资源发布、云函数部署(wrangler deploy / AGC 上传)。上线结果回传。",
        "inputs": [
          {
            "name": "部署就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "上线",
            "type": "Event"
          }
        ],
        "height": 133,
        "use_custom_color": true,
        "color": [
          0.3,
          0.7,
          0.45
        ]
      },
      "ai12": {
        "location": [
          -288.75,
          283.18
        ],
        "width": 240,
        "name": "ai12",
        "label": "反馈闭环",
        "type": "规则",
        "desc": "测试反馈/错误 → 回灌 AI 大脑(ai1)，触发下一轮 修改→编译→运行→测试→部署，形成自动迭代闭环。",
        "inputs": [
          {
            "name": "测试反馈",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "开发指令",
            "type": "Event"
          }
        ],
        "height": 133,
        "use_custom_color": true,
        "color": [
          0.6,
          0.4,
          0.9
        ]
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "开发指令",
        "from_socket_identifier": "开发指令",
        "from_socket_type": "Event",
        "to_node": "ai1",
        "to_socket": "开发指令",
        "to_socket_identifier": "开发指令",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai1",
        "from_socket": "模型响应",
        "from_socket_identifier": "模型响应",
        "from_socket_type": "Event",
        "to_node": "ai2",
        "to_socket": "模型响应",
        "to_socket_identifier": "模型响应",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai2",
        "from_socket": "工具调用",
        "from_socket_identifier": "工具调用",
        "from_socket_type": "Event",
        "to_node": "ai3",
        "to_socket": "工具调用",
        "to_socket_identifier": "工具调用",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai3",
        "from_socket": "稳定会话",
        "from_socket_identifier": "稳定会话",
        "from_socket_type": "Event",
        "to_node": "ai4",
        "to_socket": "稳定会话",
        "to_socket_identifier": "稳定会话",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai4",
        "from_socket": "MCP 通道",
        "from_socket_identifier": "MCP 通道",
        "from_socket_type": "Event",
        "to_node": "ai5",
        "to_socket": "MCP 通道",
        "to_socket_identifier": "MCP 通道",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai5",
        "from_socket": "可调用工具",
        "from_socket_identifier": "可调用工具",
        "from_socket_type": "Event",
        "to_node": "ai6",
        "to_socket": "可调用工具",
        "to_socket_identifier": "可调用工具",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai6",
        "from_socket": "IDE 操作",
        "from_socket_identifier": "IDE 操作",
        "from_socket_type": "Event",
        "to_node": "ai7",
        "to_socket": "IDE 操作",
        "to_socket_identifier": "IDE 操作",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai7",
        "from_socket": "编译产物",
        "from_socket_identifier": "编译产物",
        "from_socket_type": "Event",
        "to_node": "ai8",
        "to_socket": "编译产物",
        "to_socket_identifier": "编译产物",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai8",
        "from_socket": "运行页面",
        "from_socket_identifier": "运行页面",
        "from_socket_type": "Event",
        "to_node": "ai9",
        "to_socket": "运行页面",
        "to_socket_identifier": "运行页面",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai9",
        "from_socket": "测试反馈",
        "from_socket_identifier": "测试反馈",
        "from_socket_type": "Event",
        "to_node": "ai10",
        "to_socket": "测试反馈",
        "to_socket_identifier": "测试反馈",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai9",
        "from_socket": "测试反馈",
        "from_socket_identifier": "测试反馈",
        "from_socket_type": "Event",
        "to_node": "ai12",
        "to_socket": "测试反馈",
        "to_socket_identifier": "测试反馈",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai10",
        "from_socket": "部署就绪",
        "from_socket_identifier": "部署就绪",
        "from_socket_type": "Event",
        "to_node": "ai11",
        "to_socket": "部署就绪",
        "to_socket_identifier": "部署就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai12",
        "from_socket": "开发指令",
        "from_socket_identifier": "开发指令",
        "from_socket_type": "Event",
        "to_node": "ai1",
        "to_socket": "开发指令",
        "to_socket_identifier": "开发指令",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai8",
        "from_socket": "编译运行",
        "from_socket_identifier": "编译运行",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "编译运行",
        "to_socket_identifier": "编译运行",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai10",
        "from_socket": "服务端部署",
        "from_socket_identifier": "服务端部署",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "服务端部署",
        "to_socket_identifier": "服务端部署",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai11",
        "from_socket": "上线",
        "from_socket_identifier": "上线",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "上线",
        "to_socket_identifier": "上线",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/aidev.js"];
