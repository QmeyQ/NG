window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/pres.js"]={
  "location": [
    33.46,
    217.6
  ],
  "width": 240,
  "name": "pres",
  "label": "资源与存储",
  "type": "Group",
  "desc": "nor / ui / game 三级分包，版本比对、下载解压、进度预测与本地缓存（Web IndexedDB / 微信 kv+file）。",
  "inputs": [
    {
      "name": "版本清单",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "资源就绪",
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
    "name": "资源与存储 子树",
    "nodes": {
      "r1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "r1",
        "label": "分包结构",
        "type": "数据",
        "desc": "nor（含 nor/match/match.ls）/ ui / game（game/badm.ls）；对应 manifest 与 res.json。",
        "inputs": [
          {
            "name": "版本清单",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "包索引",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "r2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "r2",
        "label": "版本检查 Res.vers",
        "type": "流程",
        "desc": "返回 {needUpdate,size}；会话级 markVerified 避免重复检查。",
        "inputs": [
          {
            "name": "包索引",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "待下载",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "r3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "r3",
        "label": "下载与解压 Res.url",
        "type": "流程",
        "desc": "按需下载并解压；DP 事件给 url/percent/speed，XP 事件给解压进度。",
        "inputs": [
          {
            "name": "待下载",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "包就绪",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "r4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "r4",
        "label": "进度预测",
        "type": "流程",
        "desc": "MT.ProgModel 渐近模型 + 呼吸条，弱网下让进度条不倒退。",
        "inputs": [
          {
            "name": "包就绪",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "r5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "r5",
        "label": "缓存写入",
        "type": "流程",
        "desc": "Web: IndexedDB 双 store（数据 + 文件）；微信: wxKv* 与 wxFile*。",
        "inputs": [
          {
            "name": "包就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "资源就绪",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "r6": {
        "location": [
          390,
          265
        ],
        "width": 240,
        "name": "r6",
        "label": "热更新入口",
        "type": "流程",
        "desc": "后台发现 nor 新版本时提示『发现游戏资源新版本』，更新后不跳转、仅 toast。",
        "inputs": [
          {
            "name": "包索引",
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
        "from_socket": "版本清单",
        "from_socket_identifier": "版本清单",
        "from_socket_type": "Event",
        "to_node": "r1",
        "to_socket": "版本清单",
        "to_socket_identifier": "版本清单",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r1",
        "from_socket": "包索引",
        "from_socket_identifier": "包索引",
        "from_socket_type": "Event",
        "to_node": "r2",
        "to_socket": "包索引",
        "to_socket_identifier": "包索引",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r2",
        "from_socket": "待下载",
        "from_socket_identifier": "待下载",
        "from_socket_type": "Event",
        "to_node": "r3",
        "to_socket": "待下载",
        "to_socket_identifier": "待下载",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r3",
        "from_socket": "包就绪",
        "from_socket_identifier": "包就绪",
        "from_socket_type": "Event",
        "to_node": "r4",
        "to_socket": "包就绪",
        "to_socket_identifier": "包就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r3",
        "from_socket": "包就绪",
        "from_socket_identifier": "包就绪",
        "from_socket_type": "Event",
        "to_node": "r5",
        "to_socket": "包就绪",
        "to_socket_identifier": "包就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r5",
        "from_socket": "资源就绪",
        "from_socket_identifier": "资源就绪",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "资源就绪",
        "to_socket_identifier": "资源就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r1",
        "from_socket": "包索引",
        "from_socket_identifier": "包索引",
        "from_socket_type": "Event",
        "to_node": "r6",
        "to_socket": "包索引",
        "to_socket_identifier": "包索引",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/pres.js"];
