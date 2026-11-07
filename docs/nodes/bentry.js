window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/bentry.js"]={
  "location": [
    -761.24,
    -503.15
  ],
  "width": 240,
  "name": "bentry",
  "label": "比赛入口与装配",
  "type": "Group",
  "desc": "badm.ts：进入 game/badm.ls 后装配场景、角色与控制器，按 mode/人数创建 PVP 或 PVE。此后与平台/选局无关。",
  "inputs": [
    {
      "name": "进入比赛",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "对局就绪",
      "type": "Event"
    },
    {
      "name": "PVP",
      "type": "Event"
    },
    {
      "name": "PVE",
      "type": "Event"
    }
  ],
  "use_custom_color": true,
  "color": [
    0.16,
    0.62,
    0.78
  ],
  "height": 198,
  "node_tree": {
    "name": "比赛入口与装配 子树",
    "nodes": {
      "e1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "e1",
        "label": "onAwake 场景装配",
        "type": "代码",
        "desc": "创建 UI 与 Control，读 LocalStorage double 决定单手/双手，读取 gameMode/gamePlayerCount。",
        "inputs": [
          {
            "name": "进入比赛",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "控件注册",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "e2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "e2",
        "label": "hit / move 控件注册",
        "type": "流程",
        "desc": "查找 hit 与 move 节点，注册击球区域，把 move 注入 Control 的 UI 层。",
        "inputs": [
          {
            "name": "控件注册",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "场景资源",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "e3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "e3",
        "label": "资源与模型加载",
        "type": "流程",
        "desc": "加载场地/球/角色/动画控制器；失败走加载失败提示。",
        "inputs": [
          {
            "name": "场景资源",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "角色就绪",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "e4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "e4",
        "label": "角色克隆与人数",
        "type": "流程",
        "desc": "按 head 选角色皮肤，按 gamePlayerCount 克隆 2/4 个角色。",
        "inputs": [
          {
            "name": "角色就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "人数就绪",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "e5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "e5",
        "label": "PVP / PVE 分支",
        "type": "流程",
        "desc": "gameMode 决定 new PVP(...) 或 new PVE(...)，传入角色数组与阵营。",
        "inputs": [
          {
            "name": "人数就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "PVP",
            "type": "Event"
          },
          {
            "name": "PVE",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "e6": {
        "location": [
          390,
          265
        ],
        "width": 240,
        "name": "e6",
        "label": "相机与本地角色",
        "type": "流程",
        "desc": "挂载相机到本地角色，绑定 Control.onMove / onHit 到 Mag 的同步与击球入口。",
        "inputs": [
          {
            "name": "PVP",
            "type": "Event"
          },
          {
            "name": "PVE",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "对局就绪",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "e7": {
        "location": [
          710,
          265
        ],
        "width": 240,
        "name": "e7",
        "label": "每帧驱动",
        "type": "流程",
        "desc": "Timer.frameLoop：Mag.update → Rule.update → AI.update → Ball 采样输出位姿。",
        "inputs": [
          {
            "name": "对局就绪",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "e8": {
        "location": [
          1030,
          265
        ],
        "width": 240,
        "name": "e8",
        "label": "退出与销毁",
        "type": "流程",
        "desc": "onDestroy 停止计时器、解绑输入；GOBE 房间退出与 Msg 解绑存在缺口。",
        "inputs": [
          {
            "name": "对局就绪",
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
        "from_socket": "进入比赛",
        "from_socket_identifier": "进入比赛",
        "from_socket_type": "Event",
        "to_node": "e1",
        "to_socket": "进入比赛",
        "to_socket_identifier": "进入比赛",
        "to_socket_type": "Event"
      },
      {
        "from_node": "e1",
        "from_socket": "控件注册",
        "from_socket_identifier": "控件注册",
        "from_socket_type": "Event",
        "to_node": "e2",
        "to_socket": "控件注册",
        "to_socket_identifier": "控件注册",
        "to_socket_type": "Event"
      },
      {
        "from_node": "e2",
        "from_socket": "场景资源",
        "from_socket_identifier": "场景资源",
        "from_socket_type": "Event",
        "to_node": "e3",
        "to_socket": "场景资源",
        "to_socket_identifier": "场景资源",
        "to_socket_type": "Event"
      },
      {
        "from_node": "e3",
        "from_socket": "角色就绪",
        "from_socket_identifier": "角色就绪",
        "from_socket_type": "Event",
        "to_node": "e4",
        "to_socket": "角色就绪",
        "to_socket_identifier": "角色就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "e4",
        "from_socket": "人数就绪",
        "from_socket_identifier": "人数就绪",
        "from_socket_type": "Event",
        "to_node": "e5",
        "to_socket": "人数就绪",
        "to_socket_identifier": "人数就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "e5",
        "from_socket": "PVP",
        "from_socket_identifier": "PVP",
        "from_socket_type": "Event",
        "to_node": "e6",
        "to_socket": "PVP",
        "to_socket_identifier": "PVP",
        "to_socket_type": "Event"
      },
      {
        "from_node": "e5",
        "from_socket": "PVE",
        "from_socket_identifier": "PVE",
        "from_socket_type": "Event",
        "to_node": "e6",
        "to_socket": "PVE",
        "to_socket_identifier": "PVE",
        "to_socket_type": "Event"
      },
      {
        "from_node": "e6",
        "from_socket": "对局就绪",
        "from_socket_identifier": "对局就绪",
        "from_socket_type": "Event",
        "to_node": "e7",
        "to_socket": "对局就绪",
        "to_socket_identifier": "对局就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "e6",
        "from_socket": "对局就绪",
        "from_socket_identifier": "对局就绪",
        "from_socket_type": "Event",
        "to_node": "e8",
        "to_socket": "对局就绪",
        "to_socket_identifier": "对局就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "e6",
        "from_socket": "对局就绪",
        "from_socket_identifier": "对局就绪",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "对局就绪",
        "to_socket_identifier": "对局就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "e5",
        "from_socket": "PVP",
        "from_socket_identifier": "PVP",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "PVP",
        "to_socket_identifier": "PVP",
        "to_socket_type": "Event"
      },
      {
        "from_node": "e5",
        "from_socket": "PVE",
        "from_socket_identifier": "PVE",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "PVE",
        "to_socket_identifier": "PVE",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/bentry.js"];
