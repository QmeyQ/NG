window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/aihandover.js"]={
  "location": [
    -905,
    400
  ],
  "width": 260,
  "name": "aihandover",
  "label": "AI 接管手册(全流程)",
  "type": "Group",
  "desc": "新 AI 接管本项目的完整步骤: 环境/端口→构建/类型→离线测试→收集打包→浏览器自动化验证→华为云上传→te 云函数部署→CF Worker 部署→通讯自检→坑与取舍→接管清单。所有命令/端口/profile/坑均写明, 按 h1→h11 顺序执行即可接管。 含工作方式授权: 项目内可破坏操作免备份+全链路自动+状态文件驱动连续迭代。",
  "inputs": [
    {
      "name": "接管",
      "type": "Event"
    }
  ],
  "outputs": [],
  "use_custom_color": true,
  "color": [
    0.2,
    0.6,
    0.6
  ],
  "height": 160,
  "node_tree": {
    "name": "AI 接管手册 子树",
    "nodes": {
      "h1": {
        "location": [
          70,
          70
        ],
        "width": 300,
        "height": 190,
        "name": "h1",
        "label": "环境与端口",
        "type": "规则",
        "desc": "IDE liveServer MCP=127.0.0.1:18090(SSE GET /ai/mcp, POST /ai/mcp-messages?sessionId; 客户端 local/layamcp.cjs: list/schema/call)。本地验证静态服务 8125。headless 验证 CDP 9228/9230(驱动自启 Edge, profile local/edge-socialN, 每次换 fresh)。华为云登录=可见 Edge 9227(profile local/edge-agc-login, node local/openagc.cjs)。CF wrangler login 回调 localhost:8976。勿让验证驱动与登录窗口共用 9227。 【登录态复用·默认路径】华为云登录已持久化在 Edge profile local/edge-agc-login(可见 Edge 9227 启动即带登录态, 不需要重输账号密码); Cloudflare 授权已持久化(wrangler OAuth token 存 C:\\Users\\mien\\AppData\\Roaming\\xdg.config\\.wrangler\\config\\default.toml)。执行顺序: 先探测→有效则直接用→失效才重新授权(openagc.cjs / wrangler login)。探测方法: CF 用 wrangler whoami; 华为云用 openagc 打开后看右上角账号是否为已登录态。",
        "inputs": [],
        "outputs": [
          {
            "name": "下一步",
            "type": "Event"
          }
        ]
      },
      "h2": {
        "location": [
          390,
          70
        ],
        "width": 300,
        "height": 190,
        "name": "h2",
        "label": "构建与类型",
        "type": "流程",
        "desc": "无 IDE 复现 bundle: node tool/build.cjs [--out local/build/bundle.social.js]。IDE 完整发布(含 menu.ls 资源): node local/layamcp.cjs call ide-build '{\"platform\":\"web\"}' → release/web。类型: node node_modules/typescript/bin/tsc -p tsconfig.qa.json --noEmit; 基线仅 src/card.ts:80/82 两条 TS2554, 新增必须 0。",
        "inputs": [
          {
            "name": "上一步",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "下一步",
            "type": "Event"
          }
        ]
      },
      "h3": {
        "location": [
          710,
          70
        ],
        "width": 300,
        "height": 190,
        "name": "h3",
        "label": "离线测试",
        "type": "检查",
        "desc": "node --test test/cloud-registration.test.cjs test/social.test.cjs test/progress-pid.test.cjs (114 项)。跑真实 te/user.js+shield.js+Worker agc.js+客户端 social.ts, mock DB/IDB/fetch; 断言: 最小写入操作次数(bag/user/set/buy=1查1写, del=1查1删, reg 冷5热4显3)、转交 mes 附带+ack 删除、身价扣/到账/退还、屏蔽词 w=1、群 create/info/relay、响应不泄露对方 mes。改服务端必跑。",
        "inputs": [
          {
            "name": "上一步",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "下一步",
            "type": "Event"
          }
        ]
      },
      "h4": {
        "location": [
          1030,
          70
        ],
        "width": 300,
        "height": 190,
        "name": "h4",
        "label": "收集与打包",
        "type": "流程",
        "desc": "node local/packstage.cjs (dist/web-1107 完整资源树 + release/web 变更 menu.ls/badm.ls 覆盖 + 从旧 tool/ui.br brotli 解 BRP1 恢复被 IDE tree-shake 漏掉的 head/0-3.png 与 internal/UI/*) → node tool/assetsCollect.js local/packstage --dst F:/LayaProject/web (internal 引用改写 ui/internal) → node tool/tmpPack.js (web/nor+顶层散装→nor.br; web/ui+internal→ui.br)。核对 ui.manifest.json 含 menu.ls+4 head。",
        "inputs": [
          {
            "name": "上一步",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "下一步",
            "type": "Event"
          }
        ]
      },
      "h5": {
        "location": [
          70,
          290
        ],
        "width": 300,
        "height": 190,
        "name": "h5",
        "label": "浏览器验证(AI 自动化)",
        "type": "流程",
        "desc": "本地: node local/socialdrive3.cjs / socialdrive5.cjs (headless Edge + CDP Fetch 拦截把 agc-storage 的 ui.br/nor.br 换成本地新包, Range 回 206+Content-Range; 隐私勾选或注入 privacyAgreed; 点底部 box2/3/4 切页; 断言预制体节点/点击接线/降级 toast; 截图 local/social*.png, 报告 local/social-verify*.json)。生产: node local/socialdrive_prod.cjs (真实 CDN+Worker, 注入 privacyAgreed)。对局相关用 __qa.toMatch()/__qa.pve(); headless 下 nor 分片下载偶发不稳, 失败换 fresh profile 重试或人工复验。",
        "inputs": [
          {
            "name": "上一步",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "下一步",
            "type": "Event"
          }
        ]
      },
      "h6": {
        "location": [
          390,
          290
        ],
        "width": 300,
        "height": 190,
        "name": "h6",
        "label": "上传华为云存储",
        "type": "流程",
        "desc": "前提: 可见 Edge 9227 已登录华为云且开云存储桶 sgf-rhq1y 标签【默认已登录: 复用 local/edge-agc-login profile, 不要重新登录; 打开后确认右上角账号有效即直接上传, 仅在提示未登录时才走 openagc 授权】(node local/openagc.cjs 开; 若被导航走用 /json/new 重开)。Python/pythoncore-3.14-64/python.exe local/doupload.py (PUB_FORCE=1 覆盖 root ui.br/nor.br + js/bundle.js; 回读共享令牌写 tool/webpub/tokens.json)。令牌不变则 src/libs/res/res.ts ResList 与 index.html 直链无需改。js 目录须 go_root 后 enter_dir('js') 再传, 传后 reload 复核大小/时间戳确认替换。 ⚠ js/ 目录控制台导航自动化偶发失效(SPA 需真实鼠标, JS/double-click 不触发): 失效时人工在控制台进入 js/ 上传 release/web/js/bundle.js 并复核大小; 误传根目录的 bundle.js 为冗余可删除。root ui.br/nor.br 上传稳定。 【掉线重登】登录页自动填充对 JS click 不生效, 须 CDP 真实鼠标点击(Input.dispatchMouseEvent)登录按钮才触发保存凭据登录(local/real_login.cjs); g2.br 已上传并回读 token 填入 ResList.g2(与 nor 同格式)。 【已验证可行】进 js/: 真实点击文件夹名 text=js/ (JS/double-click 无效); 上传用 cs.upload()(先点\"上传文件\"按钮再 input), 轮询大小确认替换。 【js/ 导航坑】点击文件夹后 cslp iframe 可能重载致 frame 引用失效→每次点击后 cs._frame() 重取再判 rows; 上传须 cs.upload()(先点\"上传文件\"按钮)而非直接 input; 多策略: 真实点击/JS点击/CDP viewport_midpoint 坐标。local/doupload_js7.py 为可靠版本。",
        "inputs": [
          {
            "name": "上一步",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "下一步",
            "type": "Event"
          }
        ]
      },
      "h7": {
        "location": [
          710,
          290
        ],
        "width": 300,
        "height": 190,
        "name": "h7",
        "label": "部署 te 云函数",
        "type": "流程",
        "desc": "【默认已登录】沿用同一 Edge 9227 华为云会话直接进控制台, 不重走登录; 仅探测到掉线才重新授权。打包: Compress-Archive server/te/{CloudDBZoneWrapper,code,db,gobe,NG,shield,user}.js+function-config.json+package.json+resources → local/te-new.zip (纯代码, 平台装依赖)。开云函数标签 #/app/9249519184595931747?appId=5765880207855344723&projectId=388421841221717430 → 点函数 te → 函数代码 tab。上传: python tool/webpub/fcode.py up local/te-new.zip; 拖拽框隐藏无 rect 时改用 local/deploy_te2.py(JS 点 wrap+input); 若页面仍不认文件, 人工在控制台\"函数代码\"上传 zip 并提交。部署后 probe_te 验证版本号。 【已验证可行】先 DrissionPage 真实点击\"函数代码\"tab(拖拽框才可见), 再 fcode.py up <zip> → \"更新函数成功\"。probe_te.cjs 复核 v 与 sync/ack code0。",
        "inputs": [
          {
            "name": "上一步",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "下一步",
            "type": "Event"
          }
        ]
      },
      "h8": {
        "location": [
          1030,
          290
        ],
        "width": 300,
        "height": 190,
        "name": "h8",
        "label": "部署 Cloudflare Worker",
        "type": "流程",
        "desc": "【默认已登录】wrangler OAuth 已持久化(账号 2998856667@qq.com), 先 whoami 确认即可直接 deploy, 不触发 login; 仅 whoami 报未认证时才 login(弹默认浏览器授权 CF, 回调 localhost:8976, 超时需重跑)。命令: cd server/cloud; node node_modules/wrangler/bin/wrangler.js whoami; 授权后 node node_modules/wrangler/bin/wrangler.js deploy。Worker=网关+IP/历史风控(历史改用户行 history 点查)。部署后线上 POST / {name:'te',data:{t:'sync'...}} 应回新版本 v 且 code 0。 ⚠ login 回调端口 8976 若被残留 login 进程占用会报 port in use: 先 netstat 找 PID 停掉再重跑 login; login 需保持进程存活等待授权(勿用管道截断输出)。 【已验证】login 成功授权后 wrangler deploy → /health wv 应为当前 WORKER_VERSION(v1116a)。",
        "inputs": [
          {
            "name": "上一步",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "下一步",
            "type": "Event"
          }
        ]
      },
      "h9": {
        "location": [
          70,
          510
        ],
        "width": 300,
        "height": 190,
        "name": "h9",
        "label": "服务器通讯自检",
        "type": "检查",
        "desc": "node local/probe_te.cjs (www.normalgame.cn POST te bag/sync/ack; workers.dev 在本机 node 不可达, 用自定义域名)。期望: bag code0 且 v=当前 CODE_V; sync/ack code0。若 sync/ack 回 \"未知 t\" = te 仍旧版未部署 → 执行 h7。客户端新+服务端旧是\"服务器通讯有问题\"的根因。",
        "inputs": [
          {
            "name": "上一步",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "下一步",
            "type": "Event"
          }
        ]
      },
      "h10": {
        "location": [
          390,
          510
        ],
        "width": 300,
        "height": 190,
        "name": "h10",
        "label": "已知坑与取舍",
        "type": "风险",
        "desc": "IDE 场景进程 reload 卡死(sceneAsset null/nodeCount4, 连未改场景也失败)不影响 ide-build(走 assetDb)。headless Fetch 拦截 Range 分片会污染 IDB 缓存致复跑失败→换 fresh profile。item2/item3 子节点随控制器 c0 页切换异步实例化→SocialPage/PersonalPage 在 render 懒重绑(!pTabs/!home 时 bind)。GList 默认无选中模式, tab 用 item 点击。DrawRoundRectCmd.create 需 11-14 参, 代码里用 DrawRectCmd.create(7参) 或对象字面量。身价语义=发送方付/accept 到账/reject 退还; 屏蔽词常量表 BLOCKED_WORDS 命中标记 w=1 不拦截; 会话历史全本地, 服务端 mes 仅未送达暂存, ack 确认送达本地缓存后删除。 【relation 跑飞】TopExt_Top(21)/TopExt_Bottom(22) 在目标尺寸变化时移动顶边(累加), 容器\"顶部跑飞消失\"; 填充式容器应用 BottomExt_Top(23)/BottomExt_Bottom(24)(顶边固定)。IDE 设计比例 dy=0 掩盖问题, 非设计分辨率才暴露; 用 local/layoutdrive.cjs(WINSIZE) dump 全局坐标定位。引擎语义: LayaAir3.4/src/layaAir/laya/ui2/Relation.ts。 【预制体状态三坑】①controllers 序列化={\"_$type\":\"Record\",\"<name>\":{\"_$type\":\"Controller\",\"pages\":[...]}}(按名键控, 非数组), 且键序应先于 _$child 以便齿轮解析; ②GButton 选中态需预制体上名为 button 的控制器(6页), 不会自动创建; Radio 互斥+selected setter 驱动 setCurrentState; ③GearDisplay 改 internalVisible(非 visible), 条件页 pages+condition(0=AND/1=OR 多齿轮组合), 背景外部 visible 须 true。读取选中态用 visible&&internalVisible。 【GOBE 社交】禁云函数轮询: 实时走 Gnet.sendChatMessage/onMessage(chatType); 大厅房标记 customRoomProperties{kind:lobby,region} 用 getAvailableRooms 遍历区分; createRoom 玩家属性硬编码→进房后 updatePlayerProperties 补 userid; RoomOptions 用 customProperties(非 customRoomProperties); 点对点需先 joinRoom 对方房(social.room 经 te find/publicProfile 带回); 房不存在/无人→te msg 兜底。 【多客户端测试】local/mcdrive.cjs: 双 headless Edge(9240/9241, profile edge-mcA/B)+双静态服务(8125/8126 同内容不同 origin 隔离 IDB)+Fetch 拦截本地 ui.br/nor.br, 真实 GOBE/Worker; 流程注册→进大厅→好友→新聊天→P2P→广播。【已知通讯 bug】①setroom 后 sync social.room=null(待查 afterJoin/teWrite); ②joinRoom 加入遗留空房时非房主→updateRoom 被拒→大厅群 gid 未写回→重复群(应房主写 gid 或改用 te 存 room→gid 映射); ③freq/P2P/广播接收待验证(onMessage chatType 绑定/recvPlayerIdList)。 【大区群单例】gid=globby+地区码, te lobbygroup get-or-create+oldLobbyGids(按群名地区+区识别)清理; pruneLobbyConvs 清对话条目+recvMsg/sentMsg。社交消息用 MessageType.CUSTOM+90(sendToClient/onMessage), 不用 sdk CHAT(3)。**接收端待查**: 双客户端同房但 onRecvFromClient 不触发(__mcRecv=0), 需查 sdk imType/dstPlayers 与 _bridgeRoom 绑定时机; mcdrive.cjs 为复测入口。 【接收侧根因已修·mcdrive 11/11】GOBE sendToClient 的 type 是路由模式(0全员/1除自己外广播/2 recvPlayerIdList 点对点), 旧用 chatType=190 当 type→服务器 INVALID_MESSAGE(102016)拒发; 且 SDK room.onRecvFromClient 只回 {roomId,sendPlayerId,msg} 不带 imType→onMessage(type)永不触发。修法: 发送改 ROUTE_OTHERS(1)/ROUTE_TARGET(2), 接收改 onClient catch-all+载荷 k 标签(chat/invite/invroom/freq/facc), 与 PVP msg.ts 一致。freq 通知触发 Social.sync 刷申请列表; accept 发 facc 通知申请方自动重同步; Lobby.ensure 加身份就绪本地重试(6×1.5s 非云轮询)。mcdrive 改 fresh profile+注册/进房就绪等待+uid 净化(JSON.stringify 插值)→11/11。身价语义更正=自己的身价个人设置(setprice 0..500 默认1 支持0), 加好友不涉及金币转移。 【架构模块地图】见 docs/handover.md h12: 每功能=1客户端模块+te分支+预制体面板, 经注入 sink 解耦(lobby 不 import social, social 经 Lobby.setSinks 注入; invite 仅依赖 Cloud.te+Social.sendPayload+Lobby)。改小分支只读对应文件: 社交=social.ts+friend/msg/group分支; GOBE=lobby.ts+net.ts; 邀请=invite.ts+invite分支; 个人页=ui/personal.ts; 网关=cloud.ts+Worker agc.js。按分支构建/测试见 h12 表。",
        "inputs": [
          {
            "name": "上一步",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "下一步",
            "type": "Event"
          }
        ]
      },
      "h11": {
        "location": [
          710,
          510
        ],
        "width": 300,
        "height": 190,
        "name": "h11",
        "label": "新 AI 接管清单",
        "type": "规则",
        "desc": "1 读 docs/index.js + nodes/aidev.js + 本手册(aihandover)。2 跑 h3 离线测试确认基线。3 h2 tsc+build。4 h9 probe_te 确认线上 te 版本; 若旧→h7 部署 te; h8 部署 Worker(需用户 CF 授权)。5 h4 打包+h6 上传(需用户华为登录)。6 h5 浏览器本地+生产复验。7 改动回填 nodes/psocial.js/srv.js/pmenu.js/aidev.js ai12 + node local/doccheck.cjs(新增错误必须 0; 既有告警 bmag g9/e3 pres.001 不动)。未决项: CF 登录/Worker 部署、te 控制台人工上传(若自动化不认)、对局 headless 复验。 【工作方式·全自动授权(2026-11-17 用户明确授权)】1 范围: F:/LayaProject 项目目录内视为可破坏环境(无重要数据), 允许覆盖/删除/重构, 默认不做备份, 不再逐次询问。2 红线: 不动系统配置/登录态/凭证文件; 不碰项目外路径; 不把含 token 的文件写入 Web 可访问目录; 不改平台/内网系统。3 全链路自动: 构建→离线测试→浏览器验证→打包→上传→部署→自检 全自动串行执行, 可调用 exec/layamcp/CDP/Python/MCP/LLM 任意能力, 包括起临时测试环境。4 持续迭代: 单轮时长受限时用状态文件+交替调用——每轮结束把 {phase,done,next,failed} 写入 docs/auto/state.json, 下一轮先读它续跑; 长任务后台 exec+轮询; 可交替调用 sub-agent 生成任务、exec 执行、llm 复核。5 失败处理: 同一操作重试 2 次, 仍失败写入 state.failed 并切换路径, 不静默跳过; 发布步骤失败即停并记录。 【模型编排·用户明确要求】1 只用能力最高的文本模型: 主用 ark-code-deepseek-v4.1-flash, 备用 qwen-deepseek-v4.1-flash(同模异厂, 仅故障切换与交叉校验)。2 禁止用低配模型承担生产任务: qwen38-flash、qwen38-27b-local 不得用于规划/编码/根因/评审, 仅在主备全断时兜底并标注降级。3 板块并行: 按阶段(h2 构建/h3 测试/h4 打包/h5 验证/h6-h9 部署)拆成独立子任务并行推进, 各子任务只写自己的产物目录, 结果汇总写入 docs/auto/state.json。4 交叉校验: 关键结论(版本号/断言数/部署结果)用两家 provider 各跑一次, 不一致时以测试实证为准。5 会话模型说明: 平台注入的会话模型不可自选; 本规则约束的是经 /llm/complete 与 sub-agent 发起的工作负载。 【进度持续下发·用户要求】1 每个阶段开始/完成、遇到失败、收尾时, 通过数字人接口推送到美信私聊(meixin-digital-human send.py, --to ex_xiaowj7)。2 只在状态变化时推, 不刷屏; 长任务按里程碑或每 5-10 分钟一次摘要。3 推送内容: 阶段名/结果(成功、失败、跳过)/关键数字(参数量、断言数、版本号)/下一步。4 推送失败不阻断主流程, 记入 docs/auto/state.json 的 failed; 下一阶段继续。5 任务状态同步写入 state.json, 保证跨轮可续。 【第二款游戏接入·平台化(用户明确)】LayaProject 是小游戏平台, 不是单游戏; NG2 不另建项目。接入方式: 1) 代码并入平台 src(建议 src/g2/), 随主 bundle 构建; 2) 资源(场景/Spine/图集/图)打成独立 BRP1 包 g2.br + g2.manifest.json, 复用 tmpPack/assetsBr 流程; 3) Res.ResList 增加 g2 条目(绝对 OSS 地址+token); 4) 菜单登记(main/game 图标 + 条目), 点击经 SceneNav.open(\"g2/<scene>.ls\", loader) 打开, 打开前确保 g2 包就绪; 5) 与 nor/ui 包同构: 目录第一段即包名; 跨包资源用标记文件 @包名 或 setRedirect。验收: 菜单可见第二款游戏、可进入、可退出回菜单、无站内资源请求。 【UI 策略修正(用户明确)】不要沿用第二款游戏的旧 UI, 也不为它新增 ui 包: NG2 的旧 UI 场景(select.ls/roomItem.ui/BagList.lh)不迁入、不打包; 第二款游戏只保留玩法场景(Scene.ls)与 Spine/图集资源, 打进 g2.br; 入口、选人、背包、结算等界面统一用平台新 UI(menu.ls 体系: GPanel+Controller+GearDisplay)重建; 平台侧同步把旧 UI 组件逐步升级为新 UI, 最终 ui 包只承载新 UI。",
        "inputs": [
          {
            "name": "上一步",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "下一步",
            "type": "Event"
          }
        ]
      },
      "h12": {
        "location": [
          0,
          0
        ],
        "width": 280,
        "name": "h12",
        "label": "远程中转接管(re-relay)",
        "type": "规则",
        "desc": "远程AI接管本机项目经 server/re/ relay: 公网 POST http://47.119.120.119/apim 或 https://normalgame.cn/apim (token见re/config.json, body.token或X-Re-Token头)→frp隧道5001→本机21119。全权文件fs.*/终端exec/LayaAir MCP(laya.state/build/find/open/eval/call); 参数错误自动返回帮助文档。服务器CDP接管法(local/copy_session_edge.ps1→Edge 9228→ECS Workbench免密→local/type_cmd.cjs键入命令)、nginx HTTP+HTTPS /apim反代、vsftpd FTP修复(listen_ipv6=NO)、NSSM自启(re/frp/ontask.bat需UAC)、扩展优化详见 nodes/prelay.js(r1→r7)与 docs/handover.md h14。relay独立frp(21119→5001)不碰远程控制FRPC(21118→5000)。",
        "inputs": [
          {
            "name": "上一步",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "下一步",
            "type": "Event"
          }
        ],
        "height": 210
      },
      "h13": {
        "location": [0, 0],
        "width": 280,
        "name": "h13",
        "label": "完成=实测+截图目视(硬规则)",
        "type": "规则",
        "desc": "【完成验收硬规则(用户明确 2026-11-19)】游戏/玩法/UI 任何改动, 宣称完成前必须: (1)真实浏览器跑对应探针覆盖全路径(入口→模式→对局→控制→伤害→结算→退出→重进); (2)每个关键状态截图, AI 必须自己 view_image 逐张目视核对 UI/布局/状态(血条位置/角色对齐/残留节点/按钮可见/文本正确), 自主发现 bug; (3)数值断言与目视核对双通过才算完成, 矛盾即失败; (4)多人通讯改动必须多浏览器实例多账号实测(mcdrive/mc3drive), 禁止单端臆测; (5)只靠用户反馈发现问题=验收失败; (6)联机/多人功能必须双独立账号双客户端(双 profile/双 CDP/真实 GOBE)真实跑全链路: 建房/匹配→双方进房→回合轮流→伤害→结算→再来一局→退出离房; 控制方式=植入代码(page.ev 调游戏 API)+真实鼠标拖拽/点击混合; 单客户端自测不算联机验证; 探针 local/g2mcdrive.cjs(g2)与 mcdrive/mc3drive(社交)。探针清单: local/g2selftest.cjs(g2单机全路径+6截图+14断言), g2fireprobe.cjs(控制/时钟诊断), play_probe.cjs(拖拽控制), g2probe.cjs(入口链路), prod_g2.cjs/prod_g2full.cjs(生产CDN复验, full 14断言+6截图), mcdrive.cjs/mc3drive.cjs(社交多客户端)。headless Edge 坑: 加 --no-sandbox(AppContainer 崩溃 0xC0000005), boot 失败重试一次; CDP 轮询必须走 exec_command 的 node(node_repl 回环 EACCES)。 详见 docs/handover.md h15 与 nodes/aidev.js ai13。",
        "inputs": [{ "name": "上一步", "type": "Event" }],
        "outputs": [{ "name": "下一步", "type": "Event" }],
        "height": 210
      },
      "h14": {
        "location": [0, 0],
        "width": 280,
        "name": "h14",
        "label": "工作流优先纪律(硬规则)",
        "type": "规则",
        "desc": "【用户明确 2026-11-19】所有工作基于工作流: 开工先读 handover h0/h12/h13/h15 + docs/auto/state.json(从 next 续跑) + aidev 图对应节点; 沿链路 策划→实现→tsc→离线测试→打包→浏览器实测(联机双客户端双账号+植入代码控制)→部署→生产复验→回填; 每轮结束必须回填 handover/节点/state.json; 工作流与代码不符先使两者一致; 凭记忆开工/遗忘流程=验收失败。详见 handover h16 与 aidev ai14。",
        "inputs": [{ "name": "上一步", "type": "Event" }],
        "outputs": [],
        "height": 210
      }
    },
    "links": [
      {
        "from_node": "h13",
        "from_socket": "下一步",
        "from_socket_identifier": "下一步",
        "from_socket_type": "Event",
        "to_node": "h14",
        "to_socket": "上一步",
        "to_socket_identifier": "上一步",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h12",
        "from_socket": "下一步",
        "from_socket_identifier": "下一步",
        "from_socket_type": "Event",
        "to_node": "h13",
        "to_socket": "上一步",
        "to_socket_identifier": "上一步",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h1",
        "from_socket": "下一步",
        "from_socket_identifier": "下一步",
        "from_socket_type": "Event",
        "to_node": "h2",
        "to_socket": "上一步",
        "to_socket_identifier": "上一步",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h2",
        "from_socket": "下一步",
        "from_socket_identifier": "下一步",
        "from_socket_type": "Event",
        "to_node": "h3",
        "to_socket": "上一步",
        "to_socket_identifier": "上一步",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h3",
        "from_socket": "下一步",
        "from_socket_identifier": "下一步",
        "from_socket_type": "Event",
        "to_node": "h4",
        "to_socket": "上一步",
        "to_socket_identifier": "上一步",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h4",
        "from_socket": "下一步",
        "from_socket_identifier": "下一步",
        "from_socket_type": "Event",
        "to_node": "h5",
        "to_socket": "上一步",
        "to_socket_identifier": "上一步",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h5",
        "from_socket": "下一步",
        "from_socket_identifier": "下一步",
        "from_socket_type": "Event",
        "to_node": "h6",
        "to_socket": "上一步",
        "to_socket_identifier": "上一步",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h6",
        "from_socket": "下一步",
        "from_socket_identifier": "下一步",
        "from_socket_type": "Event",
        "to_node": "h7",
        "to_socket": "上一步",
        "to_socket_identifier": "上一步",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h7",
        "from_socket": "下一步",
        "from_socket_identifier": "下一步",
        "from_socket_type": "Event",
        "to_node": "h8",
        "to_socket": "上一步",
        "to_socket_identifier": "上一步",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h8",
        "from_socket": "下一步",
        "from_socket_identifier": "下一步",
        "from_socket_type": "Event",
        "to_node": "h9",
        "to_socket": "上一步",
        "to_socket_identifier": "上一步",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h9",
        "from_socket": "下一步",
        "from_socket_identifier": "下一步",
        "from_socket_type": "Event",
        "to_node": "h10",
        "to_socket": "上一步",
        "to_socket_identifier": "上一步",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h10",
        "from_socket": "下一步",
        "from_socket_identifier": "下一步",
        "from_socket_type": "Event",
        "to_node": "h11",
        "to_socket": "上一步",
        "to_socket_identifier": "上一步",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h11",
        "from_socket": "下一步",
        "from_socket_identifier": "下一步",
        "from_socket_type": "Event",
        "to_node": "h12",
        "to_socket": "上一步",
        "to_socket_identifier": "上一步",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/aihandover.js"];
