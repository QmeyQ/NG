window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/pmenu.js"]={
  "location": [
    41.59,
    -17.02
  ],
  "width": 240,
  "name": "pmenu",
  "label": "主菜单",
  "type": "Group",
  "desc": "menu.ls 预制体：item0~4 五页（首页/商店/社交/我的/设置），Controller c0 切页；负责玩法入口分发。",
  "inputs": [
    {
      "name": "主菜单就绪",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "游戏大厅",
      "type": "Event"
    },
    {
      "name": "社交入口",
      "type": "Event"
    },
    {
      "name": "其他游戏",
      "type": "Event"
    }
  ],
  "use_custom_color": true,
  "color": [
    0.16,
    0.62,
    0.78
  ],
  "height": 198,
  "node_tree": {
    "name": "主菜单 子树",
    "nodes": {
      "m1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "m1",
        "label": "菜单场景结构",
        "type": "代码",
        "desc": "ui/menu.ls：item0~4 + Controller(c0) + 底部页码；保存 musicOn/sfxOn/hitShow/double 开关。",
        "inputs": [
          {
            "name": "主菜单就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "页面切换",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "m2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "m2",
        "label": "首页与游戏入口",
        "type": "流程",
        "desc": "从 Res.getList('ui') 的 main/game/ 图片生成游戏列表；点击进选局。",
        "inputs": [
          {
            "name": "页面切换",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "游戏大厅",
            "type": "Event"
          },
          {
            "name": "其他游戏",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "m3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "m3",
        "label": "商店页",
        "type": "流程",
        "desc": "loadShop 渲染头像与金币商品；onBuy→Cloud.buy；金币商品标注『仅测试使用』。",
        "inputs": [
          {
            "name": "页面切换",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "m4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "m4",
        "label": "社交页（占位）",
        "type": "流程",
        "desc": "item2 仅有『暂未开放，敬请期待』文案，无好友/排行/分享逻辑。",
        "inputs": [
          {
            "name": "页面切换",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "社交入口",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "m5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "m5",
        "label": "我的页",
        "type": "流程",
        "desc": "昵称/签名编辑（各 1 金币）、头像选择、背包；Cloud.update / setHead / loadBag。",
        "inputs": [
          {
            "name": "页面切换",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "m6": {
        "location": [
          390,
          265
        ],
        "width": 240,
        "name": "m6",
        "label": "设置页",
        "type": "流程",
        "desc": "音乐/音效/击球显示/单手模式开关；清除数据走 Cloud.del + clearLocal。",
        "inputs": [
          {
            "name": "页面切换",
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
        "from_socket": "主菜单就绪",
        "from_socket_identifier": "主菜单就绪",
        "from_socket_type": "Event",
        "to_node": "m1",
        "to_socket": "主菜单就绪",
        "to_socket_identifier": "主菜单就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "m1",
        "from_socket": "页面切换",
        "from_socket_identifier": "页面切换",
        "from_socket_type": "Event",
        "to_node": "m2",
        "to_socket": "页面切换",
        "to_socket_identifier": "页面切换",
        "to_socket_type": "Event"
      },
      {
        "from_node": "m1",
        "from_socket": "页面切换",
        "from_socket_identifier": "页面切换",
        "from_socket_type": "Event",
        "to_node": "m3",
        "to_socket": "页面切换",
        "to_socket_identifier": "页面切换",
        "to_socket_type": "Event"
      },
      {
        "from_node": "m1",
        "from_socket": "页面切换",
        "from_socket_identifier": "页面切换",
        "from_socket_type": "Event",
        "to_node": "m4",
        "to_socket": "页面切换",
        "to_socket_identifier": "页面切换",
        "to_socket_type": "Event"
      },
      {
        "from_node": "m1",
        "from_socket": "页面切换",
        "from_socket_identifier": "页面切换",
        "from_socket_type": "Event",
        "to_node": "m5",
        "to_socket": "页面切换",
        "to_socket_identifier": "页面切换",
        "to_socket_type": "Event"
      },
      {
        "from_node": "m1",
        "from_socket": "页面切换",
        "from_socket_identifier": "页面切换",
        "from_socket_type": "Event",
        "to_node": "m6",
        "to_socket": "页面切换",
        "to_socket_identifier": "页面切换",
        "to_socket_type": "Event"
      },
      {
        "from_node": "m2",
        "from_socket": "游戏大厅",
        "from_socket_identifier": "游戏大厅",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "游戏大厅",
        "to_socket_identifier": "游戏大厅",
        "to_socket_type": "Event"
      },
      {
        "from_node": "m2",
        "from_socket": "其他游戏",
        "from_socket_identifier": "其他游戏",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "其他游戏",
        "to_socket_identifier": "其他游戏",
        "to_socket_type": "Event"
      },
      {
        "from_node": "m4",
        "from_socket": "社交入口",
        "from_socket_identifier": "社交入口",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "社交入口",
        "to_socket_identifier": "社交入口",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/pmenu.js"];
