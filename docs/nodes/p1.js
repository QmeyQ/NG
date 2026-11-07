window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/p1.js"]={
  "location": [
    390,
    70
  ],
  "width": 240,
  "name": "p1",
  "label": "P1 体验/判定",
  "type": "Group",
  "desc": "规则与同步细节，影响公平性与操作手感。",
  "inputs": [
    {
      "name": "问题",
      "type": "Event"
    }
  ],
  "outputs": [],
  "use_custom_color": true,
  "color": [
    0.85,
    0.55,
    0.2
  ],
  "height": 100,
  "node_tree": {
    "name": "P1 体验/判定 子树",
    "nodes": {
      "y1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "y1",
        "label": "帧内不含球",
        "type": "风险",
        "desc": "帧只带 players；球位姿靠事件收敛，弱网下双端球位置短暂分叉。",
        "inputs": [
          {
            "name": "问题",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "y2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "y2",
        "label": "压线与触网",
        "type": "风险",
        "desc": "压线球判出界；触网完全无判罚，与真实羽毛球规则不符。",
        "inputs": [
          {
            "name": "问题",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "y3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "y3",
        "label": "鹰眼双开窗",
        "type": "风险",
        "desc": "EAGLE_CONFIRM 与 EAGLE_CHALLENGE 条件重叠，可能同时进入两个阶段。",
        "inputs": [
          {
            "name": "问题",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "y4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "y4",
        "label": "阶段冗余",
        "type": "风险",
        "desc": "SCORING 与 WAITING_START 未使用，阶段推进依赖回调链，调试时状态不直观。",
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
        "to_node": "y1",
        "to_socket": "问题",
        "to_socket_identifier": "问题",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/p1.js"];
