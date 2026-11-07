window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/brisk.js"]={
  "location": [
    -492.29,
    224.26
  ],
  "width": 240,
  "name": "brisk",
  "label": "已知问题与待办",
  "type": "Group",
  "desc": "按优先级归集当前 PVP/规则/同步的真实缺口，可直接当作迭代清单使用。",
  "inputs": [
    {
      "name": "问题",
      "type": "Event"
    }
  ],
  "outputs": [],
  "use_custom_color": true,
  "color": [
    0.78,
    0.26,
    0.3
  ],
  "height": 161,
  "node_tree": {
    "name": "已知问题与待办 子树",
    "nodes": {
      "p0": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "p0",
        "label": "P0 阻断级",
        "type": "Group",
        "desc": "直接影响胜负判定或对局可玩性，必须先修。",
        "inputs": [
          {
            "name": "问题",
            "type": "Event"
          }
        ],
        "outputs": [],
        "use_custom_color": true,
        "color": [
          0.78,
          0.26,
          0.3
        ],
        "height": 100,
        "node_tree_file": "nodes/p0.js"
      },
      "p1": {
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
        "node_tree_file": "nodes/p1.js"
      },
      "p2": {
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
        "node_tree_file": "nodes/p2.js"
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "问题",
        "from_socket_identifier": "问题",
        "from_socket_type": "Event",
        "to_node": "p0",
        "to_socket": "问题",
        "to_socket_identifier": "问题",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "问题",
        "from_socket_identifier": "问题",
        "from_socket_type": "Event",
        "to_node": "p1",
        "to_socket": "问题",
        "to_socket_identifier": "问题",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "问题",
        "from_socket_identifier": "问题",
        "from_socket_type": "Event",
        "to_node": "p2",
        "to_socket": "问题",
        "to_socket_identifier": "问题",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/brisk.js"];
