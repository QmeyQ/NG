window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/rparse.js"]={
  "location": [
    710,
    265
  ],
  "width": 260,
  "height": 180,
  "name": "rparse",
  "label": "独立资源解析 ResLoader",
  "type": "Group",
  "desc": "按业务 Res.get 请求解析，不在包就绪时全量预加载。Res管理下载/索引/入口/缓存，ResLoader经source注入完成解析；r8展开controller，resMaterial展开材质构造与天空纹理setter绑定。",
  "inputs": [
    {
      "name": "包可用",
      "type": "Event"
    },
    {
      "name": "资源请求",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "资源结果",
      "type": "Event"
    },
    {
      "name": "解析失败",
      "type": "Event"
    }
  ],
  "use_custom_color": true,
  "color": [
    0.24,
    0.62,
    0.36
  ],
  "node_tree": {
    "name": "独立资源解析 子树",
    "nodes": {
      "resEntry": {
        "location": [
          70,
          70
        ],
        "width": 260,
        "height": 200,
        "name": "resEntry",
        "label": "资源入口 / 路径与缓存",
        "type": "流程",
        "desc": "src/libs/res/res.ts 保留 Res.get 的 Promise/回调接口及下载、包索引、路径、缓存能力；按请求解析包名/路径并查缓存，读取包内文件或资源组。auto 命中直接返回，blob 请求返回原始数据；未命中才委托解析，文件缺失走失败。包可用只是依赖，不触发全部类型加载。",
        "inputs": [
          {
            "name": "包可用",
            "type": "Event"
          },
          {
            "name": "资源请求",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "缓存命中",
            "type": "Event"
          },
          {
            "name": "原始Blob",
            "type": "Event"
          },
          {
            "name": "待解析",
            "type": "Event"
          },
          {
            "name": "读取失败",
            "type": "Event"
          }
        ]
      },
      "resDelegate": {
        "location": [
          390,
          70
        ],
        "width": 260,
        "height": 240,
        "name": "resDelegate",
        "label": "委托 / source 注入",
        "type": "流程",
        "desc": "Res 持有独立 ResLoader；构造时注入 get/loadFile/hasPack，解析模块不 import Res，因此无循环 import。_loadFile 委托 parseBlobToEngineObject，_loadGroup 委托 createAtlas/createSpine；下列端口表示资源组/扩展名择一分派，依赖通过 source 复用 Res 入口。",
        "inputs": [
          {
            "name": "待解析",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "图集",
            "type": "Event"
          },
          {
            "name": "Spine",
            "type": "Event"
          },
          {
            "name": "预制体",
            "type": "Event"
          },
          {
            "name": "材质",
            "type": "Event"
          },
          {
            "name": "基础资源",
            "type": "Event"
          },
          {
            "name": "ani.controller",
            "type": "Event"
          }
        ]
      },
      "resAtlas": {
        "location": [
          710,
          -180
        ],
        "width": 260,
        "height": 160,
        "name": "resAtlas",
        "label": "图集 / createAtlas",
        "type": "流程",
        "desc": "png + atlas JSON 构造子纹理和 AtlasResource，保留缩放/帧偏移与 animation；交 Res 管理资源组缓存。读取、JSON或纹理加载失败回调 null，并释放临时 URL。",
        "inputs": [
          {
            "name": "图集",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "对象",
            "type": "Event"
          },
          {
            "name": "解析失败",
            "type": "Event"
          }
        ]
      },
      "resSpine": {
        "location": [
          1010,
          -180
        ],
        "width": 260,
        "height": 160,
        "name": "resSpine",
        "label": "Spine / createSpine",
        "type": "流程",
        "desc": "png + atlas + sk/skel/json 读取骨架与图集，组装 TextureAtlas、纹理并解析 SpineTemplet；已处理的读取/加载/解析失败回调 null，临时 URL 在对应分支释放，不宣称覆盖所有异常诊断。",
        "inputs": [
          {
            "name": "Spine",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "对象",
            "type": "Event"
          },
          {
            "name": "解析失败",
            "type": "Event"
          }
        ]
      },
      "resHierarchy": {
        "location": [
          1010,
          70
        ],
        "width": 260,
        "height": 160,
        "name": "resHierarchy",
        "label": "预制体 / 场景 .lh/.ls",
        "type": "流程",
        "desc": "_loadHierarchy 展开 prefab、兼容组件ID、原生解码并 create，补贴图与3D资源；内部引用经 source 读取。按现有策略重试组件ID形态，最终加载失败返回 null；局部依赖缺失可能告警降级，不承诺全量严格校验。",
        "inputs": [
          {
            "name": "预制体",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "对象",
            "type": "Event"
          },
          {
            "name": "解析失败",
            "type": "Event"
          }
        ]
      },
      "resMaterial": {
        "location": [
          1010,
          265
        ],
        "width": 260,
        "height": 160,
        "name": "resMaterial",
        "label": "材质 .lmat / 纹理绑定",
        "type": "Group",
        "desc": "_buildMaterial：材质类型、纹理路径与采样参数、setter/uniform分派、颜色与渲染状态。SkyPanoramic 的 u_Texture 必须经 panoramicTexture setter 绑定。",
        "use_custom_color": true,
        "color": [0.24, 0.62, 0.36],
        "node_tree_file": "nodes/rmaterial.js",
        "inputs": [
          {
            "name": "材质",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "对象",
            "type": "Event"
          },
          {
            "name": "解析失败",
            "type": "Event"
          }
        ]
      },
      "resBasic": {
        "location": [
          710,
          460
        ],
        "width": 260,
        "height": 170,
        "name": "resBasic",
        "label": "纹理 / 网格 / Clip / 音频",
        "type": "流程",
        "desc": "parseBlobToEngineObject 处理图片、.lm、.lani及音频；Web/微信加载适配保留，二进制 Clip/网格按 ArrayBuffer 交引擎。音频返回URL或微信本地路径，未知类型返回 Blob；已捕获的读取/加载失败回调 null。",
        "inputs": [
          {
            "name": "基础资源",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "对象",
            "type": "Event"
          },
          {
            "name": "解析失败",
            "type": "Event"
          }
        ]
      },
      "r8": {
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
        "node_tree_file": "nodes/r8.js"
      },
      "resReturn": {
        "location": [
          1350,
          70
        ],
        "width": 270,
        "height": 180,
        "name": "resReturn",
        "label": "返回 / Res 对象缓存",
        "type": "流程",
        "desc": "缓存命中直接交回调用方，blob 请求返回原始数据；新解析成功的对象由 Res._loadFile/_loadGroup 写入 _cache，ResLoader 不接管统一缓存。控制器在 Clip 替换及 addDeps 完成后才返回；非空对象可能含现有降级结果，业务仍需按用途校验。",
        "inputs": [
          {
            "name": "缓存命中",
            "type": "Event"
          },
          {
            "name": "原始Blob",
            "type": "Event"
          },
          {
            "name": "对象",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "资源结果",
            "type": "Event"
          }
        ]
      },
      "resFail": {
        "location": [
          1350,
          320
        ],
        "width": 270,
        "height": 180,
        "name": "resFail",
        "label": "失败返回 / 不缓存",
        "type": "流程",
        "desc": "文件缺失或解析分支回调 null 时，不写成功对象缓存。controller 在已构造后的受保护步骤失败会 destroy 后抛出，外层 finish(null)；Res.get Promise 形式 reject，回调形式记录错误并传 null。保留现有日志粒度，不声称已有 layer/state 全量诊断。",
        "inputs": [
          {
            "name": "失败",
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
        "from_node": "__group_in__",
        "from_socket": "包可用",
        "from_socket_identifier": "包可用",
        "from_socket_type": "Event",
        "to_node": "resEntry",
        "to_socket": "包可用",
        "to_socket_identifier": "包可用",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "资源请求",
        "from_socket_identifier": "资源请求",
        "from_socket_type": "Event",
        "to_node": "resEntry",
        "to_socket": "资源请求",
        "to_socket_identifier": "资源请求",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resEntry",
        "from_socket": "缓存命中",
        "from_socket_identifier": "缓存命中",
        "from_socket_type": "Event",
        "to_node": "resReturn",
        "to_socket": "缓存命中",
        "to_socket_identifier": "缓存命中",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resEntry",
        "from_socket": "原始Blob",
        "from_socket_identifier": "原始Blob",
        "from_socket_type": "Event",
        "to_node": "resReturn",
        "to_socket": "原始Blob",
        "to_socket_identifier": "原始Blob",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resEntry",
        "from_socket": "读取失败",
        "from_socket_identifier": "读取失败",
        "from_socket_type": "Event",
        "to_node": "resFail",
        "to_socket": "失败",
        "to_socket_identifier": "失败",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resEntry",
        "from_socket": "待解析",
        "from_socket_identifier": "待解析",
        "from_socket_type": "Event",
        "to_node": "resDelegate",
        "to_socket": "待解析",
        "to_socket_identifier": "待解析",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resDelegate",
        "from_socket": "图集",
        "from_socket_identifier": "图集",
        "from_socket_type": "Event",
        "to_node": "resAtlas",
        "to_socket": "图集",
        "to_socket_identifier": "图集",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resDelegate",
        "from_socket": "Spine",
        "from_socket_identifier": "Spine",
        "from_socket_type": "Event",
        "to_node": "resSpine",
        "to_socket": "Spine",
        "to_socket_identifier": "Spine",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resDelegate",
        "from_socket": "预制体",
        "from_socket_identifier": "预制体",
        "from_socket_type": "Event",
        "to_node": "resHierarchy",
        "to_socket": "预制体",
        "to_socket_identifier": "预制体",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resDelegate",
        "from_socket": "材质",
        "from_socket_identifier": "材质",
        "from_socket_type": "Event",
        "to_node": "resMaterial",
        "to_socket": "材质",
        "to_socket_identifier": "材质",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resDelegate",
        "from_socket": "基础资源",
        "from_socket_identifier": "基础资源",
        "from_socket_type": "Event",
        "to_node": "resBasic",
        "to_socket": "基础资源",
        "to_socket_identifier": "基础资源",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resDelegate",
        "from_socket": "ani.controller",
        "from_socket_identifier": "ani.controller",
        "from_socket_type": "Event",
        "to_node": "r8",
        "to_socket": "ani.controller",
        "to_socket_identifier": "ani.controller",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resAtlas",
        "from_socket": "对象",
        "from_socket_identifier": "对象",
        "from_socket_type": "Event",
        "to_node": "resReturn",
        "to_socket": "对象",
        "to_socket_identifier": "对象",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resAtlas",
        "from_socket": "解析失败",
        "from_socket_identifier": "解析失败",
        "from_socket_type": "Event",
        "to_node": "resFail",
        "to_socket": "失败",
        "to_socket_identifier": "失败",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resSpine",
        "from_socket": "对象",
        "from_socket_identifier": "对象",
        "from_socket_type": "Event",
        "to_node": "resReturn",
        "to_socket": "对象",
        "to_socket_identifier": "对象",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resSpine",
        "from_socket": "解析失败",
        "from_socket_identifier": "解析失败",
        "from_socket_type": "Event",
        "to_node": "resFail",
        "to_socket": "失败",
        "to_socket_identifier": "失败",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resHierarchy",
        "from_socket": "对象",
        "from_socket_identifier": "对象",
        "from_socket_type": "Event",
        "to_node": "resReturn",
        "to_socket": "对象",
        "to_socket_identifier": "对象",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resHierarchy",
        "from_socket": "解析失败",
        "from_socket_identifier": "解析失败",
        "from_socket_type": "Event",
        "to_node": "resFail",
        "to_socket": "失败",
        "to_socket_identifier": "失败",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resMaterial",
        "from_socket": "对象",
        "from_socket_identifier": "对象",
        "from_socket_type": "Event",
        "to_node": "resReturn",
        "to_socket": "对象",
        "to_socket_identifier": "对象",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resMaterial",
        "from_socket": "解析失败",
        "from_socket_identifier": "解析失败",
        "from_socket_type": "Event",
        "to_node": "resFail",
        "to_socket": "失败",
        "to_socket_identifier": "失败",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resBasic",
        "from_socket": "对象",
        "from_socket_identifier": "对象",
        "from_socket_type": "Event",
        "to_node": "resReturn",
        "to_socket": "对象",
        "to_socket_identifier": "对象",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resBasic",
        "from_socket": "解析失败",
        "from_socket_identifier": "解析失败",
        "from_socket_type": "Event",
        "to_node": "resFail",
        "to_socket": "失败",
        "to_socket_identifier": "失败",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r8",
        "from_socket": "AnimatorController",
        "from_socket_identifier": "AnimatorController",
        "from_socket_type": "Event",
        "to_node": "resReturn",
        "to_socket": "对象",
        "to_socket_identifier": "对象",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r8",
        "from_socket": "解析失败",
        "from_socket_identifier": "解析失败",
        "from_socket_type": "Event",
        "to_node": "resFail",
        "to_socket": "失败",
        "to_socket_identifier": "失败",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resReturn",
        "from_socket": "资源结果",
        "from_socket_identifier": "资源结果",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "资源结果",
        "to_socket_identifier": "资源结果",
        "to_socket_type": "Event"
      },
      {
        "from_node": "resFail",
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
window.__LAST_DOC=window.__DOC_FILES["nodes/rparse.js"];
