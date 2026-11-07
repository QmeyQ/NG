window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/bai.js"]={
  "location": [
    89.86,
    -659.38
  ],
  "width": 240,
  "name": "bai",
  "label": "AI 对手",
  "type": "Group",
  "desc": "ai.ts：难度 0.4/0.6/0.8/0.95；发球/对打两阶段，抛物线预测落点 + PID 自纠错；硬编码较多。",
  "inputs": [
    {
      "name": "比赛状态",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "操作意图",
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
    "name": "AI 对手 子树",
    "nodes": {
      "a1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "a1",
        "label": "难度枚举",
        "type": "数据",
        "desc": "AIDifficulty：EASY 0.4 / NORMAL 0.6 / HARD 0.8 / EXPERT 0.95，影响反应与误差。",
        "inputs": [
          {
            "name": "比赛状态",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "a2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "a2",
        "label": "更新入口",
        "type": "流程",
        "desc": "update 按 _mag.phase 分发：COUNTDOWN/SERVING→发球逻辑，RALLYING→对打逻辑。",
        "inputs": [
          {
            "name": "比赛状态",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "决策",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "a3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "a3",
        "label": "发球决策",
        "type": "流程",
        "desc": "_handleServePhase → _tryServe；_calcServeStroke 生成击球参数，距离超 hitRange*0.9 不发。",
        "inputs": [
          {
            "name": "决策",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "操作意图",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "a4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "a4",
        "label": "对打决策",
        "type": "流程",
        "desc": "预测落点、判断可击、追球/回防/站位；willLandOnMySide 用 x 正负判断。",
        "inputs": [
          {
            "name": "决策",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "决策",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "a5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "a5",
        "label": "落点预测",
        "type": "流程",
        "desc": "_predictLandingPoint 解抛物线（g=9.8，y=cha.hitHeight），得到落点与剩余时间。",
        "inputs": [
          {
            "name": "决策",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "a6": {
        "location": [
          390,
          265
        ],
        "width": 240,
        "name": "a6",
        "label": "PID 自纠错",
        "type": "流程",
        "desc": "_pwCtrl / _angCtrl 对击球力度与角度做闭环修正，_pending 记录待执行击球。",
        "inputs": [
          {
            "name": "决策",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "操作意图",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "a7": {
        "location": [
          710,
          265
        ],
        "width": 240,
        "name": "a7",
        "label": "双打分工与回防",
        "type": "流程",
        "desc": "落点距队友 >3.0m 才抢；回防 x=±3.5；_clampPosition 限制己方半场。",
        "inputs": [
          {
            "name": "决策",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "a8": {
        "location": [
          1030,
          265
        ],
        "width": 240,
        "name": "a8",
        "label": "硬编码阈值",
        "type": "待办",
        "desc": "futureY 8.0/-2.0、回防 ±3.5、分工 3.0m、hitRange*0.9、每 200ms 彩色日志。",
        "inputs": [
          {
            "name": "决策",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "比赛状态",
        "from_socket_identifier": "比赛状态",
        "from_socket_type": "Event",
        "to_node": "a1",
        "to_socket": "比赛状态",
        "to_socket_identifier": "比赛状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "比赛状态",
        "from_socket_identifier": "比赛状态",
        "from_socket_type": "Event",
        "to_node": "a2",
        "to_socket": "比赛状态",
        "to_socket_identifier": "比赛状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a2",
        "from_socket": "决策",
        "from_socket_identifier": "决策",
        "from_socket_type": "Event",
        "to_node": "a3",
        "to_socket": "决策",
        "to_socket_identifier": "决策",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a2",
        "from_socket": "决策",
        "from_socket_identifier": "决策",
        "from_socket_type": "Event",
        "to_node": "a4",
        "to_socket": "决策",
        "to_socket_identifier": "决策",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a4",
        "from_socket": "决策",
        "from_socket_identifier": "决策",
        "from_socket_type": "Event",
        "to_node": "a5",
        "to_socket": "决策",
        "to_socket_identifier": "决策",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a4",
        "from_socket": "决策",
        "from_socket_identifier": "决策",
        "from_socket_type": "Event",
        "to_node": "a6",
        "to_socket": "决策",
        "to_socket_identifier": "决策",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a4",
        "from_socket": "决策",
        "from_socket_identifier": "决策",
        "from_socket_type": "Event",
        "to_node": "a7",
        "to_socket": "决策",
        "to_socket_identifier": "决策",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a4",
        "from_socket": "决策",
        "from_socket_identifier": "决策",
        "from_socket_type": "Event",
        "to_node": "a8",
        "to_socket": "决策",
        "to_socket_identifier": "决策",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a3",
        "from_socket": "操作意图",
        "from_socket_identifier": "操作意图",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "操作意图",
        "to_socket_identifier": "操作意图",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a6",
        "from_socket": "操作意图",
        "from_socket_identifier": "操作意图",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "操作意图",
        "to_socket_identifier": "操作意图",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/bai.js"];
