window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/bpvp.js"]={
  "location": [
    -132.91,
    -245.75
  ],
  "width": 240,
  "name": "bpvp",
  "label": "PVP 对战",
  "type": "Group",
  "desc": "pvp.ts：角色指派 → 权威端选举 → 帧心跳 → 操作上行/重放 → 球校正与快照恢复。传输层不持有规则，状态只经 applyState 覆盖。",
  "inputs": [
    {
      "name": "进入比赛",
      "type": "Event"
    },
    {
      "name": "网络通道",
      "type": "Event"
    },
    {
      "name": "操作意图",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "对局结果",
      "type": "Event"
    }
  ],
  "use_custom_color": true,
  "color": [
    0.78,
    0.26,
    0.3
  ],
  "height": 198,
  "node_tree": {
    "name": "PVP 对战 子树",
    "nodes": {
      "v1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "v1",
        "label": "进房与角色指派",
        "type": "流程",
        "desc": "load 侧 role_assign/role_ack/match_start 三角色握手：房主单源指派并每 400ms 重发直到收齐 ack，收齐即提前开赛，否则超时也广播 match_start(发两遍)；非房主满员后每 800ms 用 assignSeq=0 的 role_ack 主动索要(首包丢失/进入页面时 match 通道未登记)，房主收到立即重发。双方收到 match_start(或非房主 1.5s 超时按指派表)后才切场景。PVP.setup 解析 playerId→Cha 映射。收发依赖 Gnet 的房间事件桥接：房间可能在 joinRoom 回调之后才挂到 client 上，桥接由 Gnet.getRoom() 惰性补装，否则该端能发包却收不到任何客户端消息(实测一端永久停在「仍未收到 role_assign」)。",
        "inputs": [
          {
            "name": "进入比赛",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "房间就绪",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "v2",
        "label": "PVP.setup",
        "type": "流程",
        "desc": "确定本地角色与队伍，登记玩家；双打按 2v2 阵型分配站位。",
        "inputs": [
          {
            "name": "房间就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "角色绑定",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "v3",
        "label": "bindNetwork",
        "type": "流程",
        "desc": "订阅约 18 类消息与帧回调，注册对端离开/房间解散处理，启动权威帧同步线程。",
        "inputs": [
          {
            "name": "角色绑定",
            "type": "Event"
          },
          {
            "name": "网络通道",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "通道订阅",
            "type": "Event"
          }
        ],
        "height": 155
      },
      "v4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "v4",
        "label": "权威端选举",
        "type": "流程",
        "desc": "初始首位玩家为权威；1s 未到时请求、2s/3s 依次升格；authTerm 裁决，stale-term 静默丢弃。",
        "inputs": [
          {
            "name": "通道订阅",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "权威确定",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "v5",
        "label": "帧心跳",
        "type": "流程",
        "desc": "100ms 心跳、50ms 合并；帧内只含 players（位置/动作），不含球状态。",
        "inputs": [
          {
            "name": "权威确定",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "帧下发",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v6": {
        "location": [
          390,
          265
        ],
        "width": 240,
        "name": "v6",
        "label": "本端操作提交",
        "type": "流程",
        "desc": "syncAction 上报 move/hit 意图并节流；击球只上行意图(参数+时刻)，不出售球坐标。真正的弹道锚点在权威端出手时由 onHit 发布(见 v7)。",
        "inputs": [
          {
            "name": "操作意图",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "操作上行",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v7": {
        "location": [
          710,
          265
        ],
        "width": 240,
        "name": "v7",
        "label": "权威处理远端",
        "type": "流程",
        "desc": "_applyAction 按 fromId 找到角色重放 move/hit(前摇用 hitTime 透传)；权威端在真正出手的瞬间(onHit→_publishExecutedHit)用本机模拟的入口状态+出手时刻生成 hit_event，经可靠通道广播。",
        "inputs": [
          {
            "name": "操作上行",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "击球广播",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v8": {
        "location": [
          1030,
          265
        ],
        "width": 240,
        "name": "v8",
        "label": "击球重放",
        "type": "流程",
        "desc": "_applyHitEvents 按 (authTerm, authorityHitSeq) 分层排序/去重/缺口检测；term 变化 = 新纪元，重置 applied seq。每条事件先 restoreSnap 到权威入口快照(击球时刻换算成本端时钟)，再按归属落地：本机那一拍先 cancelPendingHit 撤掉本地还挂着的前摇/松手链，再走 ball.restrike(同参数、同时刻重锚，不再走状态机)——不撤前摇的话松手会二次 _executeHit，入口取飞行中的球位、锚点为本机 now，与权威重锚分叉；restrike 必须同时把 lastHitInfo 的锚点与 appliedAt 更新到这次重锚(否则后续陈旧球位判据仍拿前摇前的旧锚点比较，把刚起飞的球判成可回钉)；远端那一拍走 Mag.replayHit —— 立即 _executeHit，不经过前摇/后摇排队。重放必须即时：前摇 0.6~2s 的冻结会超过物理 catchUp 600ms，迟到事件只能从错误入口起算(run11 RALLYING 5.8m、COUNTDOWN 死球 1.5s 不收敛都来自这里)。批量到达的多拍按序号逐条即时重放，最终态等于权威端连续出手。",
        "inputs": [
          {
            "name": "击球广播",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "球快照",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v9": {
        "location": [
          70,
          460
        ],
        "width": 240,
        "name": "v9",
        "label": "球校正三层",
        "type": "规则",
        "desc": "hit_event（权威弹道）/ ball_stop（落地）/ ball_recovery（快照）三级校正，容差内不打断。ball_stop 是否「击球前钉在手上的旧附件」要用【权威端生成这份停球的时刻 bt】判：SERVING 里权威端每帧 attachTo(手) 会把球快照的内核时刻刷成新的，按快照时刻判挡不住「击球前生成、击球后才到」的停球；bt 早于本机最近击球锚点(< li.time−50ms)且球正在飞/刚出手 → 丢弃，同 hs 的迟到重传也挡得住。真停球(落地/判罚熄火)一定生成在击球之后，bt 晚于锚点，照收。",
        "inputs": [
          {
            "name": "球快照",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "校正",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v10": {
        "location": [
          390,
          460
        ],
        "width": 240,
        "name": "v10",
        "label": "角色帧应用",
        "type": "流程",
        "desc": "非权威端按容差插值应用帧，_verifySelfInAuthFrame 自检并上报 PlayerStateReport。",
        "inputs": [
          {
            "name": "帧下发",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "对局结果",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v11": {
        "location": [
          710,
          460
        ],
        "width": 240,
        "name": "v11",
        "label": "快照恢复",
        "type": "流程",
        "desc": "cache 快照 → sync_recover → ball_recovery；role_recover_request/role_recover 走可靠通道(应用层 ack+重传)。role_recover 除 state/frame/players 外还带球锚点(ball/bt/bc/hitSeq/hitTerm)，接管后对端的球由此回到新权威的模拟。快照携带 hitEvents 历史窗口与 hitSeq；接收端先合并历史，只有快照/状态成功落地后才推进 applied seq。",
        "inputs": [
          {
            "name": "校正",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "恢复请求",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v12": {
        "location": [
          1030,
          460
        ],
        "width": 240,
        "name": "v12",
        "label": "断线与清理",
        "type": "待办",
        "desc": "onLeave/onDismiss → onPeerLeft；2v2 缺 1 人须结束本局(判负/转 AI 二选一，不能无限空等)；destroy 精确 unbind match/game 两侧处理器、停帧线程、清待签收与缓存。",
        "inputs": [
          {
            "name": "对局结果",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 133
      },
      "v13": {
        "location": [
          70,
          655
        ],
        "width": 240,
        "name": "v13",
        "label": "跨端时钟对齐",
        "type": "规则",
        "desc": "状态包信封 time 减本机接收时刻得到钟差样本 = 真实钟差 − 单程延时：传输只会让样本变小，所以窗口内取最大值才逼近「传输最接近 0」的那次(旧版取最小值等于专挑最慢的一包，钟差被系统性估小 ~100ms，对端击球锚点整体后移、球慢半拍)。窗口固定最近 32 个(8~10Hz 下约 3~4s)，兼顾抗抖动与跟住缓慢漂移；authorityChanged 时清空样本重估(两端设备钟差可完全不同)。hit_event.time、ball 快照 time、ball_stop.bt、ball_recovery/role_recover 的 bt 一律先换算到本端时基再进物理内核。倒计时重基也要扣传输时延：applyState 用「本机现在 − _toLocal(包内 time)」估出本包在路上的毫秒数，syncClock(cdRemainMs − transit)。",
        "inputs": [],
        "outputs": [],
        "height": 133
      },
      "v14": {
        "location": [
          390,
          655
        ],
        "width": 240,
        "name": "v14",
        "label": "任期/序号纪元",
        "type": "规则",
        "desc": "authorityHitSeq 只在同一 authTerm 内连续；接收端跟踪 lastTerm，term 上升即重置 appliedHitSeq。新权威继任时序号重基。非权威端的 action/ack/恢复请求不受 stale-term 整封丢弃(任期闸门只拦权威状态类消息)。",
        "inputs": [],
        "outputs": [],
        "height": 133
      },
      "v15": {
        "location": [
          710,
          655
        ],
        "width": 240,
        "name": "v15",
        "label": "交接球锚点",
        "type": "规则",
        "desc": "升格接管后新权威端立即广播球锚点(_broadcastBallAnchor → ball_recovery，300ms 后补一次)，并清掉 _ballStopAnnounced 让下一个停球沿可靠通道再报一次。若接管时球已静止而阶段仍是 RALLYING(groundHit 在非权威端被忽略，不会重发)，补交一次落地判定。对端的 role_recover 响应也携带同一锚点，双路径保证两端从同一颗球继续。",
        "inputs": [
          {
            "name": "权威确定",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "球快照",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v16": {
        "location": [
          1030,
          655
        ],
        "width": 240,
        "name": "v16",
        "label": "静止球位随状态帧",
        "type": "规则",
        "desc": "权威端在球静止(持球/死球/结算)时把球快照(encodeBall)塞进每 100ms 的状态包，非权威端 applyState 时 attach 到该位姿并记 authBallPose；_updateBallHolding 在发球阶段优先照抄它(<500ms 新鲜且距持球者 <1.5m)。这是消除「两端各钉各的蒙皮手 → 稳定差 0.3~0.6m」的权威口径，飞行中不发(弹道由击球事件逐拍锚定)。接收判据按【权威阶段 + 击球序号】分层，不能只看本端有没有活球：①状态包带 authTerm/hitSeq，若与本机击球纪元同任期且 hitSeq < 已应用序号，这份状态生成于已落地的那一拍之前，静止球位一律不收（否则 10Hz 帧迟到 100~300ms 就会把刚重锚的弹道钉回手上）；②阶段为 SERVING/COUNTDOWN/鹰眼时，未被①判旧的权威静止球位就是事实——本端还飞着的球只可能是「出手动作没送到权威端(静默/丢包)后本地擅自起算的投机弹道」或上一回合残留，必须照收，否则权威已判分/钉回发球手，本端却会沿错误弹道飞完整段(run3 交接后 19 连拍偏差 8m 的根因)；③阶段为 RALLYING 且状态不旧时，仍保留「本端有活球(ballJustHit 或 flying)拒收常规静止球位」的纪律，因为此时权威静止快照可能生成于本端这一拍之前、晚一帧才到。真正的停球事实仍由可靠 ball_stop(带权威端生成时刻 bt)兜底，不依赖状态帧；接管/恢复快照(ageMs>0)是完整事实不套这条。",
        "inputs": [
          {
            "name": "帧下发",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "球快照",
            "type": "Event"
          }
        ],
        "height": 133
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "进入比赛",
        "from_socket_identifier": "进入比赛",
        "from_socket_type": "Event",
        "to_node": "v1",
        "to_socket": "进入比赛",
        "to_socket_identifier": "进入比赛",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v1",
        "from_socket": "房间就绪",
        "from_socket_identifier": "房间就绪",
        "from_socket_type": "Event",
        "to_node": "v2",
        "to_socket": "房间就绪",
        "to_socket_identifier": "房间就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v2",
        "from_socket": "角色绑定",
        "from_socket_identifier": "角色绑定",
        "from_socket_type": "Event",
        "to_node": "v3",
        "to_socket": "角色绑定",
        "to_socket_identifier": "角色绑定",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "网络通道",
        "from_socket_identifier": "网络通道",
        "from_socket_type": "Event",
        "to_node": "v3",
        "to_socket": "网络通道",
        "to_socket_identifier": "网络通道",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v3",
        "from_socket": "通道订阅",
        "from_socket_identifier": "通道订阅",
        "from_socket_type": "Event",
        "to_node": "v4",
        "to_socket": "通道订阅",
        "to_socket_identifier": "通道订阅",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v4",
        "from_socket": "权威确定",
        "from_socket_identifier": "权威确定",
        "from_socket_type": "Event",
        "to_node": "v5",
        "to_socket": "权威确定",
        "to_socket_identifier": "权威确定",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "操作意图",
        "from_socket_identifier": "操作意图",
        "from_socket_type": "Event",
        "to_node": "v6",
        "to_socket": "操作意图",
        "to_socket_identifier": "操作意图",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v6",
        "from_socket": "操作上行",
        "from_socket_identifier": "操作上行",
        "from_socket_type": "Event",
        "to_node": "v7",
        "to_socket": "操作上行",
        "to_socket_identifier": "操作上行",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v7",
        "from_socket": "击球广播",
        "from_socket_identifier": "击球广播",
        "from_socket_type": "Event",
        "to_node": "v8",
        "to_socket": "击球广播",
        "to_socket_identifier": "击球广播",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v8",
        "from_socket": "球快照",
        "from_socket_identifier": "球快照",
        "from_socket_type": "Event",
        "to_node": "v9",
        "to_socket": "球快照",
        "to_socket_identifier": "球快照",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v9",
        "from_socket": "校正",
        "from_socket_identifier": "校正",
        "from_socket_type": "Event",
        "to_node": "v11",
        "to_socket": "校正",
        "to_socket_identifier": "校正",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v4",
        "from_socket": "权威确定",
        "from_socket_identifier": "权威确定",
        "from_socket_type": "Event",
        "to_node": "v15",
        "to_socket": "权威确定",
        "to_socket_identifier": "权威确定",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v15",
        "from_socket": "球快照",
        "from_socket_identifier": "球快照",
        "from_socket_type": "Event",
        "to_node": "v9",
        "to_socket": "球快照",
        "to_socket_identifier": "球快照",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v5",
        "from_socket": "帧下发",
        "from_socket_identifier": "帧下发",
        "from_socket_type": "Event",
        "to_node": "v16",
        "to_socket": "帧下发",
        "to_socket_identifier": "帧下发",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v16",
        "from_socket": "球快照",
        "from_socket_identifier": "球快照",
        "from_socket_type": "Event",
        "to_node": "v9",
        "to_socket": "球快照",
        "to_socket_identifier": "球快照",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v5",
        "from_socket": "帧下发",
        "from_socket_identifier": "帧下发",
        "from_socket_type": "Event",
        "to_node": "v10",
        "to_socket": "帧下发",
        "to_socket_identifier": "帧下发",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v10",
        "from_socket": "对局结果",
        "from_socket_identifier": "对局结果",
        "from_socket_type": "Event",
        "to_node": "v12",
        "to_socket": "对局结果",
        "to_socket_identifier": "对局结果",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v10",
        "from_socket": "对局结果",
        "from_socket_identifier": "对局结果",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "对局结果",
        "to_socket_identifier": "对局结果",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/bpvp.js"];
