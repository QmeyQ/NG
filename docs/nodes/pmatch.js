window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/pmatch.js"]={
  "location": [
    441.79,
    676.52
  ],
  "width": 240,
  "name": "pmatch",
  "label": "匹配与加载",
  "type": "Group",
  "desc": "load.ts：恢复会话 → Gnet 初始化 → 随机匹配 → role_assign 协商 → 跳 game/badm.ls；PVE 走 pve/pve2 直进。",
  "inputs": [
    {
      "name": "匹配页打开",
      "type": "Event"
    },
    {
      "name": "平台身份",
      "type": "Event"
    },
    {
      "name": "对局结果",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "进入比赛",
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
    "name": "匹配与加载 子树",
    "nodes": {
      "l1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "l1",
        "label": "匹配页场景",
        "type": "代码",
        "desc": "nor/match/match.ls：Button 匹配、bButton 返回、pve / pve2 单机入口。",
        "inputs": [
          {
            "name": "匹配页打开",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "场景就绪",
            "type": "Event"
          },
          {
            "name": "单机",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "l2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "l2",
        "label": "会话恢复 onSceneShow",
        "type": "流程",
        "desc": "openId=Cloud.getUser().userid；状态归零，优先恢复既有 GOBE 会话/房间，不自动匹配。",
        "inputs": [
          {
            "name": "场景就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "身份就绪",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "l3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "l3",
        "label": "Gnet 初始化",
        "type": "流程",
        "desc": "NetBoot.ensure 取 accesstoken、加载 GOBE SDK、绑定 client/room 事件；失败重试。",
        "inputs": [
          {
            "name": "身份就绪",
            "type": "Event"
          },
          {
            "name": "平台身份",
            "type": "Event"
          },
          {
            "name": "通道就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "通道就绪",
            "type": "Event"
          },
          {
            "name": "连接异常",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "l4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "l4",
        "label": "随机匹配 / 取消",
        "type": "流程",
        "desc": "Gnet 随机匹配；isMatching + _armMatchWait 看门狗；中心按钮支持取消与重匹配。",
        "inputs": [
          {
            "name": "通道就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "满员",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "l5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "l5",
        "label": "角色指派协商",
        "type": "流程",
        "desc": "房主单源生成 role_assign，各端 role_ack；收齐 first/final/okplay 得 _finalAssignment。",
        "inputs": [
          {
            "name": "满员",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "指派完成",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "l6": {
        "location": [
          390,
          265
        ],
        "width": 240,
        "name": "l6",
        "label": "PVE 入口",
        "type": "流程",
        "desc": "pve→_jumpPve(2) 1v1；pve2→_jumpPve(4) 2v2；跳过联网。",
        "inputs": [
          {
            "name": "单机",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "单机就绪",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "l7": {
        "location": [
          710,
          265
        ],
        "width": 240,
        "name": "l7",
        "label": "进入比赛场景",
        "type": "流程",
        "desc": "SceneNav.open('game/badm.ls')；文件头注释提示 uuid 通道断链。",
        "inputs": [
          {
            "name": "指派完成",
            "type": "Event"
          },
          {
            "name": "单机就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "进入比赛",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "l8": {
        "location": [
          1030,
          265
        ],
        "width": 240,
        "name": "l8",
        "label": "断线重连与错误码",
        "type": "流程",
        "desc": "101106/104101 置 _roomRecoveryRequired；_scheduleReconnect 退避；监听 online/offline。",
        "inputs": [
          {
            "name": "连接异常",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "通道就绪",
            "type": "Event"
          }
        ],
        "height": 100
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "匹配页打开",
        "from_socket_identifier": "匹配页打开",
        "from_socket_type": "Event",
        "to_node": "l1",
        "to_socket": "匹配页打开",
        "to_socket_identifier": "匹配页打开",
        "to_socket_type": "Event"
      },
      {
        "from_node": "l1",
        "from_socket": "场景就绪",
        "from_socket_identifier": "场景就绪",
        "from_socket_type": "Event",
        "to_node": "l2",
        "to_socket": "场景就绪",
        "to_socket_identifier": "场景就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "l2",
        "from_socket": "身份就绪",
        "from_socket_identifier": "身份就绪",
        "from_socket_type": "Event",
        "to_node": "l3",
        "to_socket": "身份就绪",
        "to_socket_identifier": "身份就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "平台身份",
        "from_socket_identifier": "平台身份",
        "from_socket_type": "Event",
        "to_node": "l3",
        "to_socket": "平台身份",
        "to_socket_identifier": "平台身份",
        "to_socket_type": "Event"
      },
      {
        "from_node": "l3",
        "from_socket": "通道就绪",
        "from_socket_identifier": "通道就绪",
        "from_socket_type": "Event",
        "to_node": "l4",
        "to_socket": "通道就绪",
        "to_socket_identifier": "通道就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "l4",
        "from_socket": "满员",
        "from_socket_identifier": "满员",
        "from_socket_type": "Event",
        "to_node": "l5",
        "to_socket": "满员",
        "to_socket_identifier": "满员",
        "to_socket_type": "Event"
      },
      {
        "from_node": "l5",
        "from_socket": "指派完成",
        "from_socket_identifier": "指派完成",
        "from_socket_type": "Event",
        "to_node": "l7",
        "to_socket": "指派完成",
        "to_socket_identifier": "指派完成",
        "to_socket_type": "Event"
      },
      {
        "from_node": "l1",
        "from_socket": "单机",
        "from_socket_identifier": "单机",
        "from_socket_type": "Event",
        "to_node": "l6",
        "to_socket": "单机",
        "to_socket_identifier": "单机",
        "to_socket_type": "Event"
      },
      {
        "from_node": "l6",
        "from_socket": "单机就绪",
        "from_socket_identifier": "单机就绪",
        "from_socket_type": "Event",
        "to_node": "l7",
        "to_socket": "单机就绪",
        "to_socket_identifier": "单机就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "l3",
        "from_socket": "连接异常",
        "from_socket_identifier": "连接异常",
        "from_socket_type": "Event",
        "to_node": "l8",
        "to_socket": "连接异常",
        "to_socket_identifier": "连接异常",
        "to_socket_type": "Event"
      },
      {
        "from_node": "l8",
        "from_socket": "通道就绪",
        "from_socket_identifier": "通道就绪",
        "from_socket_type": "Event",
        "to_node": "l3",
        "to_socket": "通道就绪",
        "to_socket_identifier": "通道就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "l7",
        "from_socket": "进入比赛",
        "from_socket_identifier": "进入比赛",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "进入比赛",
        "to_socket_identifier": "进入比赛",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/pmatch.js"];
