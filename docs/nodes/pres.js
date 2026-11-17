window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/pres.js"]={
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
        "desc": "Res.url按需下载或恢复本地包并提取索引；DP(url,percent,speed,loaded,total)与XP(pack,fraction)持续驱动进度，不等包就绪才开始预测。下载完成仍需提取；任务成功/失败由实际回调判定。取消由业务入口单独通知进度子流程。",
        "inputs": [
          {
            "name": "待下载",
            "type": "Event"
          }
        ],
        "outputs": [
          {"name": "包就绪", "type": "Event"},
          {"name": "进度事件", "type": "Event"},
          {"name": "任务结束", "type": "Event"}
        ],
        "height": 180
      },
      "r4": {
        "location": [1030, 70],
        "width": 260,
        "height": 180,
        "name": "r4",
        "label": "真实进度 + ProgPID",
        "type": "Group",
        "desc": "DP/XP 真值按业务阶段映射；缺少采样时由 ProgPID 预测，不倒退、不提前完成。任务成功/失败/取消由业务回调决定，不由进度值决定。",
        "inputs": [{"name": "进度事件", "type": "Event"}, {"name": "任务结束", "type": "Event"}],
        "outputs": [],
        "use_custom_color": true,
        "color": [0.24, 0.62, 0.36],
        "node_tree_file": "nodes/rprogress.js"
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
      "rparse": {
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
        "node_tree_file": "nodes/rparse.js"
      },
      "rrequest": {
        "location": [
          1030,
          265
        ],
        "width": 240,
        "height": 154,
        "name": "rrequest",
        "label": "业务资源请求",
        "type": "数据",
        "desc": "业务显式调用 Res.get(path, type/callback)，例如 nor/ani.controller；只按需解析目标资源及其依赖，不因包就绪自动加载所有资源。",
        "inputs": [],
        "outputs": [
          {
            "name": "资源请求",
            "type": "Event"
          }
        ]
      },
      "rresult": {
        "location": [
          710,
          520
        ],
        "width": 260,
        "height": 154,
        "name": "rresult",
        "label": "调用方取得资源",
        "type": "流程",
        "desc": "Res.get resolve/回调返回缓存对象或原始数据；控制器交Animator，nor/sky.lmat交天空挂载示例分支，其余资源交各业务使用。包就绪、对象返回、实际渲染可见是三个不同条件，不能互相替代。",
        "inputs": [
          {
            "name": "资源结果",
            "type": "Event"
          }
        ],
        "outputs": [{"name": "天空材质", "type": "Event"}]
      },
      "rsky": {
        "location": [710, 770],
        "width": 280,
        "height": 180,
        "name": "rsky",
        "label": "动态天空 / 挂载与验收",
        "type": "Group",
        "desc": "badm 的 nor/sky.lmat 回调挂载 SkyDome；区分材质返回、renderer赋值与实际可见。记录纹理槽修复、54项回归及本地浏览器结果，不宣称已发布或完整对局验收。",
        "inputs": [{"name": "天空材质", "type": "Event"}],
        "outputs": [],
        "use_custom_color": true,
        "color": [0.24, 0.62, 0.36],
        "node_tree_file": "nodes/rsky.js"
      },
      "rfailure": {
        "location": [
          1030,
          520
        ],
        "width": 240,
        "height": 154,
        "name": "rfailure",
        "label": "调用方处理失败",
        "type": "流程",
        "desc": "Promise catch 或回调 null 交业务处理，不宣称解析成功；本工作流只记录现有行为，不修改业务恢复策略。",
        "inputs": [
          {
            "name": "解析失败",
            "type": "Event"
          }
        ],
        "outputs": []
      }
    },
    "links": [
      {"from_node": "r3", "from_socket": "任务结束", "from_socket_identifier": "任务结束", "from_socket_type": "Event", "to_node": "r4", "to_socket": "任务结束", "to_socket_identifier": "任务结束", "to_socket_type": "Event"},
      {"from_node": "rresult", "from_socket": "天空材质", "from_socket_identifier": "天空材质", "from_socket_type": "Event", "to_node": "rsky", "to_socket": "天空材质", "to_socket_identifier": "天空材质", "to_socket_type": "Event"},
      {
        "from_node": "r5",
        "from_socket": "资源就绪",
        "from_socket_identifier": "资源就绪",
        "from_socket_type": "Event",
        "to_node": "rparse",
        "to_socket": "包可用",
        "to_socket_identifier": "包可用",
        "to_socket_type": "Event"
      },
      {
        "from_node": "rrequest",
        "from_socket": "资源请求",
        "from_socket_identifier": "资源请求",
        "from_socket_type": "Event",
        "to_node": "rparse",
        "to_socket": "资源请求",
        "to_socket_identifier": "资源请求",
        "to_socket_type": "Event"
      },
      {
        "from_node": "rparse",
        "from_socket": "资源结果",
        "from_socket_identifier": "资源结果",
        "from_socket_type": "Event",
        "to_node": "rresult",
        "to_socket": "资源结果",
        "to_socket_identifier": "资源结果",
        "to_socket_type": "Event"
      },
      {
        "from_node": "rparse",
        "from_socket": "解析失败",
        "from_socket_identifier": "解析失败",
        "from_socket_type": "Event",
        "to_node": "rfailure",
        "to_socket": "解析失败",
        "to_socket_identifier": "解析失败",
        "to_socket_type": "Event"
      },
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
        "from_socket": "进度事件",
        "from_socket_identifier": "进度事件",
        "from_socket_type": "Event",
        "to_node": "r4",
        "to_socket": "进度事件",
        "to_socket_identifier": "进度事件",
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
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/pres.js"];
