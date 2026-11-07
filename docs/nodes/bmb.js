window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/bmb.js"]={
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
  "node_tree": {
    "name": "羽毛球游戏",
    "nodes": {
      "bentry": {
        "location": [
          -761.24,
          -503.15
        ],
        "width": 240,
        "name": "bentry",
        "label": "比赛入口与装配",
        "type": "Group",
        "desc": "badm.ts：进入 game/badm.ls 后装配场景、角色与控制器，按 mode/人数创建 PVP 或 PVE。此后与平台/选局无关。",
        "inputs": [
          {
            "name": "进入比赛",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "对局就绪",
            "type": "Event"
          },
          {
            "name": "PVP",
            "type": "Event"
          },
          {
            "name": "PVE",
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
        "node_tree_file": "nodes/bentry.js"
      },
      "bmag": {
        "location": [
          -264.38,
          -874.91
        ],
        "width": 240,
        "name": "bmag",
        "label": "比赛管理 Mag",
        "type": "Group",
        "desc": "比赛核心态与操作入口：players / ball / phase / 比分 / 发球方 / 权威标志；本地输入与远端重放最终都走 hit()。",
        "inputs": [
          {
            "name": "对局就绪",
            "type": "Event"
          },
          {
            "name": "操作意图",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "比赛状态",
            "type": "Event"
          },
          {
            "name": "判决请求",
            "type": "Event"
          },
          {
            "name": "物理步进",
            "type": "Event"
          },
          {
            "name": "碰撞请求",
            "type": "Event"
          }
        ],
        "use_custom_color": true,
        "color": [
          0.16,
          0.62,
          0.78
        ],
        "height": 220,
        "node_tree_file": "nodes/bmag.js"
      },
      "brule": {
        "location": [
          409.93,
          -1097.69
        ],
        "width": 240,
        "name": "brule",
        "label": "规则与判定",
        "type": "Group",
        "desc": "rule.ts：8 个 MatchPhase、发球权/接发、站位与发球区、越界、落地结算、21 分制、换边与鹰眼。",
        "inputs": [
          {
            "name": "判决请求",
            "type": "Event"
          },
          {
            "name": "比赛状态",
            "type": "Event"
          },
          {
            "name": "碰撞事件",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "比分阶段",
            "type": "Event"
          }
        ],
        "use_custom_color": true,
        "color": [
          0.24,
          0.62,
          0.36
        ],
        "height": 198,
        "node_tree_file": "nodes/brule.js"
      },
      "bpvp": {
        "location": [
          -132.91,
          -245.75
        ],
        "width": 240,
        "name": "bpvp",
        "label": "PVP 对战",
        "type": "Group",
        "desc": "pvp.ts：角色指派 → 权威端选举 → 帧心跳 → 操作上行/重放 → 球校正与快照恢复。当前有 5 个 P0 级问题。",
        "inputs": [
          {
            "name": "进入比赛",
            "type": "Event"
          },
          {
            "name": "网络通道",
            "type": "Event"
          },
          {
            "name": "操作意图",
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
          0.78,
          0.26,
          0.3
        ],
        "height": 198,
        "node_tree_file": "nodes/bpvp.js"
      },
      "bpve": {
        "location": [
          -127.32,
          -434.76
        ],
        "width": 240,
        "name": "bpve",
        "label": "PVE 单机",
        "type": "Group",
        "desc": "pve.ts：无联网权威，本地全部权威；AI 接管对手与队友。",
        "inputs": [
          {
            "name": "单机入口",
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
          0.24,
          0.62,
          0.36
        ],
        "height": 154,
        "node_tree_file": "nodes/bpve.js"
      },
      "bnet": {
        "location": [
          -494.23,
          18.02
        ],
        "width": 240,
        "name": "bnet",
        "label": "联网与协议",
        "type": "Group",
        "desc": "GOBE 房间 / 帧同步 + 消息信封 + pvpProto 校验 + NetBoot 会话。消息分帧通道与可靠通道两类。",
        "inputs": [
          {
            "name": "平台身份",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "网络通道",
            "type": "Event"
          }
        ],
        "use_custom_color": true,
        "color": [
          0.85,
          0.55,
          0.2
        ],
        "height": 154,
        "node_tree_file": "nodes/bnet.js"
      },
      "bphy": {
        "location": [
          89.86,
          -854.38
        ],
        "width": 240,
        "name": "bphy",
        "label": "物理内核",
        "type": "Group",
        "desc": "phy.ts：Q10 定点 + RK4 + 固定步；strike / attachAt / restore 是唯一写入面，其余只读采样。",
        "inputs": [
          {
            "name": "物理步进",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "球位姿",
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
        "node_tree_file": "nodes/bphy.js"
      },
      "bcoll": {
        "location": [
          745.96,
          -455.34
        ],
        "width": 240,
        "name": "bcoll",
        "label": "碰撞检测",
        "type": "Group",
        "desc": "collision.ts：角色-角色/角色-网推挤与球-角色检测。注意：CollisionManager 在 src 中无引用，疑似未接线。",
        "inputs": [
          {
            "name": "碰撞请求",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "碰撞事件",
            "type": "Event"
          }
        ],
        "use_custom_color": true,
        "color": [
          0.85,
          0.55,
          0.2
        ],
        "height": 154,
        "node_tree_file": "nodes/bcoll.js"
      },
      "bobj": {
        "location": [
          407.25,
          -858.33
        ],
        "width": 240,
        "name": "bobj",
        "label": "场上对象",
        "type": "Group",
        "desc": "Obj 基类 + Ball / Cha / Ani：表现层只写节点位姿，物理真相仍在 Phy 内核。",
        "inputs": [
          {
            "name": "球位姿",
            "type": "Event"
          }
        ],
        "outputs": [],
        "use_custom_color": true,
        "color": [
          0.24,
          0.62,
          0.36
        ],
        "height": 154,
        "node_tree_file": "nodes/bobj.js"
      },
      "binput": {
        "location": [
          -675.54,
          -875.83
        ],
        "width": 240,
        "name": "binput",
        "label": "输入控制",
        "type": "Group",
        "desc": "control.ts：按下/滑动/松手映射为击球参数；单手按按住时长定角，双手用移动摇杆定仰角；双击切特殊接球。",
        "inputs": [
          {
            "name": "输入事件",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "操作意图",
            "type": "Event"
          }
        ],
        "use_custom_color": true,
        "color": [
          0.25,
          0.51,
          0.96
        ],
        "height": 154,
        "node_tree_file": "nodes/binput.js"
      },
      "bai": {
        "location": [
          89.86,
          -659.38
        ],
        "width": 240,
        "name": "bai",
        "label": "AI 对手",
        "type": "Group",
        "desc": "ai.ts：难度 0.4/0.6/0.8/0.95；发球/对打两阶段，抛物线预测落点 + PID 自纠错；硬编码较多。",
        "inputs": [
          {
            "name": "比赛状态",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "操作意图",
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
        "node_tree_file": "nodes/bai.js"
      },
      "bui": {
        "location": [
          273.14,
          -363.01
        ],
        "width": 240,
        "name": "bui",
        "label": "界面与表现",
        "type": "Group",
        "desc": "CUI 摇杆/箭头、比赛 HUD、弹窗提示、音频与相机；结算界面缺失是当前最大体验缺口。",
        "inputs": [
          {
            "name": "比赛状态",
            "type": "Event"
          },
          {
            "name": "对局结果",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "提示",
            "type": "Event"
          }
        ],
        "use_custom_color": true,
        "color": [
          0.25,
          0.51,
          0.96
        ],
        "height": 176,
        "node_tree_file": "nodes/bui.js"
      },
      "brisk": {
        "location": [
          -492.29,
          224.26
        ],
        "width": 240,
        "name": "brisk",
        "label": "已知问题与待办",
        "type": "Group",
        "desc": "按优先级归集当前 PVP/规则/同步的真实缺口，可直接当作迭代清单使用。",
        "inputs": [
          {
            "name": "问题",
            "type": "Event"
          }
        ],
        "outputs": [],
        "use_custom_color": true,
        "color": [
          0.78,
          0.26,
          0.3
        ],
        "height": 161,
        "node_tree_file": "nodes/brisk.js"
      }
    },
    "links": [
      {
        "from_node": "bentry",
        "from_socket": "PVP",
        "from_socket_identifier": "PVP",
        "from_socket_type": "Event",
        "to_node": "bpvp",
        "to_socket": "进入比赛",
        "to_socket_identifier": "进入比赛",
        "to_socket_type": "Event"
      },
      {
        "from_node": "bentry",
        "from_socket": "PVE",
        "from_socket_identifier": "PVE",
        "from_socket_type": "Event",
        "to_node": "bpve",
        "to_socket": "单机入口",
        "to_socket_identifier": "单机入口",
        "to_socket_type": "Event"
      },
      {
        "from_node": "bentry",
        "from_socket": "对局就绪",
        "from_socket_identifier": "对局就绪",
        "from_socket_type": "Event",
        "to_node": "bmag",
        "to_socket": "对局就绪",
        "to_socket_identifier": "对局就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "bnet",
        "from_socket": "网络通道",
        "from_socket_identifier": "网络通道",
        "from_socket_type": "Event",
        "to_node": "bpvp",
        "to_socket": "网络通道",
        "to_socket_identifier": "网络通道",
        "to_socket_type": "Event"
      },
      {
        "from_node": "binput",
        "from_socket": "操作意图",
        "from_socket_identifier": "操作意图",
        "from_socket_type": "Event",
        "to_node": "bmag",
        "to_socket": "操作意图",
        "to_socket_identifier": "操作意图",
        "to_socket_type": "Event"
      },
      {
        "from_node": "binput",
        "from_socket": "操作意图",
        "from_socket_identifier": "操作意图",
        "from_socket_type": "Event",
        "to_node": "bpvp",
        "to_socket": "操作意图",
        "to_socket_identifier": "操作意图",
        "to_socket_type": "Event"
      },
      {
        "from_node": "bai",
        "from_socket": "操作意图",
        "from_socket_identifier": "操作意图",
        "from_socket_type": "Event",
        "to_node": "bmag",
        "to_socket": "操作意图",
        "to_socket_identifier": "操作意图",
        "to_socket_type": "Event"
      },
      {
        "from_node": "bmag",
        "from_socket": "比赛状态",
        "from_socket_identifier": "比赛状态",
        "from_socket_type": "Event",
        "to_node": "bai",
        "to_socket": "比赛状态",
        "to_socket_identifier": "比赛状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "bmag",
        "from_socket": "比赛状态",
        "from_socket_identifier": "比赛状态",
        "from_socket_type": "Event",
        "to_node": "brule",
        "to_socket": "比赛状态",
        "to_socket_identifier": "比赛状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "bmag",
        "from_socket": "判决请求",
        "from_socket_identifier": "判决请求",
        "from_socket_type": "Event",
        "to_node": "brule",
        "to_socket": "判决请求",
        "to_socket_identifier": "判决请求",
        "to_socket_type": "Event"
      },
      {
        "from_node": "bmag",
        "from_socket": "物理步进",
        "from_socket_identifier": "物理步进",
        "from_socket_type": "Event",
        "to_node": "bphy",
        "to_socket": "物理步进",
        "to_socket_identifier": "物理步进",
        "to_socket_type": "Event"
      },
      {
        "from_node": "bmag",
        "from_socket": "碰撞请求",
        "from_socket_identifier": "碰撞请求",
        "from_socket_type": "Event",
        "to_node": "bcoll",
        "to_socket": "碰撞请求",
        "to_socket_identifier": "碰撞请求",
        "to_socket_type": "Event"
      },
      {
        "from_node": "bphy",
        "from_socket": "球位姿",
        "from_socket_identifier": "球位姿",
        "from_socket_type": "Event",
        "to_node": "bobj",
        "to_socket": "球位姿",
        "to_socket_identifier": "球位姿",
        "to_socket_type": "Event"
      },
      {
        "from_node": "bcoll",
        "from_socket": "碰撞事件",
        "from_socket_identifier": "碰撞事件",
        "from_socket_type": "Event",
        "to_node": "brule",
        "to_socket": "碰撞事件",
        "to_socket_identifier": "碰撞事件",
        "to_socket_type": "Event"
      },
      {
        "from_node": "brule",
        "from_socket": "比分阶段",
        "from_socket_identifier": "比分阶段",
        "from_socket_type": "Event",
        "to_node": "bui",
        "to_socket": "比赛状态",
        "to_socket_identifier": "比赛状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "bpvp",
        "from_socket": "对局结果",
        "from_socket_identifier": "对局结果",
        "from_socket_type": "Event",
        "to_node": "bui",
        "to_socket": "对局结果",
        "to_socket_identifier": "对局结果",
        "to_socket_type": "Event"
      },
      {
        "from_node": "bpve",
        "from_socket": "对局结果",
        "from_socket_identifier": "对局结果",
        "from_socket_type": "Event",
        "to_node": "bui",
        "to_socket": "对局结果",
        "to_socket_identifier": "对局结果",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "进入比赛",
        "from_socket_identifier": "进入比赛",
        "from_socket_type": "Event",
        "to_node": "bentry",
        "to_socket": "进入比赛",
        "to_socket_identifier": "进入比赛",
        "to_socket_type": "Event"
      },
      {
        "from_node": "bpvp",
        "from_socket": "对局结果",
        "from_socket_identifier": "对局结果",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "对局结果",
        "to_socket_identifier": "对局结果",
        "to_socket_type": "Event"
      },
      {
        "from_node": "bpve",
        "from_socket": "对局结果",
        "from_socket_identifier": "对局结果",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "对局结果",
        "to_socket_identifier": "对局结果",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/bmb.js"];
