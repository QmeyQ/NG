window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/e3.js"]={
  "location": [
    710,
    70
  ],
  "width": 240,
  "name": "e3",
  "label": "资源与模型加载",
  "type": "Group",
  "desc": "场景加载细化子树(双击进入)：场地/球动态加载 → 角色模板 → 球拍/动画状态机 → INITCHA 按头像定模型。失败仅记录日志不阻塞开局。产出 roleModels(roleId→模型) 与就绪事件交 e4。",
  "inputs": [
    {
      "name": "场景资源",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "角色就绪",
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
  "group_input_location": [
    -487.41,
    52.16
  ],
  "group_output_location": [
    1355.33,
    84.74
  ],
  "node_tree": {
    "name": "资源与模型加载 子树",
    "nodes": {
      "r1": {
        "location": [
          93.59,
          68.79
        ],
        "width": 240,
        "name": "r1",
        "label": "场地与球加载",
        "type": "流程",
        "desc": "court/ball 一律从 nor 包预制体加载(nor/court@0.lh、nor/ball@0.lh)，挂到 Scene3D(0,0,0)；先摘除 badm.ls 静态占位节点；Res 缓存实例若已 destroyed 则 clear 后重载(尸体自愈)；取 floor/net 并给球网设透明双面。加载失败 console.error 后继续，不阻塞开局。",
        "inputs": [
          {
            "name": "场景资源",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "场地与球就绪",
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
        "label": "角色模板加载",
        "type": "流程",
        "desc": "并行 Res.get nor/girl1@0.lh 与 nor/boy@0.lh。模板只作 clone 源、永不进场景(避免缓存单例脏状态跨局残留)；后面的 Mag._initPlayers 按 roleModels 逐角色克隆对应模板，未使用的模板必须隐藏。",
        "inputs": [
          {
            "name": "场地与球就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "角色模板就绪",
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
        "label": "球拍与动画状态机",
        "type": "流程",
        "desc": "并行加载 nor/racket@0.lh 与 nor/ani.controller；动画控制器的 layers 挂到 girl1/boy 两个模板的 Animator 上(girl1 无组件则补建)，挂载必须先于 clone，保证每实例深拷出独立状态机。球拍随后由 Mag._initPlayers 挂到角色骨骼。",
        "inputs": [
          {
            "name": "角色模板就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "动画就绪",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "INITCHA": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "INITCHA",
        "label": "角色初始化(头像→模型)",
        "type": "流程",
        "desc": "为每个 roleId 解析展示头像，并由 Res.headModel 得到模型(0=girl1, 1=boy)，产出 roleModels 交 e4 克隆。映射唯一口径：当前 4 头像包按形象逐张登记——head/0(女巫)、head/3(天使)→girl1，head/2(棕发)、head/4(白发)→boy(序号奇偶与性别无关，包里也没有 head/1.png)；旧 30 头像包按编号段定性别——head/0101..0404(女)→girl1，head/1111..1414(男)→boy。不能按排序序号奇偶：既会把 0102(女)判成 boy，也会把 head/3(女)判成 boy，正是「头像都是 girl、对面却是 boy」的根因。PVP：每个 roleId 的头像取分配表对应玩家 customPlayerProperties.head(双端同源)；空头像=未选头像，按默认头像(headKey 回落的包内首张)定模型，不用本机头像回填。PVE：role 0 用本机云端头像；人机角色用 Res.headForModel 从当前包反查第一张同模型头像(当前包女得 head/0、男得 head/2；旧包女得 0101、男得 1111)，列表头像与 3D 模型成对出现，不能硬编码 head/1.png(包里无此键会回落首张女头像)。",
        "inputs": [
          {
            "name": "动画就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "角色就绪",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "pres.001": {
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
        "node_tree_file": "nodes/pres.001.js"
      }
    },
    "links": [
      {
        "from_node": "r1",
        "from_socket": "场地与球就绪",
        "from_socket_identifier": "场地与球就绪",
        "from_socket_type": "Event",
        "to_node": "r2",
        "to_socket": "场地与球就绪",
        "to_socket_identifier": "场地与球就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r2",
        "from_socket": "角色模板就绪",
        "from_socket_identifier": "角色模板就绪",
        "from_socket_type": "Event",
        "to_node": "r3",
        "to_socket": "角色模板就绪",
        "to_socket_identifier": "角色模板就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r3",
        "from_socket": "动画就绪",
        "from_socket_identifier": "动画就绪",
        "from_socket_type": "Event",
        "to_node": "INITCHA",
        "to_socket": "动画就绪",
        "to_socket_identifier": "动画就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "INITCHA",
        "from_socket": "角色就绪",
        "from_socket_identifier": "角色就绪",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "角色就绪",
        "to_socket_identifier": "角色就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "场景资源",
        "from_socket_type": "Event",
        "from_socket_identifier": "场景资源",
        "to_node": "pres.001",
        "to_socket": "资源获取",
        "to_socket_type": "Event",
        "to_socket_identifier": "版本清单"
      },
      {
        "from_node": "pres.001",
        "from_socket": "资源就绪",
        "from_socket_type": "Event",
        "from_socket_identifier": "资源就绪",
        "to_node": "r1",
        "to_socket": "场景资源",
        "to_socket_type": "Event",
        "to_socket_identifier": "场景资源"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/e3.js"];
