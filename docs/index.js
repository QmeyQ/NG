window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["index.js"]={
  "name": "项目规划",
  "tree_type": "ProjectTree",
  "export_name": "NG-项目规划",
  "nodes": {
    "pstart": {
      "location": [
        -280.4,
        -21.07
      ],
      "width": 240,
      "name": "pstart",
      "label": "启动与隐私",
      "type": "Group",
      "desc": "index.ts 启动链：启动页 → 隐私协议 → 资源版本检查 → 下载/恢复 → 进入主菜单。",
      "inputs": [
        {
          "name": "平台启动",
          "type": "Event"
        }
      ],
      "outputs": [
        {
          "name": "主菜单就绪",
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
      "node_tree_file": "nodes/pstart.js"
    },
    "pmenu": {
      "location": [
        41.59,
        -17.02
      ],
      "width": 240,
      "name": "pmenu",
      "label": "主菜单",
      "type": "Group",
      "desc": "menu.ls 预制体：item0~4 五页（首页/商店/社交/我的/设置），Controller c0 切页；负责玩法入口分发。",
      "inputs": [
        {
          "name": "主菜单就绪",
          "type": "Event"
        }
      ],
      "outputs": [
        {
          "name": "游戏大厅",
          "type": "Event"
        },
        {
          "name": "社交入口",
          "type": "Event"
        },
        {
          "name": "其他游戏",
          "type": "Event"
        },
        {
          "name": "版本检查",
          "type": "Any"
        }
      ],
      "use_custom_color": true,
      "color": [
        0.16,
        0.62,
        0.78
      ],
      "height": 220,
      "node_tree_file": "nodes/pmenu.js"
    },
    "pselect": {
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
      "node_tree_file": "nodes/pselect.js"
    },
    "pmatch": {
      "location": [
        441.79,
        676.52
      ],
      "width": 240,
      "name": "pmatch",
      "label": "匹配与加载",
      "type": "Group",
      "desc": "load.ts：恢复会话 → Gnet 初始化 → 随机匹配 → role_assign 协商 → 跳 game/badm.ls；PVE 走 pve/pve2 直进。",
      "inputs": [
        {
          "name": "匹配页打开",
          "type": "Event"
        },
        {
          "name": "平台身份",
          "type": "Event"
        },
        {
          "name": "对局结果",
          "type": "Event"
        }
      ],
      "outputs": [
        {
          "name": "进入比赛",
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
      "node_tree_file": "nodes/pmatch.js"
    },
    "pcloud": {
      "location": [
        -562.69,
        289.09
      ],
      "width": 240,
      "name": "pcloud",
      "label": "账号与云服务",
      "type": "Group",
      "desc": "Cloud 用户体系 + 云函数 + AGC/GOBE token。本地乐观更新、云端权威覆盖，失败不阻塞主流程。",
      "inputs": [
        {
          "name": "平台身份",
          "type": "Event"
        },
        {
          "name": "云端返回",
          "type": "Event"
        }
      ],
      "outputs": [
        {
          "name": "用户身份",
          "type": "Event"
        },
        {
          "name": "GOBE token",
          "type": "Event"
        },
        {
          "name": "云端请求",
          "type": "Event"
        }
      ],
      "use_custom_color": true,
      "color": [
        0.85,
        0.55,
        0.2
      ],
      "group_output_location": [
        1330.28,
        319.13
      ],
      "height": 198,
      "node_tree_file": "nodes/pcloud.js"
    },
    "psocial": {
      "location": [
        433.83,
        198.23
      ],
      "width": 240,
      "name": "psocial",
      "label": "社交模块",
      "type": "Group",
      "desc": "已实施(本地验证, 已上传生产并冒烟9/9): 好友(身价0-500默认1)/群聊/私聊转交(服务端不存会话, 送达ack删除)/屏蔽词红字/排行/分享; UI 全预制体(menu.ls item2 嵌套Panel+微信式对话列表+右上\"+\"; item3 左列表右panel 背包表格/战绩单列/本地对局详情+玩家加号)。数据落 NG 既有字段; 对局详情仅本地 IDB。",
      "inputs": [
        {
          "name": "社交入口",
          "type": "Event"
        }
      ],
      "outputs": [
        {
          "name": "社交就绪",
          "type": "Event"
        }
      ],
      "use_custom_color": true,
      "color": [
        0.48,
        0.38,
        0.75
      ],
      "height": 154,
      "node_tree_file": "nodes/psocial.js"
    },
    "pgame": {
      "location": [
        431.85,
        10.96
      ],
      "width": 240,
      "name": "pgame",
      "label": "其他小游戏（规划）",
      "type": "Group",
      "desc": "游戏列表里只有 index 0（羽毛球）可进入；其余条目点击统一 toast 未开放，无任何场景与资源包。",
      "inputs": [
        {
          "name": "其他游戏",
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
      "node_tree_file": "nodes/pgame.js"
    },
    "pres": {
      "location": [
        51.5,
        247.37
      ],
      "width": 240,
      "name": "pres",
      "label": "资源与存储",
      "type": "Group",
      "desc": "nor / ui / game 分包；Res负责下载、包索引、缓存与公共入口，ResLoader经source注入按需解析。分层展开真实DP/XP+ProgPID、原生AnimatorController、材质setter纹理绑定与动态天空验收；区分包就绪、对象返回和实际显示，记录已验证结果与未发布/待验证边界。",
      "inputs": [
        {
          "name": "版本清单",
          "type": "Event"
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
      "node_tree_file": "nodes/pres.js"
    },
    "pplat": {
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
      "node_tree_file": "nodes/pplat.js"
    },
    "bmb": {
      "location": [
        443.1,
        920.94
      ],
      "width": 240,
      "name": "bmb",
      "label": "羽毛球游戏",
      "type": "Group",
      "desc": "首个已上线的完整玩法。结构：入口装配、Mag(对象/生命周期)、Rule(状态机/判罚)、PVP/PVE(网络/对手)、物理、碰撞、对象、输入、AI、UI 与已知问题。Mag/Rule 以 MatchState + RuleHost 解耦。",
      "inputs": [
        {
          "name": "进入比赛",
          "type": "Event"
        }
      ],
      "outputs": [
        {
          "name": "对局结果",
          "type": "Event"
        }
      ],
      "use_custom_color": true,
      "color": [
        0.25,
        0.51,
        0.96
      ],
      "group_input_location": [
        -1032.15,
        -486.82
      ],
      "group_output_location": [
        1343.15,
        -180.84
      ],
      "height": 154,
      "node_tree_file": "nodes/bmb.js"
    },
    "srv": {
      "location": [
        -563.5,
        555.76
      ],
      "width": 240,
      "name": "srv",
      "label": "服务端后端",
      "type": "Group",
      "desc": "Cloudflare Worker(www.normalgame.cn) 网关 + 自实现 AGC 代理 SDK + IP/历史风控(历史改用户行 history 点查); AGC 云函数 te/user.js(用户体系/发号/商店/社交) 与 gobe.js、shield.js(行内审计纯函数)、db.js→CloudDB(NG/User, dbUpsert 直写); 独立管理后台 mag/magh(增 clean 清遗留审计行)。最小写入契约: 每请求单记录一查一写, 审计随业务同写。",
      "inputs": [
        {
          "name": "云端请求",
          "type": "Event"
        },
        {
          "name": "管理入口",
          "type": "Event"
        }
      ],
      "outputs": [
        {
          "name": "账号资料",
          "type": "Event"
        },
        {
          "name": "GOBE 凭据",
          "type": "Event"
        },
        {
          "name": "社交数据",
          "type": "Event"
        }
      ],
      "use_custom_color": true,
      "color": [
        0.85,
        0.55,
        0.2
      ],
      "group_output_location": [
        1330,
        760
      ],
      "height": 176,
      "node_tree_file": "nodes/srv.js"
    },
    "aidev": {
      "location": [
        -905.31,
        159.74
      ],
      "width": 240,
      "name": "aidev",
      "label": "AI 开发辅助",
      "type": "Group",
      "desc": "AI 开发闭环：先在工作流策划/细化（需求、条件动作、方案、验收）→ 执行 → IDE 编译 → 浏览器验证 → 回填工作流。IDE 内置 AI 调度浏览器自动化与 Laya MCP，不接入网页 AI；失败先更新策划再迭代。部署/发布仅在明确授权且验收通过后执行；本地验证与线上交付分别记录。",
      "inputs": [
        {
          "name": "开发指令",
          "type": "Event"
        }
      ],
      "outputs": [
        {
          "name": "编译运行",
          "type": "Event"
        },
        {
          "name": "服务端部署",
          "type": "Event"
        },
        {
          "name": "上线",
          "type": "Event"
        }
      ],
      "use_custom_color": true,
      "color": [
        0.6,
        0.4,
        0.9
      ],
      "group_output_location": [
        1446.8,
        258.65
      ],
      "height": 198,
      "node_tree_file": "nodes/aidev.js"
    },
    "aihandover": {
      "location": [
        -905,
        400
      ],
      "width": 260,
      "name": "aihandover",
      "label": "AI 接管手册(全流程)",
      "type": "Group",
      "desc": "新 AI 接管本项目的完整步骤: 环境/端口→构建/类型→离线测试→收集打包→浏览器自动化验证→华为云上传→te 云函数部署→CF Worker 部署→通讯自检→坑与取舍→接管清单。所有命令/端口/profile/坑均写明, 按 h1→h11 顺序执行即可接管。",
      "inputs": [
        {
          "name": "接管",
          "type": "Event"
        }
      ],
      "outputs": [],
      "use_custom_color": true,
      "color": [
        0.2,
        0.6,
        0.6
      ],
      "height": 160,
      "node_tree_file": "nodes/aihandover.js"
    }
  },
  "links": [
    {
      "from_node": "pstart",
      "from_socket": "主菜单就绪",
      "from_socket_identifier": "主菜单就绪",
      "from_socket_type": "Event",
      "to_node": "pmenu",
      "to_socket": "主菜单就绪",
      "to_socket_identifier": "主菜单就绪",
      "to_socket_type": "Event"
    },
    {
      "from_node": "pmenu",
      "from_socket": "游戏大厅",
      "from_socket_identifier": "游戏大厅",
      "from_socket_type": "Event",
      "to_node": "pselect",
      "to_socket": "游戏大厅",
      "to_socket_identifier": "游戏大厅",
      "to_socket_type": "Event"
    },
    {
      "from_node": "pmenu",
      "from_socket": "社交入口",
      "from_socket_identifier": "社交入口",
      "from_socket_type": "Event",
      "to_node": "psocial",
      "to_socket": "社交入口",
      "to_socket_identifier": "社交入口",
      "to_socket_type": "Event"
    },
    {
      "from_node": "pmenu",
      "from_socket": "其他游戏",
      "from_socket_identifier": "其他游戏",
      "from_socket_type": "Event",
      "to_node": "pgame",
      "to_socket": "其他游戏",
      "to_socket_identifier": "其他游戏",
      "to_socket_type": "Event"
    },
    {
      "from_node": "pcloud",
      "from_socket": "用户身份",
      "from_socket_identifier": "用户身份",
      "from_socket_type": "Event",
      "to_node": "pselect",
      "to_socket": "用户身份",
      "to_socket_identifier": "用户身份",
      "to_socket_type": "Event"
    },
    {
      "from_node": "pselect",
      "from_socket": "匹配页打开",
      "from_socket_identifier": "匹配页打开",
      "from_socket_type": "Event",
      "to_node": "pmatch",
      "to_socket": "匹配页打开",
      "to_socket_identifier": "匹配页打开",
      "to_socket_type": "Event"
    },
    {
      "from_node": "pcloud",
      "from_socket": "GOBE token",
      "from_socket_identifier": "GOBE token",
      "from_socket_type": "Event",
      "to_node": "pmatch",
      "to_socket": "平台身份",
      "to_socket_identifier": "平台身份",
      "to_socket_type": "Event"
    },
    {
      "from_node": "pres",
      "from_socket": "资源就绪",
      "from_socket_identifier": "资源就绪",
      "from_socket_type": "Event",
      "to_node": "pselect",
      "to_socket": "资源就绪",
      "to_socket_identifier": "资源就绪",
      "to_socket_type": "Event"
    },
    {
      "from_node": "pplat",
      "from_socket": "平台能力",
      "from_socket_identifier": "平台能力",
      "from_socket_type": "Event",
      "to_node": "pstart",
      "to_socket": "平台启动",
      "to_socket_identifier": "平台启动",
      "to_socket_type": "Event"
    },
    {
      "from_node": "pmatch",
      "from_socket": "进入比赛",
      "from_socket_identifier": "进入比赛",
      "from_socket_type": "Event",
      "to_node": "bmb",
      "to_socket": "进入比赛",
      "to_socket_identifier": "进入比赛",
      "to_socket_type": "Event"
    },
    {
      "from_node": "bmb",
      "from_socket": "对局结果",
      "from_socket_identifier": "对局结果",
      "from_socket_type": "Event",
      "to_node": "pmatch",
      "to_socket": "对局结果",
      "to_socket_identifier": "对局结果",
      "to_socket_type": "Event"
    },
    {
      "from_node": "pcloud",
      "from_socket": "云端请求",
      "from_socket_identifier": "云端请求",
      "from_socket_type": "Event",
      "to_node": "srv",
      "to_socket": "云端请求",
      "to_socket_identifier": "云端请求",
      "to_socket_type": "Event"
    },
    {
      "from_node": "srv",
      "from_socket": "账号资料",
      "from_socket_identifier": "账号资料",
      "from_socket_type": "Event",
      "to_node": "pcloud",
      "to_socket": "云端返回",
      "to_socket_identifier": "云端返回",
      "to_socket_type": "Event"
    },
    {
      "from_node": "srv",
      "from_socket": "GOBE 凭据",
      "from_socket_identifier": "GOBE 凭据",
      "from_socket_type": "Event",
      "to_node": "pcloud",
      "to_socket": "云端返回",
      "to_socket_identifier": "云端返回",
      "to_socket_type": "Event"
    },
    {
      "from_node": "aidev",
      "from_socket": "服务端部署",
      "from_socket_identifier": "服务端部署",
      "from_socket_type": "Event",
      "to_node": "srv",
      "to_socket": "管理入口",
      "to_socket_identifier": "管理入口",
      "to_socket_type": "Event"
    },
    {
      "from_node": "aidev",
      "from_socket": "编译运行",
      "from_socket_type": "Event",
      "from_socket_identifier": "编译运行",
      "to_node": "pplat",
      "to_socket": "启动",
      "to_socket_type": "Any",
      "to_socket_identifier": "启动"
    },
    {
      "from_node": "pmenu",
      "from_socket": "版本检查",
      "from_socket_type": "Any",
      "from_socket_identifier": "版本检查",
      "to_node": "pres",
      "to_socket": "版本清单",
      "to_socket_type": "Event",
      "to_socket_identifier": "版本清单"
    }
  ],
  "unused": [
    {
      "location": [
        559.87,
        -152.09
      ],
      "width": 240,
      "name": "pres.001",
      "label": "资源与存储",
      "type": "Group",
      "desc": "nor / ui / game 三级分包，版本比对、下载解压、进度预测与本地缓存（Web IndexedDB / 微信 kv+file）。",
      "inputs": [
        {
          "name": "版本清单",
          "type": "Event"
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
      "node_tree": {
        "name": "资源与存储 子树",
        "nodes": {
          "r1": {
            "location": [
              70,
              70
            ],
            "width": 240,
            "name": "r1",
            "label": "分包结构",
            "type": "数据",
            "desc": "nor（含 nor/match/match.ls）/ ui / game（game/badm.ls）；对应 manifest 与 res.json。",
            "inputs": [
              {
                "name": "版本清单",
                "type": "Event"
              }
            ],
            "outputs": [
              {
                "name": "包索引",
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
            "label": "版本检查 Res.vers",
            "type": "流程",
            "desc": "返回 {needUpdate,size}；会话级 markVerified 避免重复检查。",
            "inputs": [
              {
                "name": "包索引",
                "type": "Event"
              }
            ],
            "outputs": [
              {
                "name": "待下载",
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
            "label": "下载与解压 Res.url",
            "type": "流程",
            "desc": "按需下载并解压；DP 事件给 url/percent/speed，XP 事件给解压进度。",
            "inputs": [
              {
                "name": "待下载",
                "type": "Event"
              }
            ],
            "outputs": [
              {
                "name": "包就绪",
                "type": "Event"
              }
            ],
            "height": 133
          },
          "r4": {
            "location": [
              1030,
              70
            ],
            "width": 240,
            "name": "r4",
            "label": "进度预测",
            "type": "流程",
            "desc": "MT.ProgModel 渐近模型 + 呼吸条，弱网下让进度条不倒退。",
            "inputs": [
              {
                "name": "包就绪",
                "type": "Event"
              }
            ],
            "outputs": [],
            "height": 133
          },
          "r5": {
            "location": [
              70,
              265
            ],
            "width": 240,
            "name": "r5",
            "label": "缓存写入",
            "type": "流程",
            "desc": "Web: IndexedDB 双 store（数据 + 文件）；微信: wxKv* 与 wxFile*。",
            "inputs": [
              {
                "name": "包就绪",
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
          },
          "r6": {
            "location": [
              390,
              265
            ],
            "width": 240,
            "name": "r6",
            "label": "热更新入口",
            "type": "流程",
            "desc": "后台发现 nor 新版本时提示『发现游戏资源新版本』，更新后不跳转、仅 toast。",
            "inputs": [
              {
                "name": "包索引",
                "type": "Event"
              }
            ],
            "outputs": [],
            "height": 133
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
                  "height": 100
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
                  "height": 100
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
                  "height": 100
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
                  "height": 100
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
                  "height": 100
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
                  "height": 100
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
                  "height": 100
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
                  "height": 100
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
          }
        },
        "links": [
          {
            "from_node": "__group_in__",
            "from_socket": "版本清单",
            "from_socket_identifier": "版本清单",
            "from_socket_type": "Event",
            "to_node": "r1",
            "to_socket": "版本清单",
            "to_socket_identifier": "版本清单",
            "to_socket_type": "Event"
          },
          {
            "from_node": "r1",
            "from_socket": "包索引",
            "from_socket_identifier": "包索引",
            "from_socket_type": "Event",
            "to_node": "r2",
            "to_socket": "包索引",
            "to_socket_identifier": "包索引",
            "to_socket_type": "Event"
          },
          {
            "from_node": "r2",
            "from_socket": "待下载",
            "from_socket_identifier": "待下载",
            "from_socket_type": "Event",
            "to_node": "r3",
            "to_socket": "待下载",
            "to_socket_identifier": "待下载",
            "to_socket_type": "Event"
          },
          {
            "from_node": "r3",
            "from_socket": "包就绪",
            "from_socket_identifier": "包就绪",
            "from_socket_type": "Event",
            "to_node": "r4",
            "to_socket": "包就绪",
            "to_socket_identifier": "包就绪",
            "to_socket_type": "Event"
          },
          {
            "from_node": "r3",
            "from_socket": "包就绪",
            "from_socket_identifier": "包就绪",
            "from_socket_type": "Event",
            "to_node": "r5",
            "to_socket": "包就绪",
            "to_socket_identifier": "包就绪",
            "to_socket_type": "Event"
          },
          {
            "from_node": "r5",
            "from_socket": "资源就绪",
            "from_socket_identifier": "资源就绪",
            "from_socket_type": "Event",
            "to_node": "__group_out__",
            "to_socket": "资源就绪",
            "to_socket_identifier": "资源就绪",
            "to_socket_type": "Event"
          },
          {
            "from_node": "r1",
            "from_socket": "包索引",
            "from_socket_identifier": "包索引",
            "from_socket_type": "Event",
            "to_node": "r6",
            "to_socket": "包索引",
            "to_socket_identifier": "包索引",
            "to_socket_type": "Event"
          }
        ]
      },
      "group_output_location": [
        336.14,
        505.78
      ],
      "unused_from": "羽毛球游戏 / 比赛入口与装配 子树"
    }
  ]
};
window.__LAST_DOC=window.__DOC_FILES["index.js"];
