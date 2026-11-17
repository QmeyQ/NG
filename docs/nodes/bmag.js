window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/bmag.js"]={
  "location": [
    -264.38,
    -874.91
  ],
  "width": 240,
  "name": "bmag",
  "label": "比赛管理 Mag",
  "type": "Group",
  "desc": "比赛编排层：拥有 players/ball/teamMap/court/cfg 与 MatchState；规则委托 Rule，网络委托 PVP/PVE。本地输入与远端重放最终都走 hit()。",
  "inputs": [
    {
      "name": "对局就绪",
      "type": "Event"
    },
    {
      "name": "操作意图",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "比赛状态",
      "type": "Event"
    },
    {
      "name": "判决请求",
      "type": "Event"
    },
    {
      "name": "物理步进",
      "type": "Event"
    },
    {
      "name": "碰撞请求",
      "type": "Event"
    }
  ],
  "use_custom_color": true,
  "color": [
    0.16,
    0.62,
    0.78
  ],
  "height": 220,
  "node_tree": {
    "name": "比赛管理 Mag 子树",
    "nodes": {
      "g1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "g1",
        "label": "核心状态字段",
        "type": "数据",
        "desc": "MatchState 独立对象：phase / scores / servingTeam / currentHitTeam / gamesWon / gameEnded / matchEnded / isBallAssigned / isServeShot / lastScoreReason。局数按【队伍身份】统计，换边只换边不改冠军归属。",
        "inputs": [
          {
            "name": "对局就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "状态",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "g2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "g2",
        "label": "生命周期",
        "type": "流程",
        "desc": "构造函数(建 MatchState + Rule(this)) → attachCamera → startMatch → update → destroy。Mag 实现 RuleHost：Rule 只拿状态与只读对象，不再 import Mag 或反向摸私有字段。",
        "inputs": [
          {
            "name": "对局就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "状态",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "g3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "g3",
        "label": "hit 与队伍查询",
        "type": "流程",
        "desc": "hit(stroke, cha, hitTime) 是本机输入的击球链：启动前摇/应用动画，到点由 _executeHit 出手；replayHit(stroke, cha, hitTime) 是远端重放链：入口球已由 PVP restoreSnap 到权威入口，必须【立即】_executeHit(replay)——前摇会把球在入口冻 0.6~2s，超过物理 catchUp 600ms 上限后本端弹道永远追不上权威(run11 RALLYING 差 5.8m)。replay 强制出手并跳过击球权拦截：权威端能广播出 hit_event 就说明它已经裁定这一拍合法。出手后 onHit 把(参数+出手时刻)交给 PVP 发布。getTeam/isServer/isReceiver/getPlayerServePosition 为只读查询。",
        "inputs": [
          {
            "name": "操作意图",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "击球执行",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "g4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "g4",
        "label": "事件回调表",
        "type": "数据",
        "desc": "onStateChange / onScoreChanged / onGameEnded / onMatchEnded / onSideSwitch / onCountdown / onTeleport / onPeerLeft / onEagleChallengeWindow 等。比赛结束与对端离场必须有消费方（结果提示/停局），不能只声明不接线。",
        "inputs": [],
        "outputs": [
          {
            "name": "状态",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "g5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "g5",
        "label": "前置拦截",
        "type": "规则",
        "desc": "sameTeamJustHit / doubleHit / wrongReceiver 三类非法击球在 hit() 入口拒绝。",
        "inputs": [
          {
            "name": "操作意图",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "击球执行",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "g6": {
        "location": [
          390,
          265
        ],
        "width": 240,
        "name": "g6",
        "label": "阶段推进",
        "type": "流程",
        "desc": "Rule.update 推进 MatchState；Mag 只负责应用后果(传送/钉球/回调)。阶段、比分、发球权的唯一推进者是 Rule，PVP 网络层只通过 applyState 整体覆盖。",
        "inputs": [
          {
            "name": "击球执行",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "比赛状态",
            "type": "Event"
          },
          {
            "name": "判决请求",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "g7": {
        "location": [
          710,
          265
        ],
        "width": 240,
        "name": "g7",
        "label": "权威标志",
        "type": "数据",
        "desc": "PVP 下 isAuthoritative 决定谁产生权威击球事件；PVE 恒为本地权威。升格/降级只改这一个标志位，帧线程按它分支。",
        "inputs": [],
        "outputs": [
          {
            "name": "状态",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "g8": {
        "location": [
          70,
          460
        ],
        "width": 240,
        "name": "g8",
        "label": "状态写入纪律",
        "type": "规则",
        "desc": "三条合法写入口：①Rule 状态机推进 MatchState；②PVP.applyState 覆盖远端权威状态；③initMatch/构造的初始化。badm/UI/物理层只读，不得直接改 phase/比分/发球权。",
        "inputs": [
          {
            "name": "对局就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "比赛状态",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "g9": {
        "location": [
          390,
          460
        ],
        "width": 240,
        "name": "g9",
        "label": "结束与断线",
        "type": "流程",
        "desc": "matchEnded 后停止规则推进并由 badm 展示结果；onPeerLeft/房间解散 → 提示并结束本局；双打缺人不得空等。PVP 升格时继承缓存状态而不是从零开局；接管时若球已静止而阶段仍是 RALLYING，由 PVP 补交一次落地判定(Rule.settleGroundHit)，避免新权威卡在无效回合。",
        "inputs": [],
        "outputs": [
          {
            "name": "比赛状态",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "g10": {
        "location": [
          710,
          460
        ],
        "width": 240,
        "name": "g10",
        "label": "持球钉附",
        "type": "规则",
        "desc": "_updateBallHolding 只在 SERVING 阶段介入。先守两道上限：最近 800ms 真的出手过(ballJustHit)或球正在飞(flying)时一律不钉——迟到的「SERVING+持球」状态包不能把已打出去的发球抹掉；上一回合的残球在 SERVING 里还在滚时则会重新钉回，否则会滚出场外。随后按 authBallHolderId → isP → currentServer → 发球方队伍兜底解析持球者；持有者无效(isP 由权威端改写)时直接返回。最后才考虑权威端随状态帧下发的静止球位 authBallPose：只在 <500ms 新鲜【且距当前持球者 <1.5m】时照抄——两端各自的蒙皮手节点姿态差一拍(挥拍/插值)会稳定差 0.3~0.6m，所以优先用权威位姿；但上一回合的落点也可能在 500ms 内，不校验距离会把球钉到几米外的地上(run15 发球阶段差 9m)。都被否决时钉到本机手上。钉球只走 Ball.attachTo，不直接写物理字段。",
        "inputs": [
          {
            "name": "状态",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "物理步进",
            "type": "Event"
          }
        ],
        "height": 100
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "对局就绪",
        "from_socket_identifier": "对局就绪",
        "from_socket_type": "Event",
        "to_node": "g1",
        "to_socket": "对局就绪",
        "to_socket_identifier": "对局就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "对局就绪",
        "from_socket_identifier": "对局就绪",
        "from_socket_type": "Event",
        "to_node": "g2",
        "to_socket": "对局就绪",
        "to_socket_identifier": "对局就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "操作意图",
        "from_socket_identifier": "操作意图",
        "from_socket_type": "Event",
        "to_node": "g3",
        "to_socket": "操作意图",
        "to_socket_identifier": "操作意图",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "操作意图",
        "from_socket_identifier": "操作意图",
        "from_socket_type": "Event",
        "to_node": "g5",
        "to_socket": "操作意图",
        "to_socket_identifier": "操作意图",
        "to_socket_type": "Event"
      },
      {
        "from_node": "g3",
        "from_socket": "击球执行",
        "from_socket_identifier": "击球执行",
        "from_socket_type": "Event",
        "to_node": "g6",
        "to_socket": "击球执行",
        "to_socket_identifier": "击球执行",
        "to_socket_type": "Event"
      },
      {
        "from_node": "g6",
        "from_socket": "比赛状态",
        "from_socket_identifier": "比赛状态",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "比赛状态",
        "to_socket_identifier": "比赛状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "g6",
        "from_socket": "判决请求",
        "from_socket_identifier": "判决请求",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "判决请求",
        "to_socket_identifier": "判决请求",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "对局就绪",
        "from_socket_identifier": "对局就绪",
        "from_socket_type": "Event",
        "to_node": "g8",
        "to_socket": "对局就绪",
        "to_socket_identifier": "对局就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "g8",
        "from_socket": "比赛状态",
        "from_socket_identifier": "比赛状态",
        "from_socket_type": "Event",
        "to_node": "g9",
        "to_socket": "比赛状态",
        "to_socket_identifier": "比赛状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "g9",
        "from_socket": "比赛状态",
        "from_socket_identifier": "比赛状态",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "比赛状态",
        "to_socket_identifier": "比赛状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "g7",
        "from_socket": "状态",
        "from_socket_identifier": "状态",
        "from_socket_type": "Event",
        "to_node": "g10",
        "to_socket": "状态",
        "to_socket_identifier": "状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "g10",
        "from_socket": "物理步进",
        "from_socket_identifier": "物理步进",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "物理步进",
        "to_socket_identifier": "物理步进",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/bmag.js"];
