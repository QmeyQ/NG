window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/pgame.js"]={
  "location": [
    431.85,
    10.96
  ],
  "width": 240,
  "name": "pgame",
  "label": "其他小游戏（规划）",
  "type": "Group",
  "desc": "游戏列表里只有 index 0（羽毛球）可进入；其余条目点击统一 toast 未开放，无任何场景与资源包。",
  "inputs": [
    {
      "name": "其他游戏",
      "type": "Event"
    }
  ],
  "outputs": [],
  "use_custom_color": true,
  "color": [
    0.48,
    0.38,
    0.75
  ],
  "height": 154,
  "node_tree": {
    "name": "其他小游戏（规划） 子树",
    "nodes": {
      "g1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "g1",
        "label": "入口列表来源",
        "type": "数据",
        "desc": "列表项来自 ui 包 main/game/ 图片，顺序 sort；index 0 为羽毛球。",
        "inputs": [
          {
            "name": "其他游戏",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "g2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "g2",
        "label": "占位行为",
        "type": "流程",
        "desc": "_selIdx>0 → Dialog.toast('暂未开放，敬请期待')，不触发资源检查。",
        "inputs": [
          {
            "name": "其他游戏",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "g3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "g3",
        "label": "新增玩法接入清单",
        "type": "待办",
        "desc": "需要：独立分包 + 场景 .ls + SceneNav 入口 + 选局图标 + 角色/结算适配 + 云数据表。",
        "inputs": [],
        "outputs": [],
        "height": 100
      }
    },
    "links": []
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/pgame.js"];
