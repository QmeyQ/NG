window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/psocial.js"]={
  "location": [
    433.83,
    198.23
  ],
  "width": 240,
  "name": "psocial",
  "label": "社交模块",
  "type": "Group",
  "desc": "已实施(本地验证, 已上传生产并冒烟9/9): 好友(身价0-500默认1)/群聊/私聊转交(服务端不存会话, 送达ack删除)/屏蔽词红字/排行/分享; UI 全预制体(menu.ls item2 嵌套Panel+微信式对话列表+右上\"+\"; item3 左列表右panel 背包表格/战绩单列/本地对局详情+玩家加号)。数据落 NG 既有字段; 对局详情仅本地 IDB。",
  "inputs": [
    {
      "name": "社交入口",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "社交就绪",
      "type": "Event"
    }
  ],
  "use_custom_color": true,
  "color": [
    0.48,
    0.38,
    0.75
  ],
  "height": 154,
  "node_tree": {
    "name": "社交模块 子树",
    "nodes": {
      "f5": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "height": 150,
        "name": "f5",
        "label": "前置：DB 最小写入",
        "type": "规则",
        "desc": "已实施: db.js 增 dbUpsert/dbTop/dbByIds(整行直写无内部读); shield.js 改纯函数 append/parse/makeRecord(13位ms+op 逗号分隔, 24h 裁剪/120 条上限), 审计随业务同一次 upsert 落 history, 额外 DB 操作 0; user.js 各分支 commitRow(旧行+字段+审计→一次直写); reg 直写+seqHint 热缓存(冷 5 次/热 4 次, 撞号才重读 seq 追赶), 认领回读保留; del=查+删无审计; Worker agc.js 改 EqualTo 主键点查解析 history(替代 ≤500 行前缀扫描); mag 增 clean 一次性清遗留 __shield__ 行。实测次数: bag/user/set/buy/score/mes=2, del=2, find/sync=1, rank/profiles=1, friend request/msg=2(对方行), accept/remove=4(双方各一查一写), reg 显式=3。写别人行不追加对方 history(防刷爆受害者风控)。证据: 离线 node --test 62(注册契约)+34(社交/最小写入) 全过; tsc 新增错误 0(基线 card.ts:80/82); esbuild bundle 1098542B; Edge CDP 真实引擎页 18/18(local/social-verify.json, 截图 local/social-page.png)。",
        "inputs": [],
        "outputs": [
          {
            "name": "DB就绪",
            "type": "Event"
          }
        ]
      },
      "f1": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "height": 150,
        "name": "f1",
        "label": "好友系统",
        "type": "流程",
        "desc": "已实施: 好友 social JSON {f,req,blk,g}; 身价 price(0..500 默认1): request 扣发送方、accept 到账接收方、reject 退还、超额回4/非法回5; req 携带 price 展示。加好友入口改为右上\"+\"菜单(加好友/创建群聊)。群: group create 建 grp:<gid> 行+成员 social.g, msg 带 gid 转交全体成员(除自己), group info 读元数据; 上限20人。te.find/profiles 公开资料不泄露 bag/dollar/对方 mes。 【身价语义纠正】身价=自己的个人设置(隐私栏 priceInp+保存, te setprice 0-500 默认1, 存 social.price), 加好友/同意/拒绝不转移金币(移除扣费/到账/退还, 修复\"同意/发送申请直接报错\"=旧扣费逻辑 code4)。好友申请 req 仅 {id,ts}。",
        "inputs": [
          {
            "name": "DB就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "好友服务",
            "type": "Event"
          }
        ]
      },
      "f2": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "height": 150,
        "name": "f2",
        "label": "私聊与消息",
        "type": "流程",
        "desc": "已实施(转交契约, 服务端不存会话): 发送 msg 只写入对方/群成员待转交缓冲 mes(屏蔽词命中标记 w=1 仍转交, 客户端渲染红); 任何读到自己行的云函数响应(bag/user/set/buy/sync/score/friend/ack)都附带 mes; 客户端 Social.handlePending 合并进本地收件缓存(IDB cloud_social.recvMsg)后回 ack(ids), 服务端删除已送达条目(确认送达本地缓存而非已读); 会话/历史全本地。群会话 gid 路由。clearInbox 清本地+ack。 【GOBE 实时层, 禁云轮询】移除 Social.startPolling 云轮询(空实现); 新增 libs/server/lobby.ts: 进入社交 NetBoot.ensure 后按地区(Intl 时区→华东/华南/…)创建/加入 100 人大厅房(房间标记 customRoomProperties{kind:lobby,region}, getAvailableRooms 遍历区分匹配/游戏房, 优先本地区且<100人); 进房 te setroom 记录房间号(social.room, 一次写非轮询)+updatePlayerProperties 带 userid; 自动建大厅群(地区+区+房号尾4, te group create lobby 允许1人); 收消息 Gnet.onMessage(chatType)→Social.receiveLocal 落本地(不经过云); 发消息 Lobby.sendTo: 查对方 social.room→joinRoom 对方房→sendChatMessage 点对点(无云/无DB); 对方房不存在/无人/无对方→te msg 云兜底; 群消息在房內 GOBE 广播否则云兜底; 好友请求成功后同房间 GOBE freq 通知→+号徽标(Social.badge=req+unread+reqNotify)。 【新聊天≠建群】创建新聊天=给选中好友建对话条目(Social.createChat→cache.convs, 没发过消息也入对话列表), 面板 socNewChat(ncList 选好友); 建群仍 socGroup。对话列表 buildConvs 先铺 convs 条目再合并消息。大群发消息=GOBE 全局广播(sendChatMessage 不带 recvList); 单玩家=大区内点对点(sendToClient 带 recvPlayerIdList)。【多客户端实测】local/mcdrive.cjs 双 profile(edge-mcA/B)+双 origin(8125/8126)+双 CDP(9240/9241) 自主控制两客户端: 注册/进大厅/好友/新聊天/P2P/广播。当前通过: 双账号/GOBE init/大厅群/对话条目/无云 msg/无异常; 未通(待修): setroom 房间号未落库(sync social.room=null)、非房主 updateRoom 被拒致大厅群 gid 未写回→重复群、好友 freq 通知/P2P/广播接收未验证。 【大区群单例+对话合并】te lobbygroup get-or-create 固定 gid=globby+地区码(HD/HN/HB/DB/XN/XB), 全员同群; 服务端按群名(地区+区)识别旧大厅群返回 oldLobbyGids 并从 social.g 移除; 客户端 pruneLobbyConvs 清理重复大厅群对话条目+其 recvMsg/sentMsg 历史消息→大区群仅一个对话项、记录合并。社交消息改走游戏已验证的 CUSTOM 通道(MessageType.CUSTOM+90, sendToClient/onMessage), 弃用 sdk CHAT(3)。【多客户端实测 mcdrive】通过: 双账号/同大区房(setroom)/好友申请徽标/同意/大区群单例/无云msg/无异常; 待修: 接收端 onRecvFromClient 未触发(__mcRecv=0)致 P2P/广播/freq 接收未验证(需 sdk 层查 imType/dstPlayers 桥接)。 【接收侧根因已修·11/11】sendToClient 的 type=路由模式(0全员/1广播/2点对点), 非消息类型; 旧 chatType=190 当 type→102016 INVALID_MESSAGE 拒发。SDK onRecvFromClient 不带 imType→onMessage(type)无效。现行契约: 发送 Gnet.sendToClient(ROUTE_OTHERS=1 群广播 / ROUTE_TARGET=2 单玩家 recvPlayerIdList, JSON 载荷 k 标签); 接收 Gnet.onClient catch-all 解析 k=chat/invite/invroom/freq/facc(忽略 PVP kind)。freq 通知→Social.sync 刷申请列表; accept→facc 通知申请方自动重同步。lobby 不 import social, 经 setSinks({chat,freq,cloud,group,roomOf,sync})注入。mcdrive fresh profile+就绪等待 11/11。 【云调用最小化】afterJoin 增 isLobby 参数: 仅大区房记录房间号, 与本地 localStorage(lobby_room/lobby_gid)一致则复用、不调 setroom/lobbygroup; 匹配/非大区房绝不写房间信息。sendRaw 单玩家改为「对方就在当前房→GOBE 点对点; 找不到(离线/异房)→直接云兜底」, 不再 joinRoom 跳房(省进房开销+避免跳房触发 setroom)。 【新消息提醒·策划+实施】触发: receiveLocal(GOBE 实时)与 handlePending(云兜底送达)收到他人新消息→Social.fireNotify→Social.onNewMessage 回调(slecet.ts 登录初始化时注入): 提示音 Au.tap + Dialog.toast(发送者: 预览≤20字, 2s); +号徽标计未读(原有)。抑制: 正在看聊天面板时 Social.suppressNotify=true(ui/social.ts showPanel chat 置位, close 复位)不打扰; 自己的消息不提醒。低耦合: Social 只暴露 onNewMessage 钩子+suppressNotify 标志, 声音/toast 由 UI 层注入, 不反向依赖。回归: lobby-receive.test.cjs 增 setroom 最小写入项(同大区房重进不重复写)。 【转发/大区通讯修复】fwdTargets 覆盖所有好友+群(非仅对话列表); 云兜底转发 k 标签 JSON 载荷经 handlePending 解析还原(chat→text/invite→inv/invroom→room+invId); lobby.scheduleConverge 进房后纯 GOBE 重扫收敛最小规范房号(解决同时 createRoom 竞态分裂→大区广播互不可达)。3 浏览器实测 mc3drive.cjs 9/9。",
        "inputs": [
          {
            "name": "DB就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "消息服务",
            "type": "Event"
          }
        ]
      },
      "f3": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "height": 150,
        "name": "f3",
        "label": "排行与战绩落库",
        "type": "流程",
        "desc": "已实施: record JSON {win,play,last,recent≤10}; level=胜场零填充 10 位(NG 既有索引); te.score=查+写自己(record/level/history 同写), 30s 冷却防刷回 12; te.rank=1 次 orderByDesc(level) limit≤50 过滤系统行/未上报行; badm.onMatchEnded 接 Social.reportResult(每局一次 _scoreReported 标志, PVE/PVP 两端各自报)。浏览器取证: score POST {win:1,mode:pve} 发出, 线上未部署回 5 → warn 留痕不阻塞, 同局重复回调不重发。证据: 离线 node --test 62(注册契约)+34(社交/最小写入) 全过; tsc 新增错误 0(基线 card.ts:80/82); esbuild bundle 1098542B; Edge CDP 真实引擎页 18/18(local/social-verify.json, 截图 local/social-page.png)。",
        "inputs": [
          {
            "name": "DB就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "排行服务",
            "type": "Event"
          }
        ]
      },
      "f4": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "height": 150,
        "name": "f4",
        "label": "分享与邀请",
        "type": "流程",
        "desc": "已实施(纯客户端零服务端写): 分享 Tab 邀请链接 origin+path?inv=<userid> + 复制(clipboard/兜底 prompt); 微信 wx.shareAppMessage 卡片 query 带 inv; 被邀者 Social.captureInvite 存 localStorage, 登录后 tryInviteFriend 自动发一次申请(code 0/12 置 invited 标记, 网络失败下次重试)。浏览器取证: 链接 http://127.0.0.1:8125/index.html?inv=1047 生成+复制反馈通过。证据: 离线 node --test 62(注册契约)+34(社交/最小写入) 全过; tsc 新增错误 0(基线 card.ts:80/82); esbuild bundle 1098542B; Edge CDP 真实引擎页 18/18(local/social-verify.json, 截图 local/social-page.png)。",
        "inputs": [
          {
            "name": "DB就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "分享服务",
            "type": "Event"
          }
        ]
      },
      "f6": {
        "location": [
          390,
          265
        ],
        "width": 240,
        "height": 150,
        "name": "f6",
        "label": "社交页 UI(menu.ls 预制体)",
        "type": "代码",
        "desc": "已实施(预制体): item2 嵌套 Panel socHome(微信式对话列表+右上\"+\")/socChat/socAdd(含身价输入 addPrice 默认1)/socGroup(群名+选好友 gMemList+创建)/socPlusMenu(加好友/创建群聊); 屏蔽词消息 mtext 红色; 群会话标题/转交。item3 个人页改造: 左竖向 pTabs(背包/战绩)+右 pRight panel; 背包=表格 bagTable(图/名/数量), 战绩=单列 recList(本地 LocalMatch); 点战绩在右 panel 切 pDetail 对局详情(仅本地 IDB local_matches, 不经过服务器), 详情玩家行带\"+\"加好友(仅有 userid 真实玩家); badm 结算存本地详情。src/ui/social.ts+personal.ts 纯绑定渲染。浏览器 9/9(加号菜单/身价/群面板/个人页左列表右panel/战绩空态/零异常)。 【布局跑飞修复】item2 原 relation TopExt_Top(21, 目标 botton) 会在目标高度变化时移动顶边→运行时非设计分辨率下顶边累加跑飞(y=-1462 消失); IDE 设计比例 dy=0 才显得正确。改 BottomExt_Top(23, 与 item0/1/3/4 一致: 顶边固定/底边跟随)。矮屏(800x600)复验 item2.y=192 归位、竖屏(600x1300) y=192 h=2037 不变; ui.br(2439639) 已上传, 生产 9/9。诊断驱动 local/layoutdrive.cjs(WINSIZE 环境变量换分辨率, dump 全局坐标 local/layout-dump.json)。 【tab 状态入预制体】item3 左栏 tab 不再代码画背景: 改为 GButton(mode=Radio) tabBag/tabRec, 各带名为 button 的控制器(6页 up/down/over/selectedOver/disabled/selectedDisabled, Record 格式且键序先于 _$child), bgNormal/bgSel 两背景用 GearDisplay 挂 button 控制器(选中页[1,3,5]/未选[0,2,4])。代码仅 onTabClick 赋值 selected(状态), 视觉全由预制体齿轮呈现。注意: GearDisplay 改 internalVisible 而非 visible(断言/读取须用 internalVisible); 背景外部 visible 须 true 否则屏蔽齿轮。生产 9/9 验证选中态翻转。 【本轮】背包改 3x5 表格(bagTable layout type4 columns3, 单元格仅头像+数量, 无名称); 左 tab 扩为 背包/战绩/设置/隐私 四个 GButton(Radio); 设置页(item4)并入个人页: 设置栏 pSet=垂直滚动 GPanel 装 au/aue/show/double(节点自 item4 移入, 绑定仍在 slecet 递归 find); 隐私栏 pPrivacy=身价设置+hideId; 底部\"设置\"图标重定向个人页设置tab(slecet box4→idx3+pendingTab2)。生产 12/12 验证。 【本轮 UI】按键音 Au.tap vol 4→2(减半); slecet 底部图标放大幅度 0.4→0.2(减半)且\"我的\"栏(box3)头像不缩放; +菜单增\"创建新聊天\"(pmNewChat→选好友建群/聊天); +号红点徽标 badgePlus(Social.badge); 群聊右上角≡(chatMenuBtn)展开 chatMenuPanel: 成员列表 memList(删除好友 mDel)+群信息 grpInfo+退出群聊 btnLeaveGroup(大厅群退出后 Lobby.rejoin 自动换房); te group leave 分支。生产 14/14。 新聊天面板 socNewChat(ncBack/ncList) 与建群 socGroup 分离; +菜单 pmNewChat→新聊天。生产 14/14。",
        "inputs": [
          {
            "name": "社交入口",
            "type": "Event"
          },
          {
            "name": "好友服务",
            "type": "Event"
          },
          {
            "name": "消息服务",
            "type": "Event"
          },
          {
            "name": "排行服务",
            "type": "Event"
          },
          {
            "name": "分享服务",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "页面就绪",
            "type": "Event"
          }
        ]
      },
      "f7": {
        "location": [
          710,
          265
        ],
        "width": 240,
        "height": 150,
        "name": "f7",
        "label": "验收与证据策划",
        "type": "检查",
        "desc": "验收: 离线 114/114(注册62+社交39+进度13, 含转交/ack/身价三路径/屏蔽词/群/响应附带 mes); tsc 基线; ide-build→assetsCollect→tmpPack(ui.br31/nor.br55, 旧包恢复 head/ProgressBar); Edge CDP+Fetch 拦截 9/9(local/social-verify3.json, 截图 social3-*.png); doccheck 新增0。上传华为云待用户登录(可见 Edge 9227 云存储桶 sgf-rhq1y); 登录后 publish.py upload ui.br/nor.br/js/bundle.js+tokens。边界: 身价语义=发送方支付金币给接收方(accept 到账/reject 退还), 已文档化; 屏蔽词为服务端常量表命中标记不拦截; IDE 场景进程 reload 卡死不影响 ide-build; 生产上传未执行待登录。 【已上传生产】用户登录后 publish.py 覆盖上传 ui.br(2439875)/nor.br(3861856)/js/bundle.js(502354) 到 AGC 桶 sgf-rhq1y, 共享令牌不变(res.ts/index.html 仍有效); 生产冒烟 https://normalgame.cn/ 真实 CDN+Worker 9/9(local/social-verify-prod.json, 截图 socialprod-*.png)。 【服务器通讯修复+上线】根因=客户端新+线上 te 旧(v1112a sync/ack 未知 t)。已部署新 te(fcode.py up local/te-new.zip, 需先真实点击\"函数代码\"tab 使拖拽框可见; \"更新函数成功\"), probe_te 确认 v1116a bag/sync/ack code0 且附带 mes。js/bundle.js(504040) 经真实点击进 js/ + cs.upload(点上传按钮) 替换成功(令牌不变)。ui.br/nor.br 已更新。生产 normalgame.cn 冒烟 9/9(新 bundle: 个人页懒重绑生效/加号/身价/群/listbox)。Worker 仍旧版(功能正常, 风控 fail-open), 待用户 CF 授权后 wrangler deploy 改 history 点查。 【Worker 已部署】用户 CF 授权后 wrangler deploy 成功(Version a5912aa0), /health wv=v1116a(历史风控改用户行 history 点查)。全栈上线: Worker v1116a + te v1116a + ui.br/nor.br/bundle.js 新; 生产冒烟 9/9。服务器通讯闭环完成。 【buy 稳定性】probe 线上 buy×3 全 code0 不丢币(服务端稳定); 客户端 rescue: cloud.teOnce 非幂等写直连 null 且 webDegraded()(CORS 请求未达)时回退 Worker 一次(agcWeb 导出 webDegraded), 修复\"直连降级后非幂等写全失败\"。te 已部署(setprice/无金币转移), ui.br/bundle 已上传, 生产 12/12。",
        "inputs": [
          {
            "name": "页面就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "社交就绪",
            "type": "Event"
          }
        ]
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "社交入口",
        "from_socket_identifier": "社交入口",
        "from_socket_type": "Event",
        "to_node": "f6",
        "to_socket": "社交入口",
        "to_socket_identifier": "社交入口",
        "to_socket_type": "Event"
      },
      {
        "from_node": "f5",
        "from_socket": "DB就绪",
        "from_socket_identifier": "DB就绪",
        "from_socket_type": "Event",
        "to_node": "f1",
        "to_socket": "DB就绪",
        "to_socket_identifier": "DB就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "f5",
        "from_socket": "DB就绪",
        "from_socket_identifier": "DB就绪",
        "from_socket_type": "Event",
        "to_node": "f2",
        "to_socket": "DB就绪",
        "to_socket_identifier": "DB就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "f5",
        "from_socket": "DB就绪",
        "from_socket_identifier": "DB就绪",
        "from_socket_type": "Event",
        "to_node": "f3",
        "to_socket": "DB就绪",
        "to_socket_identifier": "DB就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "f5",
        "from_socket": "DB就绪",
        "from_socket_identifier": "DB就绪",
        "from_socket_type": "Event",
        "to_node": "f4",
        "to_socket": "DB就绪",
        "to_socket_identifier": "DB就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "f1",
        "from_socket": "好友服务",
        "from_socket_identifier": "好友服务",
        "from_socket_type": "Event",
        "to_node": "f6",
        "to_socket": "好友服务",
        "to_socket_identifier": "好友服务",
        "to_socket_type": "Event"
      },
      {
        "from_node": "f2",
        "from_socket": "消息服务",
        "from_socket_identifier": "消息服务",
        "from_socket_type": "Event",
        "to_node": "f6",
        "to_socket": "消息服务",
        "to_socket_identifier": "消息服务",
        "to_socket_type": "Event"
      },
      {
        "from_node": "f3",
        "from_socket": "排行服务",
        "from_socket_identifier": "排行服务",
        "from_socket_type": "Event",
        "to_node": "f6",
        "to_socket": "排行服务",
        "to_socket_identifier": "排行服务",
        "to_socket_type": "Event"
      },
      {
        "from_node": "f4",
        "from_socket": "分享服务",
        "from_socket_identifier": "分享服务",
        "from_socket_type": "Event",
        "to_node": "f6",
        "to_socket": "分享服务",
        "to_socket_identifier": "分享服务",
        "to_socket_type": "Event"
      },
      {
        "from_node": "f6",
        "from_socket": "页面就绪",
        "from_socket_identifier": "页面就绪",
        "from_socket_type": "Event",
        "to_node": "f7",
        "to_socket": "页面就绪",
        "to_socket_identifier": "页面就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "f7",
        "from_socket": "社交就绪",
        "from_socket_identifier": "社交就绪",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "社交就绪",
        "to_socket_identifier": "社交就绪",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/psocial.js"];
