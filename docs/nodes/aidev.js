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
  "desc": "AI 开发闭环：先在工作流策划/细化（需求、条件动作、方案、验收）→ 执行 → IDE 编译 → 浏览器验证 → 回填工作流。IDE 内置 AI 调度浏览器自动化与 Laya MCP，不接入网页 AI；失败先更新策划再迭代。部署/发布仅在明确授权且验收通过后执行；本地验证与线上交付分别记录。",
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
      "ai14": {
        "location": [
          -880,
          -4.19
        ],
        "width": 260,
        "name": "ai14",
        "label": "工作流优先纪律(硬规则)",
        "type": "规则",
        "desc": "【用户明确 2026-11-19】所有工作必须基于工作流开展, 禁止凭记忆/ improvisation: ①每轮开工先读 docs/handover.md h0(登录态)/h12(模块地图, 改哪块读哪行)/h13(授权与续跑)/h15(验收硬规则) + docs/auto/state.json(从 next 续跑) + 本图对应分支节点; ②执行沿工作流链路: 策划(aiPlan)→实现→h2 tsc→h3 离线测试→h4 打包→h5/ai13 浏览器实测(联机按 ai13 第6条双客户端)→h6-h8 部署→生产复验→ai12 回填; ③每轮结束回填 handover/节点/state.json, 未回填=本轮未完成; ④发现工作流与代码不符: 先修工作流或先修代码使两者一致, 不允许绕过; ⑤遗忘/偏离工作流导致功能不符=验收失败重做。",
        "inputs": [
          {
            "name": "开发指令",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "纪律就绪",
            "type": "Event"
          }
        ],
        "height": 190,
        "use_custom_color": true,
        "color": [
          0.8,
          0.3,
          0.3
        ]
      },
      "aiF": {
        "location": [
          -870,
          430
        ],
        "width": 300,
        "height": 220,
        "name": "aiF",
        "label": "AI 辅助：Codex 远程同步聊天 + 微信通道",
        "type": "Group",
        "desc": "AI 辅助分支(aif)：提取 OpenClaw/龙虾微信插件协议 → chat/ 独立桥 → Codex CLI 远程会话 → chat.html/codex.html → normalgame 静态发布 + 阿里云 ECS。详见 docs/nodes/aif.js 与 h17。",
        "inputs": [
          {
            "name": "AI辅助指令",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "辅助完成",
            "type": "Event"
          }
        ],
        "use_custom_color": true,
        "color": [
          0.25,
          0.65,
          0.85
        ],
        "node_tree_file": "nodes/aif.js"
      },
      "aiPlan": {
        "location": [
          -600,
          -4.19
        ],
        "width": 270,
        "height": 180,
        "name": "aiPlan",
        "label": "先策划 / 细化（执行前置）",
        "type": "Group",
        "desc": "任何执行与返工先回到工作流：需求 → 条件动作 → 实现方案 → 验收策划。策划落图后才交给 ai1 执行；保留已有变更、布局与 unused 历史。 开工前置(ai14 硬规则): 先读 handover h0/h12/h13/h15 + docs/auto/state.json, 按模块地图定位分支, 禁止凭记忆开工。",
        "inputs": [
          {
            "name": "开发指令",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "策划完成",
            "type": "Event"
          }
        ],
        "use_custom_color": true,
        "color": [
          0.6,
          0.4,
          0.9
        ],
        "node_tree_file": "nodes/aiPlan.js"
      },
      "ai1": {
        "location": [
          -203.24,
          -4.19
        ],
        "width": 240,
        "name": "ai1",
        "label": "执行方案 / AI 调度浏览器",
        "type": "规则",
        "desc": "仅接收 aiPlan 已落图的细化方案，IDE AI(Qoder/Cursor/Claude 等内置大模型)在授权文件范围内执行修改并生成自动化操作序列，经 web-api+tool 的 DrissionPage 调度浏览器与 Laya MCP；不接入网页 AI、不做网页 AI 转 OpenAI API 的桥接。执行完成后必须编译、浏览器验证并回填工作流。",
        "inputs": [
          {
            "name": "开发指令",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "调度指令",
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
        "label": "浏览器自动化基座",
        "type": "代码",
        "desc": "web-api+tool 只取其浏览器自动化部分：DrissionPage 接管/启动本地 Chrome(独立 user_data_dir、deploy profile)，执行 AI 下发的导航、点击/输入/截图等操作并采集 console/network，作为浏览器接入 web 端游戏运行页的执行层。",
        "inputs": [
          {
            "name": "调度指令",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "浏览器控制",
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
        "label": "会话守卫与自恢复",
        "type": "流程",
        "desc": "复用 web-api+tool 的会话保障能力：多实例(browser_config INSTANCES，deploy profile，相对 user_data_dir)、页面可用性守卫 PageUnavailableError、_wait_for_composer 等 SPA 渲染等待、显式代理注入、faulthandler 崩溃落盘，保障 AI 长时间调度浏览器的会话稳定。",
        "inputs": [
          {
            "name": "浏览器控制",
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
        "desc": "执行后经 MCP 触发 LayaAir 编译/构建：TS→JS、资源刷新(flushChanges)。核对最终构建日志，不把工具等待超时等同构建失败；独立记录 tsc 新增错误与既有错误。成功进入浏览器验证，失败先回填工作流再细化修复方案。",
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
          },
          {
            "name": "编译失败",
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
        "label": "浏览器验证 / 自动测试",
        "type": "流程",
        "desc": "编译成功后按 aiPlan 验收策划在真实引擎运行页验证，不能以语法/tsc代替浏览器验证。浏览器自动化执行点击/输入/断言，按修改范围覆盖启动→菜单→选局→匹配→对局路径或专项边界；采集 console/network 和测试结果，先交 ai12 回填工作流。 截图目视自检为硬规则: 每个关键状态截图后 AI 自己 view_image 核对 UI/状态, 详见 ai13。",
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
      "ai13": {
        "location": [
          -153.71,
          700
        ],
        "width": 240,
        "name": "ai13",
        "label": "截图目视自检(硬规则)",
        "type": "规则",
        "desc": "【完成验收硬规则(用户明确 2026-11-19)】游戏/玩法/UI 任何改动, 宣称完成前必须: (1)真实浏览器跑对应探针覆盖全路径(入口→模式→对局→控制→伤害→结算→退出→重进); (2)每个关键状态截图, AI 必须自己 view_image 逐张目视核对 UI/布局/状态(血条位置/角色对齐/残留节点/按钮可见/文本正确), 自主发现 bug; (3)数值断言与目视核对双通过才算完成, 矛盾即失败; (4)多人通讯改动必须多浏览器实例多账号实测(mcdrive/mc3drive), 禁止单端臆测; (5)只靠用户反馈发现问题=验收失败; (6)联机/多人功能必须双独立账号双客户端(双 profile/双 CDP/真实 GOBE)真实跑全链路: 建房/匹配→双方进房→回合轮流→伤害→结算→再来一局→退出离房; 控制方式=植入代码(page.ev 调游戏 API)+真实鼠标拖拽/点击混合; 单客户端自测不算联机验证; 探针 local/g2mcdrive.cjs(g2)与 mcdrive/mc3drive(社交)。探针清单: local/g2selftest.cjs(g2单机全路径+6截图+14断言), g2fireprobe.cjs(控制/时钟诊断), play_probe.cjs(拖拽控制), g2probe.cjs(入口链路), prod_g2.cjs/prod_g2full.cjs(生产CDN复验, full 14断言+6截图), mcdrive.cjs/mc3drive.cjs(社交多客户端)。headless Edge 坑: 加 --no-sandbox(AppContainer 崩溃 0xC0000005), boot 失败重试一次; CDP 轮询必须走 exec_command 的 node(node_repl 回环 EACCES)。",
        "inputs": [
          {
            "name": "测试反馈",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "目视通过",
            "type": "Event"
          }
        ],
        "height": 160,
        "use_custom_color": true,
        "color": [
          0.8,
          0.4,
          0.2
        ]
      },
      "ai12": {
        "location": [
          -288.75,
          283.18
        ],
        "width": 240,
        "name": "ai12",
        "label": "回填工作流 / 反馈闭环",
        "type": "规则",
        "desc": "本轮(加号/群/身价/屏蔽词/转交/个人页)回填: 服务端 te 增 ack/group 分支、msg 改只转交(单聊+群 gid, 屏蔽词 w=1)、读自己行响应附带 mes、friend 身价三路径(扣/到账/退还); 客户端 social.ts 转交缓存+ack+群+身价, ui/social.ts 加号菜单/群面板/红字, ui/personal.ts 左列表右panel+本地对局详情(LocalMatch IDB)+玩家加号, badm 结算存本地详情; 预制体 menu.ls item2(+菜单/身价/群)+item3(左tabs右panel)。验证: 离线114/114、tsc基线、ide-build+collect+tmpPack(ui.br31/nor.br55)、Edge CDP 9/9、doccheck新增0。边界/取舍: 身价=发送方付给接收方(accept到账/reject退还)已文档化; 屏蔽词常量表标记不拦截; 会话历史全本地、服务端 mes 仅未送达暂存; IDE 场景进程 reload 卡死不影响 build; 驱动端口冲突曾误导航登录窗口(已重开云存储 tab, 驱动改 9228); 生产上传待用户登录未执行。下一轮: 登录后 publish.py upload+tokens+线上复验。 【上线完成】用户登录华为云后覆盖上传 ui.br/nor.br/js/bundle.js(令牌不变), 生产 normalgame.cn 冒烟 9/9 通过(加号菜单/身价/群面板/个人页左列表右panel/战绩空态/零异常)。本轮闭环: 策划→实施→离线114/114→tsc→发布/收集/打包→浏览器9/9→上传→生产复验→回填。 【通讯修复闭环】te 部署成功(v1116a, probe bag/sync/ack code0+mes 附带); js/bundle.js 504040 上传成功(真实点击 js/ + 上传按钮流程); 生产冒烟 9/9。坑补充: 云函数\"函数代码\"tab 需真实鼠标点击才显示拖拽框(JS click 无效); 存储 js/ 目录需真实点击文件夹名+先点\"上传文件\"按钮再 input; 误传根目录 bundle.js 为冗余。Worker 待 CF 授权(wrangler login 会话等待中)。 【Worker 部署完成】wrangler login 用户授权后 deploy 成功(a5912aa0), /health wv=v1116a; 生产端到端 9/9。至此客户端/te/Worker/资源包全部上线一致, 通讯闭环。接管手册 h8 流程已验证(login 需保持会话存活+8976 清理)。 【item2 布局跑飞根因修复】Relation TopExt_Top(21) 移动顶边 vs BottomExt_Top(23) 顶边固定; item2 误用 21 致非设计分辨率顶边跑飞, 改 23 与兄弟页一致; 双分辨率复验+ui.br 上传+生产 9/9。引擎语义见 LayaAir3.4/src/layaAir/laya/ui2/Relation.ts applyOnSizeChanged。 【item3 tab 状态预制体化】GButton Radio + button 控制器(Record, 键序先于子节点) + GearDisplay(internalVisible) 呈现选中背景; 代码只赋值 selected。坑: controllers 序列化是 Record(按名键控)非数组; GearDisplay 改 internalVisible 非 visible; 背景外部 visible=false 会屏蔽齿轮。ui.br/bundle 已上传, 生产 9/9。 【本轮】背包3x5网格仅数量; 4tab(背包/战绩/设置/隐私); 设置并入个人页(pSet垂直滚动+隐私栏身价/屏蔽ID, item4节点移入, box4重定向); 身价=个人设置(setprice)非加好友付金币(修好友报错); buy 稳定性 probe×3 ok + 客户端直连降级回退 rescue。te/ui.br/bundle 已上线, 生产 12/12, 离线 114/114。 【GOBE 实时层】禁云轮询→lobby.ts 地区大厅房(100人,kind=lobby+region 标记)+setroom 记录+自动大厅群+onMessage 收消息落本地+sendTo 点对点(对方房)/云兜底(房不存在/无人)+freq 通知徽标; UI: 音量减半/图标放大减半/我的头像不缩放/+创建新聊天/+徽标/群≡菜单(成员/删好友/退群换房)。te(setroom/group leave/lobby群)/ui.br/bundle 已上线, 生产 14/14, 离线 114/114。边界: 双客户端 GOBE 点对点 E2E 待人工复验; 地区用 Intl 时区映射(无 IP 库)。 【新聊天/群分离+多客户端】convs 对话条目(新聊天无消息也显示); 大群广播/单玩家点对点; mcdrive.cjs 双客户端自主实测(双profile/双origin/双CDP)。已知通讯 bug 待修: setroom 未落库、非房主 updateRoom 拒→大厅群重复、freq/P2P/广播接收未验证。te/ui.br/bundle 已上线, 生产 UI 14/14, 离线 114/114。 【大区群单例】globby+地区码 get-or-create+oldLobbyGids 清理+pruneLobbyConvs(含历史消息)→单对话项; 社交消息走 CUSTOM+90; mcdrive 7/11(接收端 onRecvFromClient 未触发待 sdk 层查)。生产 UI 14/14、离线 39/39(social)、doccheck 0。te/bundle 已上线。 【GOBE 接收侧根因修复·本轮】双客户端 mcdrive 11/11 自主通过(注册/同大区房setroom/好友徽标/同意/新聊天nc=1/建对话/P2P hello-p2p/无云msg/大群广播hello-broadcast/大区群单例/无异常)。根因: ①sendToClient 的 type 是路由模式(0/1/2)非自定义消息类型, 旧 chatType=190→INVALID_MESSAGE(102016)拒发(sendFail 实锤); ②SDK onRecvFromClient 不带 imType→onMessage(type)永不触发。修: net.ts 增 ROUTE_ALL/OTHERS/TARGET 常量+chatType 标 deprecated; lobby/social 发送改 1(广播)/2(点对点); lobby.bindMsg 改 onClient catch-all 按 k 标签分发(chat/invite/invroom/freq/facc), 忽略 PVP kind 信封; freq→Social.sync 刷申请列表, accept→notifyFriendAccept(facc)→申请方自动重同步; Lobby.ensure 身份就绪本地重试。测试: 新增 lobby-receive.test.cjs(4项, 锁路由模式+catch-all+k分发); social.test mock 补 setSinks/notifyFriendAccept; mcdrive fresh profile+注册/进房就绪等待+uid JSON.stringify 净化+停留 add 面板等 req 渲染。离线 119/119, tsc 基线。待部署: bundle.js(客户端修复)+ui.br/nor.br(邀请/功能面板/长按转发预制体)需华为登录后上传; te/Worker 本轮未改无需重部署。 【转发/大区通讯真实修复·本轮】用户实测反馈转发未生效/未覆盖所有联系人/大区通讯失败。建 3 浏览器实例实测 local/mc3drive.cjs(同时开社交制造 createRoom 竞态+真实 Social.request/accept+转发)。修复: ①fwdTargets 覆盖所有好友(Social.state.f)+群(state.g)非仅已有对话; ②云兜底转发载荷(k 标签 JSON)在 handlePending 解析还原(chat/invite/invroom), 不再渲染原始 JSON; ③lobby.scheduleConverge 进房后纯 GOBE 重扫收敛到最小规范房号(解决同时进房分裂两房→大区广播互不可达, 无云调用)。mc3 9/9(三账号/竞态后收敛同房/B与C收大区广播/好友/转发覆盖含 peer/转发投递/无异常), 离线 121/121(增 handlePending 转发解析项)。js/bundle.js 559583 重传(doupload_js7 可靠版, GET 复核 MATCH)。架构模块地图已落 handover.md h12 + aihandover h10。 【自动登录+云调用最小化+新消息提醒·本轮】华为账号密码存于 Edge profile(edge-agc-login)自动填充, 点登录链接即自动登入(无需人工扫码)。云调用最小化: afterJoin(isLobby)仅大区房且房间号变化才 setroom/lobbygroup, 本地 localStorage 记录复用; 非大区房不写; sendRaw 单玩家不在同房直接云兜底不跳房。新消息提醒: Social.onNewMessage 钩子(slecet 注入 Au.tap+Dialog.toast 发送者:预览)+suppressNotify(看聊天时抑制), receiveLocal/handlePending 触发。离线 120/120(增 setroom 最小写入回归), tsc 基线。 【部署完成·本轮】华为自动登录(Edge profile 密码自动填充, 点登录链接即登入)→进应用控制台点云存储(cslp iframe)→上传 ui.br/nor.br(root)+js/bundle.js。坑: deploy_now.py 的 enter_dir(js) 未验帧重载致 bundle 误传根目录(GET 复核 size=512398 旧版无 marker); 改用可靠 doupload_js7.py(injs 以 GOBE.js 判+重取 frame+三策略点击+轮询大小)→GET 复核 js/bundle.js size=558345 MATCH 且 marker(lobby_room/suppressNotify/onNewMessage/ROUTE_TARGET/facc)全在。生产 socialdrive_prod 14/14、双客户端 mcdrive 11/11、离线 120/120、doccheck 新增 0。te/Worker 本轮未改无需重部署。 【远程中转/HTTPS/FTP/工作流·本轮】①/apim 同时挂载 HTTPS: nginx 443 server(normalgame.cn)加 location /apim 反代 5001, 实测 POST https://normalgame.cn/apim exec 成功(备份/root/default.bak.re2)。②修复本机连不上服务器 FTP: 根因 vsftpd listen_ipv6=YES 致 PASV 返回 0.0.0.0 忽略 pasv_address→数据连接失败; 改 listen=YES/listen_ipv6=NO 重启, PASV 正确返回公网 IP, 被动口 1024-1048 数据连接实测 OK(备份/root/vsftpd.conf.bak.re, 诊断 local/ftp_test.cjs)。③服务器接管法固化: cua 对 Edge 许可常拒→改 CDP(复制 Edge Profile1 会话到 local/edge-srv 启 9228→Workbench 免密→local/type_cmd.cjs 键入 xterm)。④全部写入工作流: 新增 nodes/prelay.js(r1→r7 架构/relay服务/frp隧道/服务器接管/nginx+FTP/NSSM自启/扩展优化)+index.js 注册+aihandover h12+handover.md h14; doccheck 新增 0。relay 代码全在 server/re/, 独立 frp 21119→5001 不碰远程控制 FRPC。 【g2 并入平台·本轮】第二游戏 g2(trace 对战)并入平台体系: ①新建 src/libs/games.ts 游戏注册表(GAMES+launchGame), gList 索引0=羽毛球(nor匹配流程)/1=g2, 可扩展; ②删除悬浮 NG2 按钮(slecet _registerG2Entry)与 ui2 平行菜单(index.ts ng2_ui2 劫持+ui2/g2pages/platformPages/newui 全删), 启动恒走正常 menu.ls; ③g2/libs 冗余分支全删: GNet→平台 libs/gobe/net(补 onDisconnect/reconnect), TimeManager→平台 libs/time(实例式可靠计时并入), MapManager→平台 libs/mpm MPMD(补 clearAll/removeObject), Res→src/g2/res.ts 游戏模块(底层用平台 libs/net+code); ④g2 场景在 nor 包(game/select.ls/trace.ls), Res.ResList.g2(g2.br)为 404  stale 项, 注册表 g2 用 nor 包+game/select.ls。验证: build/tsc(基线)/离线121 全绿, 无头探针点 gList[1] 成功加载渲染 g2 select 场景。select 页已重建为新版 G* UI(traceSel.ts 代码构建 GBox/GTextField+DrawRect 按钮: 轨迹对战·匹配/创建房间/返回), 清除 select.ls 旧 Box/List/Image/Label/TextArea 与物理节点(旧类型引擎未注册致 missing node type), 无头探针渲染正常无 missing 错误。遗留: g2 对战 trace.ls 依赖 2D 物理(StaticCollider/RigidBody/BoxShape2D)模块未入包+res.res 资源(catgirl)加载待修, 需补 2D 物理模块与 g2 资源管线才能跑对战。 【自动修复·本轮】①平台 Code 补 decompressFileByName(异步 Blob 容器, 包装 extractFile)接通 g2 res.res 管线; ②select 页新版 G* UI 实测渲染+匹配按钮可点击进 trace.ls; ③2D 物理: IDE 的 laya.physics2D.js+laya.box2D.js 与项目 core 同版本3.3.13, 但直接 script 标签加载(无论 d3 后或末尾)启动即抛 reading I(physics2D 需 IDE 装载器初始化 box2D 全局, 非裸脚本), 已回退保平台稳定。结论: g2 对战需按 IDE 引擎装载方式集成 box2D/physics2D(或从 LayaAir3.4 源码构建匹配模块)+房间流程+res.res 资源, 属独立工程。入口/选择/平台并入已稳定验证(build/tsc/121测试/doccheck 全绿)。 【单机模式·本轮】修 null.then(traceSel 误用 g2 同步 Res.get(...).then, 改平台 PRes Promise 加载场景); 选择页加「单机模式·人机」按钮(__g2Offline); Main 单机兜底(master 节点缺失时代码建 sprite+res.res 失败 3s 兜底开局+防重复); Cha 无 2D 物理回退(noPhysics 时 getRB 守卫+stub rigidBody+手动速度积分移动), 不再依赖 RigidBody/physics2D 模块。实测单机 battleStarted=true、角色血条/力度条渲染、本地 AI 对战运行、无 instanceof 报错。联机对战仍需 box2D/physics2D 正确装载(独立工程)。 【可玩性真修·本轮】承认此前「实测可玩」只查了开局+渲染、未验操作, 不合格。本轮用模拟鼠标输入真测: ①修 __ng2Battle 仅联机分支赋值→offline 也赋值; ②offline 用全屏 stage 容器(getBattleArea)+屏内坐标(原 trace.ls 相机+负坐标致角色出屏不可玩); ③Cha 手动移动改 Laya.timer.frameLoop 驱动(Script.onLateUpdate 此引擎不回调, lateTick=0 实锤)+场地边界反弹留屏内。play_probe.cjs 模拟 drag→force 5000→5410(AIM_RESPONDS true)、endPrepPhase 后角色移动且边界内(MOVED true)。单机现真正可操作: 瞄准/力度/发射/移动/反弹。视觉仍为占位(血条/方块), Spine 角色需 res.res 管线。 【sprite动画+g2独立包·本轮】用户指出 g2 sprite 不应放 nor(羽毛球包)。①tmpPack 增 g2 包(web/g2/*→g2.br, TOP_EXCLUDE 加 g2), g2 场景 select/trace+sprite+BagList 移入 web/g2/, nor 不再含 g2; ②dragonbones-local-web 增 sprite-creator.html(画布绘 15 帧猫女战士: idle0-4/move4-8/attack8-13/hit14, 5列x3行128px), local/gen_sprite.cjs 无头导出 hero.png+hero_frames.json 到 g2/sprite; ③Cha 离线 spriteTick 按状态切帧 drawTexture 子贴图渲染角色(替代占位球), 实测三角色均渲染 sprite 动画; ④games.ts g2 改 packKey g2+entryScene g2/game/select.ls, traceSel/cha 路径改 g2/。说明: 内置 image_gen 工具本环境不可用且无 OPENAI_API_KEY, 故用画布程序化生成 sprite(非 AI 图); 如需 AI 绘制角色帧可再补。验证 build/tsc/121/doccheck 全绿。",
        "inputs": [
          {
            "name": "测试反馈",
            "type": "Event"
          },
          {
            "name": "编译失败",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "开发指令",
            "type": "Event"
          },
          {
            "name": "验收通过且授权部署",
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
      },
      "ai3d": {
        "location": [
          -870,
          700
        ],
        "width": 300,
        "height": 220,
        "name": "ai3d",
        "label": "3D 素材 AI 工作流（Blender MCP）",
        "type": "Group",
        "desc": "3D 素材分支(ai3d)：Blender MCP 调 boy.blend 全部动画(循环连续性/姿势/游戏卡点/球拍朝向) → 自动调帧(不强制插入起始帧) → 导出可见对象 FBX → 替换 IDE 发布(release/web+dist 基线) → nor.br 重发布 → 复验回填。详见 docs/nodes/ai3d.js 与 h19。",
        "inputs": [
          {
            "name": "3D素材指令",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "素材发布完成",
            "type": "Event"
          }
        ],
        "use_custom_color": true,
        "color": [
          0.85,
          0.55,
          0.2
        ],
        "node_tree_file": "nodes/ai3d.js"
      }
    },
    "links": [
      {
        "from_node": "ai14",
        "from_socket": "纪律就绪",
        "from_socket_identifier": "纪律就绪",
        "from_socket_type": "Event",
        "to_node": "aiF",
        "to_socket": "AI辅助指令",
        "to_socket_identifier": "AI辅助指令",
        "to_socket_type": "Event"
      },
      {
        "from_node": "aiF",
        "from_socket": "辅助完成",
        "from_socket_identifier": "辅助完成",
        "from_socket_type": "Event",
        "to_node": "ai12",
        "to_socket": "测试反馈",
        "to_socket_identifier": "测试反馈",
        "to_socket_type": "Event"
      },
      {
        "from_node": "aiPlan",
        "from_socket": "策划完成",
        "from_socket_identifier": "策划完成",
        "from_socket_type": "Event",
        "to_node": "ai1",
        "to_socket": "开发指令",
        "to_socket_identifier": "开发指令",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai7",
        "from_socket": "编译失败",
        "from_socket_identifier": "编译失败",
        "from_socket_type": "Event",
        "to_node": "ai12",
        "to_socket": "编译失败",
        "to_socket_identifier": "编译失败",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "开发指令",
        "from_socket_identifier": "开发指令",
        "from_socket_type": "Event",
        "to_node": "aiPlan",
        "to_socket": "开发指令",
        "to_socket_identifier": "开发指令",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai1",
        "from_socket": "调度指令",
        "from_socket_identifier": "调度指令",
        "from_socket_type": "Event",
        "to_node": "ai2",
        "to_socket": "调度指令",
        "to_socket_identifier": "调度指令",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai2",
        "from_socket": "浏览器控制",
        "from_socket_identifier": "浏览器控制",
        "from_socket_type": "Event",
        "to_node": "ai3",
        "to_socket": "浏览器控制",
        "to_socket_identifier": "浏览器控制",
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
        "from_node": "ai12",
        "from_socket": "验收通过且授权部署",
        "from_socket_identifier": "验收通过且授权部署",
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
        "to_node": "ai13",
        "to_socket": "测试反馈",
        "to_socket_identifier": "测试反馈",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai13",
        "from_socket": "目视通过",
        "from_socket_identifier": "目视通过",
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
        "from_node": "ai14",
        "from_socket": "纪律就绪",
        "from_socket_identifier": "纪律就绪",
        "from_socket_type": "Event",
        "to_node": "aiPlan",
        "to_socket": "开发指令",
        "to_socket_identifier": "开发指令",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai12",
        "from_socket": "开发指令",
        "from_socket_identifier": "开发指令",
        "from_socket_type": "Event",
        "to_node": "ai14",
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
      },
      {
        "from_node": "ai14",
        "from_socket": "纪律就绪",
        "from_socket_identifier": "纪律就绪",
        "from_socket_type": "Event",
        "to_node": "ai3d",
        "to_socket": "3D素材指令",
        "to_socket_identifier": "3D素材指令",
        "to_socket_type": "Event"
      },
      {
        "from_node": "ai3d",
        "from_socket": "素材发布完成",
        "from_socket_identifier": "素材发布完成",
        "from_socket_type": "Event",
        "to_node": "ai12",
        "to_socket": "测试反馈",
        "to_socket_identifier": "测试反馈",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/aidev.js"];
