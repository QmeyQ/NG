window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/bnet.js"]={
  "location": [
    -494.23,
    18.02
  ],
  "width": 240,
  "name": "bnet",
  "label": "联网与协议",
  "type": "Group",
  "desc": "GOBE 房间 / 帧同步 + 消息信封 + pvpProto 校验 + NetBoot 会话。消息分帧通道与可靠通道两类。",
  "inputs": [
    {
      "name": "平台身份",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "网络通道",
      "type": "Event"
    }
  ],
  "use_custom_color": true,
  "color": [
    0.85,
    0.55,
    0.2
  ],
  "height": 154,
  "node_tree": {
    "name": "联网与协议 子树",
    "nodes": {
      "t1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "t1",
        "label": "Gnet 初始化",
        "type": "流程",
        "desc": "参数校验（accessToken / clientSecret 互斥）、SDK 加载、Client init 与失败诊断。",
        "inputs": [
          {
            "name": "平台身份",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "会话",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "t2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "t2",
        "label": "消息信封",
        "type": "数据",
        "desc": "v / kind / seq / time / from / authTerm；统一 send 组装、accept 裁决、dispatch 分发。",
        "inputs": [
          {
            "name": "会话",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "通道",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "t3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "t3",
        "label": "通道选择",
        "type": "规则",
        "desc": "msg 走 sendToClient 可靠通道，frame 走 sendFrame 帧通道；由注册表 kind 决定。",
        "inputs": [
          {
            "name": "通道",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "通道",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "t4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "t4",
        "label": "消息注册表",
        "type": "数据",
        "desc": "按 kind 声明 authOnly/forMe/去重/序号/过期/校验规则，共约 18 类。",
        "inputs": [
          {
            "name": "通道",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "校验",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "t5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "t5",
        "label": "pvpProto 校验",
        "type": "规则",
        "desc": "Kind 枚举、BOUNDS、encodeBall、checkHit、checkAssign；损失容忍度与作弊防护。",
        "inputs": [
          {
            "name": "校验",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "t6": {
        "location": [
          390,
          265
        ],
        "width": 240,
        "name": "t6",
        "label": "NetBoot 会话",
        "type": "流程",
        "desc": "ensure(force)/ready()/openId()；accesstoken 缓存、并发重取队列、失败回调。",
        "inputs": [
          {
            "name": "会话",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "t7": {
        "location": [
          710,
          265
        ],
        "width": 240,
        "name": "t7",
        "label": "QA 调试菜单",
        "type": "代码",
        "desc": "QA.installMenu / installMatch 注入调试面板，正式包需关闭。",
        "inputs": [
          {
            "name": "会话",
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
        "from_socket": "平台身份",
        "from_socket_identifier": "平台身份",
        "from_socket_type": "Event",
        "to_node": "t1",
        "to_socket": "平台身份",
        "to_socket_identifier": "平台身份",
        "to_socket_type": "Event"
      },
      {
        "from_node": "t1",
        "from_socket": "会话",
        "from_socket_identifier": "会话",
        "from_socket_type": "Event",
        "to_node": "t2",
        "to_socket": "会话",
        "to_socket_identifier": "会话",
        "to_socket_type": "Event"
      },
      {
        "from_node": "t2",
        "from_socket": "通道",
        "from_socket_identifier": "通道",
        "from_socket_type": "Event",
        "to_node": "t3",
        "to_socket": "通道",
        "to_socket_identifier": "通道",
        "to_socket_type": "Event"
      },
      {
        "from_node": "t3",
        "from_socket": "通道",
        "from_socket_identifier": "通道",
        "from_socket_type": "Event",
        "to_node": "t4",
        "to_socket": "通道",
        "to_socket_identifier": "通道",
        "to_socket_type": "Event"
      },
      {
        "from_node": "t4",
        "from_socket": "校验",
        "from_socket_identifier": "校验",
        "from_socket_type": "Event",
        "to_node": "t5",
        "to_socket": "校验",
        "to_socket_identifier": "校验",
        "to_socket_type": "Event"
      },
      {
        "from_node": "t1",
        "from_socket": "会话",
        "from_socket_identifier": "会话",
        "from_socket_type": "Event",
        "to_node": "t6",
        "to_socket": "会话",
        "to_socket_identifier": "会话",
        "to_socket_type": "Event"
      },
      {
        "from_node": "t1",
        "from_socket": "会话",
        "from_socket_identifier": "会话",
        "from_socket_type": "Event",
        "to_node": "t7",
        "to_socket": "会话",
        "to_socket_identifier": "会话",
        "to_socket_type": "Event"
      },
      {
        "from_node": "t3",
        "from_socket": "通道",
        "from_socket_identifier": "通道",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "网络通道",
        "to_socket_identifier": "网络通道",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/bnet.js"];
