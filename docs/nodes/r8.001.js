window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/r8.001.js"]={
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
  "node_tree": {
    "name": "动画状态机还原 子树",
    "nodes": {
      "a1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "a1",
        "label": "读取控制器 JSON",
        "type": "数据",
        "desc": "读取 ani.controller 原始 JSON；保留 controllerLayers、states、转换数组、状态 ID、名称、Clip 引用及默认状态字段。不得先过滤未知字段。",
        "inputs": [
          {
            "name": "ani.controller",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "控制器数据",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "a2": {
        "location": [
          370,
          70
        ],
        "width": 240,
        "name": "a2",
        "label": "解析层与状态节点",
        "type": "流程",
        "desc": "逐层解析 controllerLayers；区分真实播放状态与 Entry、Any State 等无 Clip 的伪状态；建立 layer、state 原始记录。",
        "inputs": [
          {
            "name": "控制器数据",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "状态结构",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "a3": {
        "location": [
          670,
          70
        ],
        "width": 240,
        "name": "a3",
        "label": "建立状态映射",
        "type": "流程",
        "desc": "为每层建立 state ID → 状态记录、state name → 状态对象映射；校验 ID/名称重复、目标引用缺失及跨层引用。",
        "inputs": [
          {
            "name": "状态结构",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "状态映射",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "a4": {
        "location": [
          970,
          70
        ],
        "width": 240,
        "name": "a4",
        "label": "加载动画 Clip",
        "type": "流程",
        "desc": "按 Clip UUID/路径与 controller 所在包目录解析资源；等待全部必需 Clip 加载；失败必须带 layer/state/clip 路径报错，不能静默跳过后宣称完成。",
        "inputs": [
          {
            "name": "状态映射",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "Clip 就绪",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "a5": {
        "location": [
          1270,
          70
        ],
        "width": 240,
        "name": "a5",
        "label": "创建 AnimatorState",
        "type": "流程",
        "desc": "根据真实状态创建 AnimatorState；设置 name、speed、clip、loop 等原始属性；保留原始状态 ID 到运行时对象的映射。",
        "inputs": [
          {
            "name": "Clip 就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "状态对象",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "a6": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "a6",
        "label": "解析默认状态与伪状态",
        "type": "流程",
        "desc": "识别每层默认状态；解析 Entry 的初始流向和 Any State 的全局转换源语义；检查默认状态是否存在且可播放。",
        "inputs": [
          {
            "name": "状态对象",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "入口定义",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "a7": {
        "location": [
          370,
          265
        ],
        "width": 240,
        "name": "a7",
        "label": "恢复普通状态转换",
        "type": "流程",
        "desc": "遍历状态转换数据，解析源状态、目标状态 ID、转换顺序；区分普通状态转换、Entry 转换、Any State 转换，不把伪状态创建成普通 AnimatorState。",
        "inputs": [
          {
            "name": "入口定义",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "转换关系",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "a8": {
        "location": [
          670,
          265
        ],
        "width": 240,
        "name": "a8",
        "label": "恢复转换参数与条件",
        "type": "流程",
        "desc": "逐条恢复 Exit Time、Duration、条件列表、条件参数名/类型/阈值及方向；保持 JSON 原始顺序。缺失目标、未知条件类型或不支持字段必须输出诊断。",
        "inputs": [
          {
            "name": "转换关系",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "完整转换定义",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "a9": {
        "location": [
          970,
          265
        ],
        "width": 240,
        "name": "a9",
        "label": "核对 Laya 引擎 API",
        "type": "检查",
        "desc": "对照项目实际 Laya 版本的 d.ts/引擎实现，确认 AnimatorControllerLayer、AnimatorStateTransition 的创建、添加、目标状态、条件、默认状态 API；禁止凭其他版本 API 猜写。",
        "inputs": [
          {
            "name": "完整转换定义",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "API 映射",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "a10": {
        "location": [
          1270,
          265
        ],
        "width": 240,
        "name": "a10",
        "label": "构建 Animator 层",
        "type": "流程",
        "desc": "按已验证 API 创建运行时 Layer、添加状态与转换、设置默认状态；同一动画资源/控制器设计继续共用，但可变运行态对象是否按 Animator 独立创建须按引擎行为确认。",
        "inputs": [
          {
            "name": "API 映射",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "Animator 层",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "a11": {
        "location": [
          1570,
          265
        ],
        "width": 240,
        "name": "a11",
        "label": "运行时验证与失败诊断",
        "type": "检查",
        "desc": "验证默认状态可播放、Entry/Any State/普通转换均可触发、条件与 Exit Time/Duration 生效；多角色实例互不串状态。失败输出 layer/state/transition/clip 定位信息。",
        "inputs": [
          {
            "name": "Animator 层",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "状态机验证通过",
            "type": "Event"
          }
        ],
        "height": 133
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "ani.controller",
        "from_socket_identifier": "ani.controller",
        "from_socket_type": "Event",
        "to_node": "a1",
        "to_socket": "ani.controller",
        "to_socket_identifier": "ani.controller",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a1",
        "from_socket": "控制器数据",
        "from_socket_identifier": "控制器数据",
        "from_socket_type": "Event",
        "to_node": "a2",
        "to_socket": "控制器数据",
        "to_socket_identifier": "控制器数据",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a2",
        "from_socket": "状态结构",
        "from_socket_identifier": "状态结构",
        "from_socket_type": "Event",
        "to_node": "a3",
        "to_socket": "状态结构",
        "to_socket_identifier": "状态结构",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a3",
        "from_socket": "状态映射",
        "from_socket_identifier": "状态映射",
        "from_socket_type": "Event",
        "to_node": "a4",
        "to_socket": "状态映射",
        "to_socket_identifier": "状态映射",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a4",
        "from_socket": "Clip 就绪",
        "from_socket_identifier": "Clip 就绪",
        "from_socket_type": "Event",
        "to_node": "a5",
        "to_socket": "Clip 就绪",
        "to_socket_identifier": "Clip 就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a5",
        "from_socket": "状态对象",
        "from_socket_identifier": "状态对象",
        "from_socket_type": "Event",
        "to_node": "a6",
        "to_socket": "状态对象",
        "to_socket_identifier": "状态对象",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a6",
        "from_socket": "入口定义",
        "from_socket_identifier": "入口定义",
        "from_socket_type": "Event",
        "to_node": "a7",
        "to_socket": "入口定义",
        "to_socket_identifier": "入口定义",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a7",
        "from_socket": "转换关系",
        "from_socket_identifier": "转换关系",
        "from_socket_type": "Event",
        "to_node": "a8",
        "to_socket": "转换关系",
        "to_socket_identifier": "转换关系",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a8",
        "from_socket": "完整转换定义",
        "from_socket_identifier": "完整转换定义",
        "from_socket_type": "Event",
        "to_node": "a9",
        "to_socket": "完整转换定义",
        "to_socket_identifier": "完整转换定义",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a9",
        "from_socket": "API 映射",
        "from_socket_identifier": "API 映射",
        "from_socket_type": "Event",
        "to_node": "a10",
        "to_socket": "API 映射",
        "to_socket_identifier": "API 映射",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a10",
        "from_socket": "Animator 层",
        "from_socket_identifier": "Animator 层",
        "from_socket_type": "Event",
        "to_node": "a11",
        "to_socket": "Animator 层",
        "to_socket_identifier": "Animator 层",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a11",
        "from_socket": "状态机验证通过",
        "from_socket_identifier": "状态机验证通过",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "Animator 层",
        "to_socket_identifier": "Animator 层",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/r8.001.js"];
