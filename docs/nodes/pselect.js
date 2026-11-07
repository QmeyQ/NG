window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/pselect.js"]={
  "location": [
    436.16,
    390.4
  ],
  "width": 240,
  "name": "pselect",
  "label": "游戏大厅 / 选局",
  "type": "Group",
  "desc": "slecet.ts：游戏列表、账号校验、nor 资源检查；选中羽毛球后进入匹配页。其他条目统一提示未开放。",
  "inputs": [
    {
      "name": "游戏大厅",
      "type": "Event"
    },
    {
      "name": "用户身份",
      "type": "Event"
    },
    {
      "name": "资源就绪",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "匹配页打开",
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
  "group_input_location": [
    -261.2,
    397.09
  ],
  "group_output_location": [
    1092.72,
    397.85
  ],
  "node_tree": {
    "name": "游戏大厅 / 选局 子树",
    "nodes": {
      "s1": {
        "location": [
          66.77,
          66.57
        ],
        "width": 240,
        "name": "s1",
        "label": "选局界面结构",
        "type": "代码",
        "desc": "GPanel + Controller(c0) + GList，item0~4 切页；游戏图来自 ui 包 main/game/。",
        "inputs": [
          {
            "name": "游戏大厅",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "选中游戏",
            "type": "Event"
          }
        ],
        "height": 154
      },
      "s2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "s2",
        "label": "列表渲染与判定",
        "type": "流程",
        "desc": "onListRender 用 childIndexToItemIndex 实时取 _selIdx；index 0 为羽毛球。",
        "inputs": [
          {
            "name": "选中游戏",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "羽毛球",
            "type": "Event"
          },
          {
            "name": "未开放",
            "type": "Event"
          }
        ],
        "height": 155
      },
      "s3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "s3",
        "label": "羽毛球入口",
        "type": "流程",
        "desc": "_checkNorAndJump()：nor 包就绪→_jumpGame() 打开 nor/match/match.ls。",
        "inputs": [
          {
            "name": "羽毛球",
            "type": "Event"
          },
          {
            "name": "账号可用",
            "type": "Event"
          },
          {
            "name": "资源就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "匹配页打开",
            "type": "Event"
          }
        ],
        "height": 177
      },
      "s4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "s4",
        "label": "其他游戏占位",
        "type": "流程",
        "desc": "index>0 点击统一 Dialog.toast('暂未开放，敬请期待')。",
        "inputs": [
          {
            "name": "未开放",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 133
      },
      "s5": {
        "location": [
          67.24,
          249.3
        ],
        "width": 240,
        "name": "s5",
        "label": "账号校验 verifyUser",
        "type": "流程",
        "desc": "Cloud.verify：ok→initGobe；gone→重新注册；limited→toast；err 静默。",
        "inputs": [
          {
            "name": "用户身份",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "账号可用",
            "type": "Event"
          }
        ],
        "height": 154
      },
      "s6": {
        "location": [
          376.2,
          380.87
        ],
        "width": 240,
        "name": "s6",
        "label": "nor 包检查与下载",
        "type": "流程",
        "desc": "Res.net.cGet / Res.vers 判定；提示下载并用 DP 进度更新；失败红条重试。",
        "inputs": [
          {
            "name": "资源就绪",
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
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "游戏大厅",
        "from_socket_identifier": "游戏大厅",
        "from_socket_type": "Event",
        "to_node": "s1",
        "to_socket": "游戏大厅",
        "to_socket_identifier": "游戏大厅",
        "to_socket_type": "Event"
      },
      {
        "from_node": "s1",
        "from_socket": "选中游戏",
        "from_socket_identifier": "选中游戏",
        "from_socket_type": "Event",
        "to_node": "s2",
        "to_socket": "选中游戏",
        "to_socket_identifier": "选中游戏",
        "to_socket_type": "Event"
      },
      {
        "from_node": "s2",
        "from_socket": "羽毛球",
        "from_socket_identifier": "羽毛球",
        "from_socket_type": "Event",
        "to_node": "s3",
        "to_socket": "羽毛球",
        "to_socket_identifier": "羽毛球",
        "to_socket_type": "Event"
      },
      {
        "from_node": "s2",
        "from_socket": "未开放",
        "from_socket_identifier": "未开放",
        "from_socket_type": "Event",
        "to_node": "s4",
        "to_socket": "未开放",
        "to_socket_identifier": "未开放",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "用户身份",
        "from_socket_identifier": "用户身份",
        "from_socket_type": "Event",
        "to_node": "s5",
        "to_socket": "用户身份",
        "to_socket_identifier": "用户身份",
        "to_socket_type": "Event"
      },
      {
        "from_node": "s5",
        "from_socket": "账号可用",
        "from_socket_identifier": "账号可用",
        "from_socket_type": "Event",
        "to_node": "s3",
        "to_socket": "账号可用",
        "to_socket_identifier": "账号可用",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "资源就绪",
        "from_socket_identifier": "资源就绪",
        "from_socket_type": "Event",
        "to_node": "s6",
        "to_socket": "资源就绪",
        "to_socket_identifier": "资源就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "s6",
        "from_socket": "资源就绪",
        "from_socket_identifier": "资源就绪",
        "from_socket_type": "Event",
        "to_node": "s3",
        "to_socket": "资源就绪",
        "to_socket_identifier": "资源就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "s3",
        "from_socket": "匹配页打开",
        "from_socket_identifier": "匹配页打开",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "匹配页打开",
        "to_socket_identifier": "匹配页打开",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/pselect.js"];
