window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/pstart.js"]={
  "location": [
    -280.4,
    -21.07
  ],
  "width": 240,
  "name": "pstart",
  "label": "启动与隐私",
  "type": "Group",
  "desc": "index.ts 启动链：启动页 → 隐私协议 → 资源版本检查 → 下载/恢复 → 进入主菜单。",
  "inputs": [
    {
      "name": "平台启动",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "主菜单就绪",
      "type": "Event"
    }
  ],
  "use_custom_color": true,
  "color": [
    0.16,
    0.62,
    0.78
  ],
  "height": 154,
  "node_tree": {
    "name": "启动与隐私 子树",
    "nodes": {
      "i1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "i1",
        "label": "启动页 index.ts",
        "type": "代码",
        "desc": "初始化 Dialog / Res / SceneNav，绑定资源进度事件，初始化隐私协议复选框。",
        "inputs": [
          {
            "name": "平台启动",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "协议弹出",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "i2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "i2",
        "label": "隐私协议弹窗",
        "type": "流程",
        "desc": "Dialog.showD 弹协议；同意→写本地标记继续；拒绝→退出或撤回许可。",
        "inputs": [
          {
            "name": "协议弹出",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "用户同意",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "i3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "i3",
        "label": "资源版本检查",
        "type": "流程",
        "desc": "Res.vers('ui'/'nor') 比对版本；需更新则提示下载，失败红条提示并重试。",
        "inputs": [
          {
            "name": "用户同意",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "需下载",
            "type": "Event"
          },
          {
            "name": "资源就绪",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "i4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "i4",
        "label": "下载与本地恢复",
        "type": "流程",
        "desc": "Res.url 下载解压（DP/XP 进度），或从 IndexedDB / 微信 kv 恢复已有资源。",
        "inputs": [
          {
            "name": "需下载",
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
      "i5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "i5",
        "label": "进入主菜单",
        "type": "流程",
        "desc": "SceneNav.open('ui/menu.ls')；加载失败清缓存自愈重试。",
        "inputs": [
          {
            "name": "资源就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "主菜单就绪",
            "type": "Event"
          }
        ],
        "height": 100
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "平台启动",
        "from_socket_identifier": "平台启动",
        "from_socket_type": "Event",
        "to_node": "i1",
        "to_socket": "平台启动",
        "to_socket_identifier": "平台启动",
        "to_socket_type": "Event"
      },
      {
        "from_node": "i1",
        "from_socket": "协议弹出",
        "from_socket_identifier": "协议弹出",
        "from_socket_type": "Event",
        "to_node": "i2",
        "to_socket": "协议弹出",
        "to_socket_identifier": "协议弹出",
        "to_socket_type": "Event"
      },
      {
        "from_node": "i2",
        "from_socket": "用户同意",
        "from_socket_identifier": "用户同意",
        "from_socket_type": "Event",
        "to_node": "i3",
        "to_socket": "用户同意",
        "to_socket_identifier": "用户同意",
        "to_socket_type": "Event"
      },
      {
        "from_node": "i3",
        "from_socket": "需下载",
        "from_socket_identifier": "需下载",
        "from_socket_type": "Event",
        "to_node": "i4",
        "to_socket": "需下载",
        "to_socket_identifier": "需下载",
        "to_socket_type": "Event"
      },
      {
        "from_node": "i3",
        "from_socket": "资源就绪",
        "from_socket_identifier": "资源就绪",
        "from_socket_type": "Event",
        "to_node": "i5",
        "to_socket": "资源就绪",
        "to_socket_identifier": "资源就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "i4",
        "from_socket": "资源就绪",
        "from_socket_identifier": "资源就绪",
        "from_socket_type": "Event",
        "to_node": "i5",
        "to_socket": "资源就绪",
        "to_socket_identifier": "资源就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "i5",
        "from_socket": "主菜单就绪",
        "from_socket_identifier": "主菜单就绪",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "主菜单就绪",
        "to_socket_identifier": "主菜单就绪",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/pstart.js"];
