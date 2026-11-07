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
  "desc": "比赛核心态与操作入口：players / ball / phase / 比分 / 发球方 / 权威标志；本地输入与远端重放最终都走 hit()。",
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
        "desc": "players、ball、phase、scores、servingTeam、holder（持球/发球人）、isAuthoritative、isPvpMode。",
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
        "desc": "构造函数 → attachCamera → startMatch → update → destroy；Rule 在构造时创建。",
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
        "desc": "hit(stroke, cha) 施加速度与动画；getTeam/isServer/isReceiver/getPlayerServePosition。",
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
        "desc": "声明 onStateChange/onScoreChanged/onMatchEnded 等 12 个回调，实际只绑定 6 个，结算回调无消费方。",
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
        "desc": "Rule.update 驱动 MatchPhase；得分、换发、局末都在这里串起来。",
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
        "desc": "PVP 下 isAuthoritative 决定谁产生权威击球事件；PVE 恒为本地权威。",
        "inputs": [],
        "outputs": [
          {
            "name": "状态",
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
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/bmag.js"];
