window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/p2.js"]={
  "location": [
    710,
    70
  ],
  "width": 240,
  "name": "p2",
  "label": "P2 工程卫生",
  "type": "Group",
  "desc": "不影响玩法但影响后续维护，建议尽快清理。",
  "inputs": [
    {
      "name": "问题",
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
  "height": 100,
  "node_tree": {
    "name": "P2 工程卫生 子树",
    "nodes": {
      "z1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "z1",
        "label": "CollisionManager 未接线",
        "type": "风险",
        "desc": "collision.ts 的 CollisionManager 在 src 内无引用，推挤与球碰撞可能未生效。",
        "inputs": [
          {
            "name": "问题",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "z2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "z2",
        "label": "调试日志遗留",
        "type": "风险",
        "desc": "Control._getSlideAngH 与 AI 决策每 200ms 彩色 console.log，正式包需移除。",
        "inputs": [
          {
            "name": "问题",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "z3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "z3",
        "label": "魔法数值",
        "type": "风险",
        "desc": "g=9.8、futureY 8.0/-2.0、回防 ±3.5、分工 3.0m、越界 x>0.2 均硬编码，应集中到配置。",
        "inputs": [
          {
            "name": "问题",
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
        "from_socket": "问题",
        "from_socket_identifier": "问题",
        "from_socket_type": "Event",
        "to_node": "z1",
        "to_socket": "问题",
        "to_socket_identifier": "问题",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/p2.js"];
