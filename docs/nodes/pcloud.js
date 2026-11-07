window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/pcloud.js"]={
  "location": [
    -562.69,
    289.09
  ],
  "width": 240,
  "name": "pcloud",
  "label": "账号与云服务",
  "type": "Group",
  "desc": "Cloud 用户体系 + 云函数 + AGC/GOBE token。本地乐观更新、云端权威覆盖，失败不阻塞主流程。",
  "inputs": [
    {
      "name": "平台身份",
      "type": "Event"
    },
    {
      "name": "云端返回",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "用户身份",
      "type": "Event"
    },
    {
      "name": "GOBE token",
      "type": "Event"
    },
    {
      "name": "云端请求",
      "type": "Event"
    }
  ],
  "use_custom_color": true,
  "color": [
    0.85,
    0.55,
    0.2
  ],
  "group_output_location": [
    1330.28,
    319.13
  ],
  "height": 198,
  "node_tree": {
    "name": "账号与云服务 子树",
    "nodes": {
      "c1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "c1",
        "label": "用户模型 CloudUser",
        "type": "数据",
        "desc": "name/flag/head/userid/dollar/bag；IDB 存用户记录，后台自动注册。",
        "inputs": [
          {
            "name": "平台身份",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "用户记录",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "c2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "c2",
        "label": "init / verify / reg",
        "type": "流程",
        "desc": "Cloud.init 回调 from=local|cloud；verify 成功补资料；gone 时 reregister()。",
        "inputs": [
          {
            "name": "用户记录",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "资料就绪",
            "type": "Event"
          },
          {
            "name": "用户身份",
            "type": "Event"
          }
        ],
        "height": 155
      },
      "c3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "c3",
        "label": "update 昵称/签名",
        "type": "流程",
        "desc": "各消耗 1 金币；返回码 2 登录失效、4 金币不足，失败回滚输入。",
        "inputs": [
          {
            "name": "资料就绪",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 133
      },
      "c4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "c4",
        "label": "setHead 头像",
        "type": "流程",
        "desc": "校验拥有数量；未拥有 toast『未拥有』，数量不足回码 3。",
        "inputs": [
          {
            "name": "资料就绪",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 133
      },
      "c5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "c5",
        "label": "buy 商店购买",
        "type": "流程",
        "desc": "头像商品与金币商品（+5，仅测试）；Cloud.buy 失败回滚余额。",
        "inputs": [
          {
            "name": "资料就绪",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 133
      },
      "c6": {
        "location": [
          390,
          265
        ],
        "width": 240,
        "name": "c6",
        "label": "loadBag 背包",
        "type": "流程",
        "desc": "拉取拥有物品，用于头像弹窗与我的页背包列表。",
        "inputs": [
          {
            "name": "资料就绪",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 133
      },
      "c7": {
        "location": [
          710,
          265
        ],
        "width": 240,
        "name": "c7",
        "label": "del / clearLocal",
        "type": "流程",
        "desc": "清除账号与本地缓存，随后 SceneNav.reset 回到加载页。",
        "inputs": [
          {
            "name": "资料就绪",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 133
      },
      "c8": {
        "location": [
          1030,
          265
        ],
        "width": 240,
        "name": "c8",
        "label": "token 链路",
        "type": "流程",
        "desc": "AGC accesstoken（Web/WX 两套实现）→ NetBoot 缓存与并发重取 → Gnet 登录。",
        "inputs": [
          {
            "name": "资料就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "GOBE token",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "c9": {
        "location": [
          70,
          460
        ],
        "width": 240,
        "name": "c9",
        "label": "错误码约定",
        "type": "数据",
        "desc": "0 成功 / 2 登录失效 / 3 数量不足 / 4 金币不足；服务端 te/user.js 返回。",
        "inputs": [
          {
            "name": "资料就绪",
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
        "from_socket": "平台身份",
        "from_socket_identifier": "平台身份",
        "from_socket_type": "Event",
        "to_node": "c1",
        "to_socket": "平台身份",
        "to_socket_identifier": "平台身份",
        "to_socket_type": "Event"
      },
      {
        "from_node": "c1",
        "from_socket": "用户记录",
        "from_socket_identifier": "用户记录",
        "from_socket_type": "Event",
        "to_node": "c2",
        "to_socket": "用户记录",
        "to_socket_identifier": "用户记录",
        "to_socket_type": "Event"
      },
      {
        "from_node": "c2",
        "from_socket": "资料就绪",
        "from_socket_identifier": "资料就绪",
        "from_socket_type": "Event",
        "to_node": "c3",
        "to_socket": "资料就绪",
        "to_socket_identifier": "资料就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "c2",
        "from_socket": "资料就绪",
        "from_socket_identifier": "资料就绪",
        "from_socket_type": "Event",
        "to_node": "c4",
        "to_socket": "资料就绪",
        "to_socket_identifier": "资料就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "c2",
        "from_socket": "资料就绪",
        "from_socket_identifier": "资料就绪",
        "from_socket_type": "Event",
        "to_node": "c5",
        "to_socket": "资料就绪",
        "to_socket_identifier": "资料就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "c2",
        "from_socket": "资料就绪",
        "from_socket_identifier": "资料就绪",
        "from_socket_type": "Event",
        "to_node": "c6",
        "to_socket": "资料就绪",
        "to_socket_identifier": "资料就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "c2",
        "from_socket": "资料就绪",
        "from_socket_identifier": "资料就绪",
        "from_socket_type": "Event",
        "to_node": "c7",
        "to_socket": "资料就绪",
        "to_socket_identifier": "资料就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "c2",
        "from_socket": "资料就绪",
        "from_socket_identifier": "资料就绪",
        "from_socket_type": "Event",
        "to_node": "c8",
        "to_socket": "资料就绪",
        "to_socket_identifier": "资料就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "c2",
        "from_socket": "资料就绪",
        "from_socket_identifier": "资料就绪",
        "from_socket_type": "Event",
        "to_node": "c9",
        "to_socket": "资料就绪",
        "to_socket_identifier": "资料就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "c2",
        "from_socket": "用户身份",
        "from_socket_identifier": "用户身份",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "用户身份",
        "to_socket_identifier": "用户身份",
        "to_socket_type": "Event"
      },
      {
        "from_node": "c8",
        "from_socket": "GOBE token",
        "from_socket_identifier": "GOBE token",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "GOBE token",
        "to_socket_identifier": "GOBE token",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/pcloud.js"];
