window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/pcloud.reg.js"]={
  "location": [
    390,
    460
  ],
  "width": 260,
  "name": "c10",
  "label": "注册登录子流程",
  "type": "Group",
  "desc": "细化 init/verify/reg：本地读取 → 云端验证 → gone 清号重注册 → Worker /token 注册通道 → te reg 认领分号 → 落盘回调。",
  "inputs": [
    {
      "name": "用户记录",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "用户身份",
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
    "name": "注册登录子流程 子树",
    "nodes": {
      "g1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "g1",
        "label": "init 本地读取",
        "type": "数据",
        "desc": "Cloud.init 读 IDB cloud_user；有 userid+key 直接以 from=local 回调；并发 init 排队共用同一次读取/注册结果。",
        "inputs": [
          {
            "name": "用户记录",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "本地身份",
            "type": "Event"
          },
          {
            "name": "无本地",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "g2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "g2",
        "label": "verify 云端验证",
        "type": "流程",
        "desc": "te bag(gt=1) 强制走网络，teRetry 多实例容错(code 1/网络失败换实例重试)；成功同步 bag/dollar 并 seedGobe 联机 token；code 1/2 → gone。",
        "inputs": [
          {
            "name": "本地身份",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "验证成功",
            "type": "Event"
          },
          {
            "name": "gone",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "g3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "g3",
        "label": "gone 清号重注册",
        "type": "流程",
        "desc": "本地身份已失效(用户不存在/认证失败)，清 cloud_user 后重新注册，回调 from=reg。",
        "inputs": [
          {
            "name": "gone",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "无本地",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "g4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "g4",
        "label": "注册通道 Worker /token",
        "type": "流程",
        "desc": "唯一注册入口 POST /token {reg:true}；Worker 先做 IP 风控(日配额 5 次，超出 code 7『注册过于频繁』)；成功下发 AGC token + key/user/gobe。",
        "inputs": [
          {
            "name": "无本地",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "te reg",
            "type": "Event"
          },
          {
            "name": "失败/限流",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "g5": {
        "location": [
          1030,
          265
        ],
        "width": 240,
        "name": "g5",
        "label": "te reg 认领分号",
        "type": "流程",
        "desc": "_seq 顺序取号 → 查存在 → 写行带认领令牌 → 回读认领(16 次撞号预算)；key=code.key(userid) 确定性；新行全字段补默认值，防非空字段致 upsert 失败。",
        "inputs": [
          {
            "name": "te reg",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "注册成功",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "g6": {
        "location": [
          710,
          265
        ],
        "width": 240,
        "name": "g6",
        "label": "失败与提示",
        "type": "数据",
        "desc": "7 注册过频(明日再试)/8 用户过频/10 IP 限流，带 retryAfter 必须退避；5/11 上游异常与网络失败给 lastMsg 兜底文案；注册不自动重试，防响应丢失重复建号。",
        "inputs": [
          {
            "name": "失败/限流",
            "type": "Event"
          }
        ],
        "outputs": [{"name": "失败现场", "type": "Event"}],
        "height": 133
      },
      "g8": {
        "location": [70, 480],
        "width": 280,
        "name": "g8",
        "label": "注册失败修复 · 先策划后执行",
        "type": "Group",
        "desc": "2026-11-12 已按策划完成本地复现与修复：注册落库后附加审计/GOBE并发等待最多1500ms，缺userid提示补全；浏览器12项模拟检查与IDE构建通过。线上根因、部署与真实注册验证仍待完成；不取消限流、不清真实账号、不自动重复注册。",
        "inputs": [{"name": "失败现场", "type": "Event"}],
        "outputs": [{"name": "验证结论", "type": "Event"}],
        "height": 180,
        "node_tree": {
          "name": "注册失败排查与交付",
          "nodes": {
            "plan": {
              "location": [70, 70], "width": 280, "height": 180,
              "name": "plan", "label": "策划：条件 / 动作 / 验收", "type": "规则",
              "desc": "规则表：有效本地 userid+key→复用并验证；无本地身份→仅一次/token注册；7/8/10→按retryAfter退避；5/11或网络失败→保留阶段和原因，禁止盲重试；用户已提交→附加token/审计失败不得改报注册失败；成功→本地持久化且所有等待回调完成。验收包含成功、失败、并发调用、登录读取与错误提示。",
              "inputs": [{"name": "失败现场", "type": "Event"}],
              "outputs": [{"name": "排查规格", "type": "Event"}]
            },
            "evidence": {
              "location": [410, 70], "width": 280, "height": 180,
              "name": "evidence", "label": "执行 1：采集失败证据", "type": "待办",
              "desc": "读取已登录浏览器现有请求与控制台日志，记录HTTP状态、code/msg/v/wv及请求阶段（不记录key/token）。核对agcRegister、Worker/token、user.js reg、db.js与线上函数版本/对象字段。优先只读，不新增真实账号、不触碰限流设置。",
              "inputs": [{"name": "排查规格", "type": "Event"}],
              "outputs": [{"name": "根因证据", "type": "Event"}]
            },
            "fix": {
              "location": [750, 70], "width": 280, "height": 180,
              "name": "fix", "label": "执行 2：最小修复", "type": "待办",
              "desc": "2026-11-12 离线已复现：账号和_seq写入后，审计或GOBE promise不结束会令注册无响应；微信请求15秒超时。修复范围：两种reg分支共用附加服务等待，审计/GOBE并发且总预算1500ms，超时保留已取得GOBE并返回已提交身份；不改变数据库失败/认领规则/限流，不自动重试注册。客户端缺userid补明确提示，日志不输出完整含凭据响应。线上同因未证实，部署/真实注册未执行。",
              "inputs": [{"name": "根因证据", "type": "Event"}],
              "outputs": [{"name": "修复产物", "type": "Event"}]
            },
            "verify": {
              "location": [1090, 70], "width": 280, "height": 180,
              "name": "verify", "label": "执行 3：回归与工作流回填", "type": "待办",
              "desc": "本地模拟成功、存储失败、token失败、缺失userid、并发注册、限流、网络异常；客户端编译并在浏览器验证回调/提示/本地复用。线上交付另核对部署版本和受控注册→登录验证，写明已验证项与未完成项。",
              "inputs": [{"name": "修复产物", "type": "Event"}],
              "outputs": [{"name": "验证结论", "type": "Event"}]
            }
          },
          "links": [
            {"from_node":"__group_in__","from_socket":"失败现场","from_socket_identifier":"失败现场","from_socket_type":"Event","to_node":"plan","to_socket":"失败现场","to_socket_identifier":"失败现场","to_socket_type":"Event"},
            {"from_node":"plan","from_socket":"排查规格","from_socket_identifier":"排查规格","from_socket_type":"Event","to_node":"evidence","to_socket":"排查规格","to_socket_identifier":"排查规格","to_socket_type":"Event"},
            {"from_node":"evidence","from_socket":"根因证据","from_socket_identifier":"根因证据","from_socket_type":"Event","to_node":"fix","to_socket":"根因证据","to_socket_identifier":"根因证据","to_socket_type":"Event"},
            {"from_node":"fix","from_socket":"修复产物","from_socket_identifier":"修复产物","from_socket_type":"Event","to_node":"verify","to_socket":"修复产物","to_socket_identifier":"修复产物","to_socket_type":"Event"},
            {"from_node":"verify","from_socket":"验证结论","from_socket_identifier":"验证结论","from_socket_type":"Event","to_node":"__group_out__","to_socket":"验证结论","to_socket_identifier":"验证结论","to_socket_type":"Event"}
          ]
        }
      },
      "g7": {
        "location": [
          390,
          265
        ],
        "width": 240,
        "name": "g7",
        "label": "落盘与回调",
        "type": "流程",
        "desc": "Cloud.save 写 IDB → finishInit(from=local|reg) 通知所有等待方 → 资料就绪；注册响应顺带 seedGobe，选局页直接 Gnet.init。",
        "inputs": [
          {
            "name": "验证成功",
            "type": "Event"
          },
          {
            "name": "注册成功",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "用户身份",
            "type": "Event"
          }
        ],
        "height": 133
      }
    },
    "links": [
      {"from_node":"g6","from_socket":"失败现场","from_socket_identifier":"失败现场","from_socket_type":"Event","to_node":"g8","to_socket":"失败现场","to_socket_identifier":"失败现场","to_socket_type":"Event"},
      {
        "from_node": "__group_in__",
        "from_socket": "用户记录",
        "from_socket_identifier": "用户记录",
        "from_socket_type": "Event",
        "to_node": "g1",
        "to_socket": "用户记录",
        "to_socket_identifier": "用户记录",
        "to_socket_type": "Event"
      },
      {
        "from_node": "g1",
        "from_socket": "本地身份",
        "from_socket_identifier": "本地身份",
        "from_socket_type": "Event",
        "to_node": "g2",
        "to_socket": "本地身份",
        "to_socket_identifier": "本地身份",
        "to_socket_type": "Event"
      },
      {
        "from_node": "g1",
        "from_socket": "无本地",
        "from_socket_identifier": "无本地",
        "from_socket_type": "Event",
        "to_node": "g4",
        "to_socket": "无本地",
        "to_socket_identifier": "无本地",
        "to_socket_type": "Event"
      },
      {
        "from_node": "g2",
        "from_socket": "验证成功",
        "from_socket_identifier": "验证成功",
        "from_socket_type": "Event",
        "to_node": "g7",
        "to_socket": "验证成功",
        "to_socket_identifier": "验证成功",
        "to_socket_type": "Event"
      },
      {
        "from_node": "g2",
        "from_socket": "gone",
        "from_socket_identifier": "gone",
        "from_socket_type": "Event",
        "to_node": "g3",
        "to_socket": "gone",
        "to_socket_identifier": "gone",
        "to_socket_type": "Event"
      },
      {
        "from_node": "g3",
        "from_socket": "无本地",
        "from_socket_identifier": "无本地",
        "from_socket_type": "Event",
        "to_node": "g4",
        "to_socket": "无本地",
        "to_socket_identifier": "无本地",
        "to_socket_type": "Event"
      },
      {
        "from_node": "g4",
        "from_socket": "te reg",
        "from_socket_identifier": "te reg",
        "from_socket_type": "Event",
        "to_node": "g5",
        "to_socket": "te reg",
        "to_socket_identifier": "te reg",
        "to_socket_type": "Event"
      },
      {
        "from_node": "g4",
        "from_socket": "失败/限流",
        "from_socket_identifier": "失败/限流",
        "from_socket_type": "Event",
        "to_node": "g6",
        "to_socket": "失败/限流",
        "to_socket_identifier": "失败/限流",
        "to_socket_type": "Event"
      },
      {
        "from_node": "g5",
        "from_socket": "注册成功",
        "from_socket_identifier": "注册成功",
        "from_socket_type": "Event",
        "to_node": "g7",
        "to_socket": "注册成功",
        "to_socket_identifier": "注册成功",
        "to_socket_type": "Event"
      },
      {
        "from_node": "g7",
        "from_socket": "用户身份",
        "from_socket_identifier": "用户身份",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "用户身份",
        "to_socket_identifier": "用户身份",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/pcloud.reg.js"];
