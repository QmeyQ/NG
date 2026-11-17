window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/r8.js"]={
  "location": [
    710,
    265
  ],
  "width": 260,
  "name": "r8",
  "label": "动画状态机还原",
  "type": "Group",
  "desc": "已实现：ResLoader._buildController 先 new Laya.AnimatorController(JSON.parse(text)) 原生解析，再按路径 Map 去重并发加载/替换 Clip、addDeps，返回可缓存的 AnimatorController；挂载 anim.controller 由原生创建独立实例层并保留 clone 转换。失败清理并由解析回调返回 null；未实现 layer/state 全量诊断或重复ID严格验证。",
  "inputs": [
    {
      "name": "ani.controller",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "AnimatorController",
      "type": "Event"
    },
    {
      "name": "解析失败",
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
        "desc": "parseBlobToEngineObject 的 .controller 分支通过 blobAb/ab2str 读取文本，传入 _buildController；JSON.parse(text) 后直接交给原生构造器，不先替换 Clip 引用或过滤状态/转换字段。读取/JSON 错误进入失败回调。",
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
          },
          {
            "name": "构造失败",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "a2": {
        "location": [
          370,
          70
        ],
        "width": 240,
        "name": "a2",
        "label": "先原生解析 AnimatorController",
        "type": "流程",
        "desc": "先执行 new Laya.AnimatorController(JSON.parse(text))，保留原生 controller.data.controllerLayers 与嵌套 states。原生解析必须早于 Clip 对象替换，否则没有 _$uuid 的状态会被引擎删除；不再手工重建状态机。",
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
          },
          {
            "name": "构造失败",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "a3": {
        "location": [
          670,
          70
        ],
        "width": 240,
        "name": "a3",
        "label": "层结构与原生 ID 映射",
        "type": "流程",
        "desc": "ResLoader 检查 controllerLayers 非空，并递归遍历各层 states 收集 Clip 引用。挂载时逐层 ID → AnimatorState 映射由原生引擎负责；没有自建重复ID/名称严格验证或跨层引用全量诊断，不把这些规划宣称为已实现。",
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
          },
          {
            "name": "构造失败",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "a4": {
        "location": [
          970,
          70
        ],
        "width": 240,
        "name": "a4",
        "label": "并发加载 Clip / 路径去重",
        "type": "流程",
        "desc": "递归遍历 state.clip._$uuid，经 _relKey 按包前缀/控制器目录解析键；Map<string, Promise<AnimationClip>> 按路径去重，用 source.get 并发加载、Promise.all 等待。非 AnimationClip 抛出带路径的错误；现有错误不含完整 layer/state 定位。空有效层或 Clip 加载失败进入清理分支。",
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
          },
          {
            "name": "构造失败",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "a5": {
        "location": [
          1270,
          70
        ],
        "width": 240,
        "name": "a5",
        "label": "替换 Clip / addDeps / 返回",
        "type": "流程",
        "desc": "将原生解析后的各 state.clip 引用替换为已加载的 AnimationClip；全部 job 完成后 controller.addDeps(await Promise.all(clips.values()))，返回 AnimatorController 交 Res 缓存。a6～a10 是挂载时原生语义说明，a11 是验证证据，不是缓存返回的前置加载步骤。",
        "inputs": [
          {
            "name": "Clip 就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "控制器资源",
            "type": "Event"
          },
          {
            "name": "构造失败",
            "type": "Event"
          }
        ],
        "height": 100
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
        "desc": "原生挂载语义：Entry（ID -1）的流向设置每层默认状态，Any State（ID -2）按引擎规则展开为全局转换；伪状态不作为普通播放状态。ResLoader 不额外实现默认状态可播放性的严格验证。",
        "inputs": [
          {
            "name": "控制器资源",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "入口定义",
            "type": "Event"
          }
        ],
        "height": 100
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
        "desc": "原生挂载语义：依据当前层 ID → 状态映射恢复普通转换目标与转换顺序，区分 Entry/Any State；solo/mute 由原生处理。未手写仅含 Clip 的 Layer，避免 clone 时丢失转换。",
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
        "height": 100
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
        "desc": "原生挂载语义：条件参数按 name 映射，条件类型/阈值与顺序交由引擎处理；恢复 exitByTime、exitTime、transduration、transstartoffset。当前未增加未知条件、不支持字段、缺失目标的全量诊断。",
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
        "height": 100
      },
      "a9": {
        "location": [
          970,
          265
        ],
        "width": 240,
        "name": "a9",
        "label": "原生循环语义 / 共享 Clip",
        "type": "检查",
        "desc": "已按项目真实引擎核对：状态 _isLooping 为 0继承Clip、1循环、2单次；由原生状态语义处理，不改共享 AnimationClip.islooping。相同 Clip 可被不同循环设置的状态复用，避免共享资源被污染。",
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
        "height": 100
      },
      "a10": {
        "location": [
          1270,
          265
        ],
        "width": 240,
        "name": "a10",
        "label": "anim.controller 挂载与克隆",
        "type": "流程",
        "desc": "badm.ts 取得并校验 AnimatorController 后，以 anim.controller = ctrl 挂到模型模板，再由 Mag clone 参赛实例。共用控制器/Clip 资源，各 Animator 原生创建独立层和运行态；clone 后默认状态与转换保留，不再 addControllerLayer 手工拼装。",
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
        "height": 100
      },
      "a11": {
        "location": [
          1570,
          265
        ],
        "width": 240,
        "name": "a11",
        "label": "已验证结果 / 未实现边界",
        "type": "检查",
        "desc": "前一步真实引擎45项浏览器测试通过：覆盖原生状态机、转换/条件/循环、Clip去重、实例隔离及clone保留转换。IDE构建工具等待超时但最终日志Success；tsc仅card.ts:80/82原有参数错误。本次文档同步不冒称重跑。失败日志含controller文件或Clip路径；layer/state全量诊断、重复ID严格验证仍未实现。",
        "inputs": [
          {
            "name": "Animator 层",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "aFail": {
        "location": [
          1570,
          70
        ],
        "width": 260,
        "height": 160,
        "name": "aFail",
        "label": "失败清理 / null 回调",
        "type": "流程",
        "desc": "读取或JSON/原生构造失败由 .controller 分支 catch 记录文件路径并 finish(null)；controller 已构造后的空层、Clip加载/替换、addDeps 错误，在 _buildController catch 中 destroy() 后重新抛出，外层统一 finish(null)。不缓存失败；Res.get 回调收到 null，Promise 形式转为 reject。",
        "inputs": [
          {
            "name": "构造失败",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "解析失败",
            "type": "Event"
          }
        ]
      }
    },
    "links": [
      {
        "from_node": "a3",
        "from_socket": "构造失败",
        "from_socket_identifier": "构造失败",
        "from_socket_type": "Event",
        "to_node": "aFail",
        "to_socket": "构造失败",
        "to_socket_identifier": "构造失败",
        "to_socket_type": "Event"
      },
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
        "from_socket": "控制器资源",
        "from_socket_identifier": "控制器资源",
        "from_socket_type": "Event",
        "to_node": "a6",
        "to_socket": "控制器资源",
        "to_socket_identifier": "控制器资源",
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
        "from_node": "a5",
        "from_socket": "控制器资源",
        "from_socket_identifier": "控制器资源",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "AnimatorController",
        "to_socket_identifier": "AnimatorController",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a1",
        "from_socket": "构造失败",
        "from_socket_identifier": "构造失败",
        "from_socket_type": "Event",
        "to_node": "aFail",
        "to_socket": "构造失败",
        "to_socket_identifier": "构造失败",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a2",
        "from_socket": "构造失败",
        "from_socket_identifier": "构造失败",
        "from_socket_type": "Event",
        "to_node": "aFail",
        "to_socket": "构造失败",
        "to_socket_identifier": "构造失败",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a4",
        "from_socket": "构造失败",
        "from_socket_identifier": "构造失败",
        "from_socket_type": "Event",
        "to_node": "aFail",
        "to_socket": "构造失败",
        "to_socket_identifier": "构造失败",
        "to_socket_type": "Event"
      },
      {
        "from_node": "a5",
        "from_socket": "构造失败",
        "from_socket_identifier": "构造失败",
        "from_socket_type": "Event",
        "to_node": "aFail",
        "to_socket": "构造失败",
        "to_socket_identifier": "构造失败",
        "to_socket_type": "Event"
      },
      {
        "from_node": "aFail",
        "from_socket": "解析失败",
        "from_socket_identifier": "解析失败",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "解析失败",
        "to_socket_identifier": "解析失败",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/r8.js"];
