window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/bobj.js"]={
  "location": [
    407.25,
    -858.33
  ],
  "width": 240,
  "name": "bobj",
  "label": "场上对象",
  "type": "Group",
  "desc": "Obj 基类 + Ball / Cha / Ani：表现层只写节点位姿，物理真相仍在 Phy 内核。",
  "inputs": [
    {
      "name": "球位姿",
      "type": "Event"
    }
  ],
  "outputs": [],
  "use_custom_color": true,
  "color": [
    0.24,
    0.62,
    0.36
  ],
  "height": 154,
  "node_tree": {
    "name": "场上对象 子树",
    "nodes": {
      "o1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "o1",
        "label": "Obj 基类",
        "type": "代码",
        "desc": "持有 Sprite3D 根节点；封装 position/rotation setter，统一节点位姿管理。",
        "inputs": [
          {
            "name": "球位姿",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 133
      },
      "o2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "o2",
        "label": "Ball",
        "type": "流程",
        "desc": "构造时创建 Phy 并以当前节点位姿为起点；applyPose/attachTo/restoreSnap 分离；对外 flying/stateAt/sampleTrack。",
        "inputs": [
          {
            "name": "球位姿",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 133
      },
      "o3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "o3",
        "label": "Cha",
        "type": "流程",
        "desc": "ChaState 与 StrokeParams；角色状态机与击球参数结构。",
        "inputs": [
          {
            "name": "球位姿",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 133
      },
      "o4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "o4",
        "label": "Ani",
        "type": "流程",
        "desc": "每帧根骨骼对齐：把动画位移映射回角色位置，避免滑步。",
        "inputs": [
          {
            "name": "球位姿",
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
        "from_socket": "球位姿",
        "from_socket_identifier": "球位姿",
        "from_socket_type": "Event",
        "to_node": "o2",
        "to_socket": "球位姿",
        "to_socket_identifier": "球位姿",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "球位姿",
        "from_socket_identifier": "球位姿",
        "from_socket_type": "Event",
        "to_node": "o3",
        "to_socket": "球位姿",
        "to_socket_identifier": "球位姿",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "球位姿",
        "from_socket_identifier": "球位姿",
        "from_socket_type": "Event",
        "to_node": "o4",
        "to_socket": "球位姿",
        "to_socket_identifier": "球位姿",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/bobj.js"];
