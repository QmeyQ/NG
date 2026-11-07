window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/bui.js"]={
  "location": [
    273.14,
    -363.01
  ],
  "width": 240,
  "name": "bui",
  "label": "界面与表现",
  "type": "Group",
  "desc": "CUI 摇杆/箭头、比赛 HUD、弹窗提示、音频与相机；结算界面缺失是当前最大体验缺口。",
  "inputs": [
    {
      "name": "比赛状态",
      "type": "Event"
    },
    {
      "name": "对局结果",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "提示",
      "type": "Event"
    }
  ],
  "use_custom_color": true,
  "color": [
    0.25,
    0.51,
    0.96
  ],
  "height": 176,
  "node_tree": {
    "name": "界面与表现 子树",
    "nodes": {
      "u1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "u1",
        "label": "CUI 摇杆绘制",
        "type": "代码",
        "desc": "setHitZone/resetHitZone、showJoystick、showHitJoystick、drawHitArrow、drawHitAngleArrow、setBoomerangMode。",
        "inputs": [
          {
            "name": "比赛状态",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "u2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "u2",
        "label": "比赛 HUD",
        "type": "流程",
        "desc": "比分、发球权、倒计时与命中提示；数据来自 Mag/Rule 事件。",
        "inputs": [
          {
            "name": "比赛状态",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "u3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "u3",
        "label": "弹窗与 toast",
        "type": "流程",
        "desc": "Dialog.showD / toast；对局内错误与网络异常提示复用平台弹窗。",
        "inputs": [
          {
            "name": "比赛状态",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "提示",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "u4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "u4",
        "label": "结算缺失",
        "type": "待办",
        "desc": "onMatchEnded 无消费方；ENDED 后没有结算面板与返回入口（P0）。",
        "inputs": [
          {
            "name": "对局结果",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "u5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "u5",
        "label": "音频",
        "type": "流程",
        "desc": "Au.setMusic/setSfx/tap；击球与得分音效绑定点需确认完整。",
        "inputs": [
          {
            "name": "比赛状态",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "u6": {
        "location": [
          390,
          265
        ],
        "width": 240,
        "name": "u6",
        "label": "相机",
        "type": "流程",
        "desc": "挂载到本地角色并跟随；PVP/PVE 分支共用。",
        "inputs": [
          {
            "name": "比赛状态",
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
        "to_node": "u1",
        "to_socket": "比赛状态",
        "to_socket_identifier": "比赛状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "比赛状态",
        "from_socket_identifier": "比赛状态",
        "from_socket_type": "Event",
        "to_node": "u2",
        "to_socket": "比赛状态",
        "to_socket_identifier": "比赛状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "比赛状态",
        "from_socket_identifier": "比赛状态",
        "from_socket_type": "Event",
        "to_node": "u3",
        "to_socket": "比赛状态",
        "to_socket_identifier": "比赛状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "比赛状态",
        "from_socket_identifier": "比赛状态",
        "from_socket_type": "Event",
        "to_node": "u5",
        "to_socket": "比赛状态",
        "to_socket_identifier": "比赛状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "比赛状态",
        "from_socket_identifier": "比赛状态",
        "from_socket_type": "Event",
        "to_node": "u6",
        "to_socket": "比赛状态",
        "to_socket_identifier": "比赛状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "对局结果",
        "from_socket_identifier": "对局结果",
        "from_socket_type": "Event",
        "to_node": "u4",
        "to_socket": "对局结果",
        "to_socket_identifier": "对局结果",
        "to_socket_type": "Event"
      },
      {
        "from_node": "u3",
        "from_socket": "提示",
        "from_socket_identifier": "提示",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "提示",
        "to_socket_identifier": "提示",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/bui.js"];
