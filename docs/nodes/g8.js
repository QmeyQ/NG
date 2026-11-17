window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/g8.js"]={
  "location": [
    70,
    480
  ],
  "width": 280,
  "name": "g8",
  "label": "注册失败修复 · 先策划后执行",
  "type": "Group",
  "desc": "2026-11-12 已按策划完成本地复现与修复：注册落库后附加审计/GOBE并发等待最多1500ms，缺userid提示补全；浏览器12项模拟检查与IDE构建通过。线上根因、部署与真实注册验证仍待完成；不取消限流、不清真实账号、不自动重复注册。",
  "inputs": [
    {
      "name": "失败现场",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "验证结论",
      "type": "Event"
    }
  ],
  "height": 180,
  "node_tree": {
    "name": "注册失败排查与交付",
    "nodes": {
      "plan": {
        "location": [
          70,
          70
        ],
        "width": 280,
        "height": 180,
        "name": "plan",
        "label": "策划：条件 / 动作 / 验收",
        "type": "规则",
        "desc": "规则表：有效本地 userid+key→复用并验证；无本地身份→仅一次/token注册；7/8/10→按retryAfter退避；5/11或网络失败→保留阶段和原因，禁止盲重试；用户已提交→附加token/审计失败不得改报注册失败；成功→本地持久化且所有等待回调完成。验收包含成功、失败、并发调用、登录读取与错误提示。",
        "inputs": [
          {
            "name": "失败现场",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "排查规格",
            "type": "Event"
          }
        ]
      },
      "evidence": {
        "location": [
          410,
          70
        ],
        "width": 280,
        "height": 180,
        "name": "evidence",
        "label": "执行 1：采集失败证据",
        "type": "待办",
        "desc": "读取已登录浏览器现有请求与控制台日志，记录HTTP状态、code/msg/v/wv及请求阶段（不记录key/token）。核对agcRegister、Worker/token、user.js reg、db.js与线上函数版本/对象字段。优先只读，不新增真实账号、不触碰限流设置。",
        "inputs": [
          {
            "name": "排查规格",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "根因证据",
            "type": "Event"
          }
        ]
      },
      "fix": {
        "location": [
          750,
          70
        ],
        "width": 280,
        "height": 180,
        "name": "fix",
        "label": "执行 2：最小修复",
        "type": "待办",
        "desc": "2026-11-12 离线已复现：账号和_seq写入后，审计或GOBE promise不结束会令注册无响应；微信请求15秒超时。修复范围：两种reg分支共用附加服务等待，审计/GOBE并发且总预算1500ms，超时保留已取得GOBE并返回已提交身份；不改变数据库失败/认领规则/限流，不自动重试注册。客户端缺userid补明确提示，日志不输出完整含凭据响应。线上同因未证实，部署/真实注册未执行。",
        "inputs": [
          {
            "name": "根因证据",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "修复产物",
            "type": "Event"
          }
        ]
      },
      "verify": {
        "location": [
          1090,
          70
        ],
        "width": 280,
        "height": 180,
        "name": "verify",
        "label": "执行 3：回归与工作流回填",
        "type": "待办",
        "desc": "本地模拟成功、存储失败、token失败、缺失userid、并发注册、限流、网络异常；客户端编译并在浏览器验证回调/提示/本地复用。线上交付另核对部署版本和受控注册→登录验证，写明已验证项与未完成项。",
        "inputs": [
          {
            "name": "修复产物",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "验证结论",
            "type": "Event"
          }
        ]
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "失败现场",
        "from_socket_identifier": "失败现场",
        "from_socket_type": "Event",
        "to_node": "plan",
        "to_socket": "失败现场",
        "to_socket_identifier": "失败现场",
        "to_socket_type": "Event"
      },
      {
        "from_node": "plan",
        "from_socket": "排查规格",
        "from_socket_identifier": "排查规格",
        "from_socket_type": "Event",
        "to_node": "evidence",
        "to_socket": "排查规格",
        "to_socket_identifier": "排查规格",
        "to_socket_type": "Event"
      },
      {
        "from_node": "evidence",
        "from_socket": "根因证据",
        "from_socket_identifier": "根因证据",
        "from_socket_type": "Event",
        "to_node": "fix",
        "to_socket": "根因证据",
        "to_socket_identifier": "根因证据",
        "to_socket_type": "Event"
      },
      {
        "from_node": "fix",
        "from_socket": "修复产物",
        "from_socket_identifier": "修复产物",
        "from_socket_type": "Event",
        "to_node": "verify",
        "to_socket": "修复产物",
        "to_socket_identifier": "修复产物",
        "to_socket_type": "Event"
      },
      {
        "from_node": "verify",
        "from_socket": "验证结论",
        "from_socket_identifier": "验证结论",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "验证结论",
        "to_socket_identifier": "验证结论",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/g8.js"];
