window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/pres.001.js"]={
  "location": [
    -196.59,
    56.51
  ],
  "width": 240,
  "name": "pres.001",
  "label": "资源与存储",
  "type": "Group",
  "desc": "nor / ui / game 三级分包，版本比对、下载解压、进度预测与本地缓存（Web IndexedDB / 微信 kv+file）。",
  "inputs": [
    {
      "name": "资源获取",
      "type": "Event",
      "default": 0
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
  "group_output_location": [
    336.14,
    505.78
  ],
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
        "height": 133
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
        "height": 133
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
        "height": 133
      },
      "r4": {
        "location": [
          1058.68,
          -29.49
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
        "height": 133
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
        "height": 133
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
        "height": 133
      },
      "r8": {
        "location": [
          1053.26,
          148.14
        ],
        "width": 260,
        "name": "r8",
        "label": "动画状态机还原",
        "type": "Group",
        "desc": "独立动画状态机子流程：读取 ani.controller，恢复状态、Clip、默认状态与全部转换，按当前 Laya 版本装配 Animator 并验证。",
        "inputs": [
          {
            "name": "ani.controller",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "Animator 层",
            "type": "Event"
          }
        ],
        "use_custom_color": true,
        "color": [
          0.36,
          0.48,
          0.72
        ],
        "height": 154,
        "node_tree_file": "nodes/r8.001.js"
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
      },
      {
        "from_node": "r3",
        "from_socket": "包就绪",
        "from_socket_type": "Event",
        "from_socket_identifier": "包就绪",
        "to_node": "r8",
        "to_socket": "ani.controller",
        "to_socket_type": "Event",
        "to_socket_identifier": "ani.controller"
      },
      {
        "from_node": "r8",
        "from_socket": "Animator 层",
        "from_socket_type": "Event",
        "from_socket_identifier": "Animator 层",
        "to_node": "r5",
        "to_socket": "包就绪",
        "to_socket_type": "Event",
        "to_socket_identifier": "包就绪"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/pres.001.js"];
