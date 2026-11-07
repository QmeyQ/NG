window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/pplat.js"]={
  "location": [
    -564.56,
    -23.54
  ],
  "width": 240,
  "name": "pplat",
  "label": "平台适配",
  "type": "Group",
  "desc": "微信/Web 差异、音频解锁、场景导航与本地设置；是平台层的横切能力。",
  "inputs": [
    {
      "name": "启动",
      "type": "Any",
      "default": 0
    }
  ],
  "outputs": [
    {
      "name": "平台能力",
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
    "name": "平台适配 子树",
    "nodes": {
      "a1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "a1",
        "label": "微信 vs Web 判定",
        "type": "数据",
        "desc": "sys.ts 判定运行环境；存储、文件、网络请求按平台分流。",
        "inputs": [],
        "outputs": [],
        "height": 100
      },
      "a2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "a2",
        "label": "音频 Au",
        "type": "流程",
        "desc": "首次点击解锁 AudioContext；Tone.js 动态加载；bgmPlayRich('main') 带 3s 防抖。",
        "inputs": [],
        "outputs": [
          {
            "name": "平台能力",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "a3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "a3",
        "label": "场景导航 SceneNav",
        "type": "流程",
        "desc": "open/reset；back 复用预制体不重跑 onAwake；派发 sceneShow。",
        "inputs": [],
        "outputs": [
          {
            "name": "平台能力",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "a4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "a4",
        "label": "本地设置",
        "type": "数据",
        "desc": "LocalStorage：musicOn/sfxOn/hitShow/double，默认开/显示/单手。",
        "inputs": [],
        "outputs": [
          {
            "name": "平台能力",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "a5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "a5",
        "label": "隐私同意标记",
        "type": "数据",
        "desc": "同意状态存本地；已同意用户可再次进入设置撤回。",
        "inputs": [],
        "outputs": [
          {
            "name": "平台能力",
            "type": "Event"
          }
        ],
        "height": 100
      }
    },
    "links": []
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/pplat.js"];
