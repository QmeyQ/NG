/*!
 * 文档（Doc）结构：
 * {
 *   "name": "文档名",
 *   "export_name": "导出名",
 *   "tree_type": "ProjectTree",
 *   "nodes": {
 *     "<key>": {
 *       "location": [x, y],             // 画布坐标（左上角，世界坐标）
 *       "width": 220, "height": 120,
 *       "name": "<key>",
 *       "label": "节点显示名",
 *       "type": "流程",                  // 节点类型：Group(分组) / 代码 / 流程 / 数据 / 待办 / 规则 / 风险
 *       "desc": "说明文字",
 *       "use_custom_color": true, "color": "#4c8dff",
 *       "inputs":  [{"name":"in","type":"Any"}],
 *       "outputs": [{"name":"out","type":"Any"}],
 *       "node_tree_file": "nodes/<key>.js",  // 可加载的子树文件
 *       "node_tree": { "name":"...", "nodes":{...}, "links":[...] },  // 加载的子树
 *       "group_input_location": [x, y],  // 可选：组输入镜像点的画布位置
 *       "group_output_location": [x, y]  // 可选：组输出镜像点的画布位置
 *     }
 *   },
 *   "links": [{
 *     "from_node": "<key>", "from_socket": "端口名", "from_socket_type": "Any",
 *     "from_socket_identifier": "<稳定端口ID>",      // 端口改名后仍能对准
 *     "to_node": "<key>",   "to_socket": "端口名",   "to_socket_type": "Any",
 *     "to_socket_identifier": "<稳定端口ID>"
 *   }],
 *   "unused": [ ... ]                   // 左侧「未使用节点」快照，字段与节点相同，另有 unused_from（原所在层级）
 * }
 */
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
        }
      ],
      "use_custom_color": true,
      "color": [
        0.16,
        0.62,
        0.78
      ],
      "height": 198,
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
      "label": "社交模块（规划）",
      "type": "Group",
      "desc": "整块未开发：主菜单社交页只有占位文案，无好友/聊天/排行/分享的任何代码与数据结构。",
      "inputs": [
        {
          "name": "社交入口",
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
        33.46,
        217.6
      ],
      "width": 240,
      "name": "pres",
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
        921.74
      ],
      "width": 240,
      "name": "bmb",
      "label": "羽毛球游戏",
      "type": "Group",
      "desc": "首个已上线的完整玩法。双击进入后是比赛侧的全部结构：入口装配、Mag、规则、PVP/PVE、联网、物理、碰撞、对象、输入、AI、UI 与已知问题。",
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
      "desc": "Cloudflare Worker(www.normalgame.cn) 网关 + 自实现 AGC 代理 SDK + IP/历史风控；AGC 云函数 te/user.js(用户体系/发号/商店) 与 gobe.js(GOBE 凭据)、shield.js(审计)、db.js→CloudDB(NG/User)；独立管理后台 mag/magh。客户端 pcloud 经此完成注册/资料/联机凭据。",
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
      "desc": "AI 开发闭环：web-api+tool 浏览器自动化把网页 AI 转 OpenAI 兼容 API(含工具调用中继) → com.layabox.mcp 在 LayaAir IDE 起 SSE MCP(动态 tool/prompt、跨进程回调) → AI 自动编译 → 自动运行 web → 浏览器自动测试 → 自动服务端配置 → 自动上传/发布，测试反馈回灌形成迭代。",
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
    }
  ]
};
window.__LAST_DOC=window.__DOC_FILES["index.js"];
