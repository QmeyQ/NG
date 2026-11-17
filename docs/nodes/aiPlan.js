window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/aiPlan.js"]={
  "location": [
    -600,
    -4.19
  ],
  "width": 270,
  "height": 180,
  "name": "aiPlan",
  "label": "先策划 / 细化（执行前置）",
  "type": "Group",
  "desc": "任何执行与返工先回到工作流：需求 → 条件动作 → 实现方案 → 验收策划。策划落图后才交给 ai1 执行；保留已有变更、布局与 unused 历史。",
  "inputs": [
    {
      "name": "开发指令",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "策划完成",
      "type": "Event"
    }
  ],
  "use_custom_color": true,
  "color": [
    0.6,
    0.4,
    0.9
  ],
  "node_tree": {
    "name": "执行前策划与细化 子树",
    "nodes": {
      "planNeed": {
        "location": [
          70,
          70
        ],
        "width": 270,
        "height": 180,
        "name": "planNeed",
        "label": "需求与修改边界",
        "type": "规则",
        "desc": "先读当前文件和未提交变更，明确目标、非目标、允许修改文件和线上操作边界；按模块划分资源加载与账号注册等子任务，不覆盖已有工作，不把 unused 历史快照同步为当前行为。",
        "inputs": [
          {
            "name": "开发指令",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "需求边界",
            "type": "Event"
          }
        ]
      },
      "planAction": {
        "location": [
          400,
          70
        ],
        "width": 270,
        "height": 180,
        "name": "planAction",
        "label": "条件 → 动作 / 失败分支",
        "type": "流程",
        "desc": "细化入口、数据、条件、动作和结果端口。本次：缓存命中直接返回；未命中委托独立 ResLoader 按类型解析；controller 原生解析后并发加载 Clip；失败销毁 controller 并返回 null，不当作成功。",
        "inputs": [
          {
            "name": "需求边界",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "条件动作",
            "type": "Event"
          }
        ]
      },
      "planDesign": {
        "location": [
          730,
          70
        ],
        "width": 270,
        "height": 180,
        "name": "planDesign",
        "label": "模块方案与连线细化",
        "type": "流程",
        "desc": "先定 Group + node_tree/node_tree_file 分层再执行。本次在 pres 新增资源解析 Group，明确 Res 的下载/包索引/路径/缓存边界与 ResLoader 的解析职责；接入 r8 控制器分支，同步 index 摘要，保留原节点坐标和历史快照。",
        "inputs": [
          {
            "name": "条件动作",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "实现方案",
            "type": "Event"
          }
        ]
      },
      "planAccept": {
        "location": [
          1060,
          70
        ],
        "width": 270,
        "height": 180,
        "name": "planAccept",
        "label": "验收与证据策划",
        "type": "检查",
        "desc": "执行后依次编译 → 浏览器验证 → 回填实际证据；不得把待办写成完成。本次文档用 vm 校验语法、分层引用和连线端口；沿用前一步真实引擎45项通过、IDE日志Success（工具等待超时）、tsc仅card.ts:80/82原有参数错误，不冒称重跑或实现全量诊断/严格重复ID校验。",
        "inputs": [
          {
            "name": "实现方案",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "策划完成",
            "type": "Event"
          }
        ]
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "开发指令",
        "from_socket_identifier": "开发指令",
        "from_socket_type": "Event",
        "to_node": "planNeed",
        "to_socket": "开发指令",
        "to_socket_identifier": "开发指令",
        "to_socket_type": "Event"
      },
      {
        "from_node": "planNeed",
        "from_socket": "需求边界",
        "from_socket_identifier": "需求边界",
        "from_socket_type": "Event",
        "to_node": "planAction",
        "to_socket": "需求边界",
        "to_socket_identifier": "需求边界",
        "to_socket_type": "Event"
      },
      {
        "from_node": "planAction",
        "from_socket": "条件动作",
        "from_socket_identifier": "条件动作",
        "from_socket_type": "Event",
        "to_node": "planDesign",
        "to_socket": "条件动作",
        "to_socket_identifier": "条件动作",
        "to_socket_type": "Event"
      },
      {
        "from_node": "planDesign",
        "from_socket": "实现方案",
        "from_socket_identifier": "实现方案",
        "from_socket_type": "Event",
        "to_node": "planAccept",
        "to_socket": "实现方案",
        "to_socket_identifier": "实现方案",
        "to_socket_type": "Event"
      },
      {
        "from_node": "planAccept",
        "from_socket": "策划完成",
        "from_socket_identifier": "策划完成",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "策划完成",
        "to_socket_identifier": "策划完成",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/aiPlan.js"];
