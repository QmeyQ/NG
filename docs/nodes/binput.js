window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/binput.js"]={
  "location": [
    -675.54,
    -875.83
  ],
  "width": 240,
  "name": "binput",
  "label": "输入控制",
  "type": "Group",
  "desc": "control.ts：按下/滑动/松手映射为击球参数；单手按按住时长定角，双手用移动摇杆定仰角；双击切特殊接球。",
  "inputs": [
    {
      "name": "输入事件",
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
    0.25,
    0.51,
    0.96
  ],
  "height": 154,
  "node_tree": {
    "name": "输入控制 子树",
    "nodes": {
      "n1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "n1",
        "label": "事件绑定",
        "type": "代码",
        "desc": "_bindInpEvents：start / move / end / keymov；按 id 路由移动与击球。",
        "inputs": [
          {
            "name": "输入事件",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "手势",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "n2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "n2",
        "label": "移动摇杆",
        "type": "流程",
        "desc": "_startMove/_updateMove/_stopMove；power=位移/最大半径，角度 atan2。",
        "inputs": [
          {
            "name": "手势",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "移动意图",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "n3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "n3",
        "label": "击球手势与力度",
        "type": "流程",
        "desc": "_startHit/_updateHit/_calcHitParams；power=距离/hitMaxRadius，滑动裁剪到 110px。",
        "inputs": [
          {
            "name": "手势",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "击球意图",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "n4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "n4",
        "label": "单手 / 双手映射",
        "type": "流程",
        "desc": "单手 angH=按住时长×90°（maxHoldTime=500ms）、angV=滑动方向；双手 angV=移动角、angH=滑动方向。",
        "inputs": [
          {
            "name": "击球意图",
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
      "n5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "n5",
        "label": "特殊击球",
        "type": "流程",
        "desc": "DOBTOUCH 切 setSpecialHit(true)，移动摇杆变回旋镖；不改移动本身。",
        "inputs": [
          {
            "name": "手势",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "n6": {
        "location": [
          390,
          265
        ],
        "width": 240,
        "name": "n6",
        "label": "释放与取消",
        "type": "流程",
        "desc": "_releaseHit 先带参 onHit 再空参 onHit；_cancelHit 取消。",
        "inputs": [
          {
            "name": "击球意图",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "n7": {
        "location": [
          710,
          265
        ],
        "width": 240,
        "name": "n7",
        "label": "调试遗留",
        "type": "待办",
        "desc": "_getSlideAngH 内 console.log(angH)，每次击球都会刷屏。",
        "inputs": [
          {
            "name": "手势",
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
        "from_socket": "输入事件",
        "from_socket_identifier": "输入事件",
        "from_socket_type": "Event",
        "to_node": "n1",
        "to_socket": "输入事件",
        "to_socket_identifier": "输入事件",
        "to_socket_type": "Event"
      },
      {
        "from_node": "n1",
        "from_socket": "手势",
        "from_socket_identifier": "手势",
        "from_socket_type": "Event",
        "to_node": "n2",
        "to_socket": "手势",
        "to_socket_identifier": "手势",
        "to_socket_type": "Event"
      },
      {
        "from_node": "n1",
        "from_socket": "手势",
        "from_socket_identifier": "手势",
        "from_socket_type": "Event",
        "to_node": "n3",
        "to_socket": "手势",
        "to_socket_identifier": "手势",
        "to_socket_type": "Event"
      },
      {
        "from_node": "n1",
        "from_socket": "手势",
        "from_socket_identifier": "手势",
        "from_socket_type": "Event",
        "to_node": "n5",
        "to_socket": "手势",
        "to_socket_identifier": "手势",
        "to_socket_type": "Event"
      },
      {
        "from_node": "n1",
        "from_socket": "手势",
        "from_socket_identifier": "手势",
        "from_socket_type": "Event",
        "to_node": "n7",
        "to_socket": "手势",
        "to_socket_identifier": "手势",
        "to_socket_type": "Event"
      },
      {
        "from_node": "n3",
        "from_socket": "击球意图",
        "from_socket_identifier": "击球意图",
        "from_socket_type": "Event",
        "to_node": "n4",
        "to_socket": "击球意图",
        "to_socket_identifier": "击球意图",
        "to_socket_type": "Event"
      },
      {
        "from_node": "n3",
        "from_socket": "击球意图",
        "from_socket_identifier": "击球意图",
        "from_socket_type": "Event",
        "to_node": "n6",
        "to_socket": "击球意图",
        "to_socket_identifier": "击球意图",
        "to_socket_type": "Event"
      },
      {
        "from_node": "n4",
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
window.__LAST_DOC=window.__DOC_FILES["nodes/binput.js"];
