window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/bcoll.js"]={
  "location": [
    745.96,
    -455.34
  ],
  "width": 240,
  "name": "bcoll",
  "label": "碰撞检测",
  "type": "Group",
  "desc": "collision.ts：角色-角色/角色-网推挤与球-角色检测。注意：CollisionManager 在 src 中无引用，疑似未接线。",
  "inputs": [
    {
      "name": "碰撞请求",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "碰撞事件",
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
    "name": "碰撞检测 子树",
    "nodes": {
      "c1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "c1",
        "label": "CollisionManager 单例",
        "type": "代码",
        "desc": "注册 cha / ball / net 碰撞体，维护碰撞列表与更新入口。",
        "inputs": [
          {
            "name": "碰撞请求",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "c2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "c2",
        "label": "角色推挤 updateChaPos",
        "type": "流程",
        "desc": "角色-角色、角色-网的位置推挤与事件派发，修正重叠。",
        "inputs": [
          {
            "name": "碰撞请求",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "碰撞事件",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "c3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "c3",
        "label": "球-角色检测",
        "type": "流程",
        "desc": "checkBallCollisions 检测球与角色，触发 onCollision 用于击球判定。",
        "inputs": [
          {
            "name": "碰撞请求",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "碰撞事件",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "c4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "c4",
        "label": "未接线风险",
        "type": "待办",
        "desc": "CollisionManager 在 src 内无任何引用；若实际由场景脚本挂载需确认，否则推挤逻辑未生效。",
        "inputs": [
          {
            "name": "碰撞请求",
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
        "from_socket": "碰撞请求",
        "from_socket_identifier": "碰撞请求",
        "from_socket_type": "Event",
        "to_node": "c1",
        "to_socket": "碰撞请求",
        "to_socket_identifier": "碰撞请求",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "碰撞请求",
        "from_socket_identifier": "碰撞请求",
        "from_socket_type": "Event",
        "to_node": "c2",
        "to_socket": "碰撞请求",
        "to_socket_identifier": "碰撞请求",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "碰撞请求",
        "from_socket_identifier": "碰撞请求",
        "from_socket_type": "Event",
        "to_node": "c3",
        "to_socket": "碰撞请求",
        "to_socket_identifier": "碰撞请求",
        "to_socket_type": "Event"
      },
      {
        "from_node": "c2",
        "from_socket": "碰撞事件",
        "from_socket_identifier": "碰撞事件",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "碰撞事件",
        "to_socket_identifier": "碰撞事件",
        "to_socket_type": "Event"
      },
      {
        "from_node": "c3",
        "from_socket": "碰撞事件",
        "from_socket_identifier": "碰撞事件",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "碰撞事件",
        "to_socket_identifier": "碰撞事件",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/bcoll.js"];
