window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/bpve.js"]={
  "location": [
    -127.32,
    -434.76
  ],
  "width": 240,
  "name": "bpve",
  "label": "PVE 单机",
  "type": "Group",
  "desc": "pve.ts：无联网权威，本地全部权威；AI 接管对手与队友。",
  "inputs": [
    {
      "name": "单机入口",
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
    0.24,
    0.62,
    0.36
  ],
  "height": 154,
  "node_tree": {
    "name": "PVE 单机 子树",
    "nodes": {
      "w1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "w1",
        "label": "本地权威模式",
        "type": "数据",
        "desc": "isAuthoritative 恒真、isPvpMode 假；不订阅任何网络消息。",
        "inputs": [
          {
            "name": "单机入口",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "权威状态",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "w2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "w2",
        "label": "AI 装配 setupDefaultAI",
        "type": "流程",
        "desc": "按 gamePlayerCount 为每个非本地角色创建 AIControl 并挂到 Mag。",
        "inputs": [
          {
            "name": "权威状态",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "AI 就绪",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "w3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "w3",
        "label": "AI 更新",
        "type": "流程",
        "desc": "update 每帧调用 AIControl.update，按阶段分发给发球/对打逻辑。",
        "inputs": [
          {
            "name": "AI 就绪",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 133
      },
      "w4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "w4",
        "label": "发球目标",
        "type": "流程",
        "desc": "getServeTarget 供 AI 发球与接发站位使用。",
        "inputs": [
          {
            "name": "权威状态",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 133
      },
      "w5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "w5",
        "label": "退出清理",
        "type": "待办",
        "desc": "destroy 未调用 super.destroy，AI 事件订阅未解绑。",
        "inputs": [
          {
            "name": "权威状态",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 133
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "单机入口",
        "from_socket_identifier": "单机入口",
        "from_socket_type": "Event",
        "to_node": "w1",
        "to_socket": "单机入口",
        "to_socket_identifier": "单机入口",
        "to_socket_type": "Event"
      },
      {
        "from_node": "w1",
        "from_socket": "权威状态",
        "from_socket_identifier": "权威状态",
        "from_socket_type": "Event",
        "to_node": "w2",
        "to_socket": "权威状态",
        "to_socket_identifier": "权威状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "w2",
        "from_socket": "AI 就绪",
        "from_socket_identifier": "AI 就绪",
        "from_socket_type": "Event",
        "to_node": "w3",
        "to_socket": "AI 就绪",
        "to_socket_identifier": "AI 就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "w1",
        "from_socket": "权威状态",
        "from_socket_identifier": "权威状态",
        "from_socket_type": "Event",
        "to_node": "w4",
        "to_socket": "权威状态",
        "to_socket_identifier": "权威状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "w1",
        "from_socket": "权威状态",
        "from_socket_identifier": "权威状态",
        "from_socket_type": "Event",
        "to_node": "w5",
        "to_socket": "权威状态",
        "to_socket_identifier": "权威状态",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/bpve.js"];
