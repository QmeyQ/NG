window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/psocial.js"]={
  "location": [
    433.83,
    198.23
  ],
  "width": 240,
  "name": "psocial",
  "label": "社交模块（规划）",
  "type": "Group",
  "desc": "整块未开发：主菜单社交页只有占位文案，无好友/聊天/排行/分享的任何代码与数据结构。",
  "inputs": [
    {
      "name": "社交入口",
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
    "name": "社交模块（规划） 子树",
    "nodes": {
      "f1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "f1",
        "label": "好友系统（待开发）",
        "type": "待办",
        "desc": "缺少好友申请/列表/删除；无对应云函数与本地表结构。",
        "inputs": [],
        "outputs": [],
        "height": 100
      },
      "f2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "f2",
        "label": "私聊与消息（待开发）",
        "type": "待办",
        "desc": "无会话存储与推送；GOBE 仅用于对局房间。",
        "inputs": [],
        "outputs": [],
        "height": 100
      },
      "f3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "f3",
        "label": "排行榜（待开发）",
        "type": "待办",
        "desc": "无分数上报与榜单查询接口；结算结果当前未持久化。",
        "inputs": [],
        "outputs": [],
        "height": 100
      },
      "f4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "f4",
        "label": "分享与邀请（待开发）",
        "type": "待办",
        "desc": "无微信分享卡片/邀请链接接入。",
        "inputs": [],
        "outputs": [],
        "height": 100
      },
      "f5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "f5",
        "label": "接入前提",
        "type": "待办",
        "desc": "依赖：结算结果落库 → 云函数 → 平台入口与 UI；现有 Cloud 只覆盖账号/背包/商店。",
        "inputs": [],
        "outputs": [],
        "height": 100
      }
    },
    "links": []
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/psocial.js"];
