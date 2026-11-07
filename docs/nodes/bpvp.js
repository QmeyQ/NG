window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/bpvp.js"]={
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
  "node_tree": {
    "name": "PVP 对战 子树",
    "nodes": {
      "v1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "v1",
        "label": "进房与角色指派",
        "type": "流程",
        "desc": "load 侧 role_assign/role_ack/match_start；PVP.setup 解析 playerId→Cha 映射。",
        "inputs": [
          {
            "name": "进入比赛",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "房间就绪",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "v2",
        "label": "PVP.setup",
        "type": "流程",
        "desc": "确定本地角色与队伍，登记玩家；双打按 2v2 阵型分配站位。",
        "inputs": [
          {
            "name": "房间就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "角色绑定",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "v3",
        "label": "bindNetwork",
        "type": "流程",
        "desc": "订阅约 18 类消息与帧回调，注册对端离开/房间解散处理，启动权威帧同步线程。",
        "inputs": [
          {
            "name": "角色绑定",
            "type": "Event"
          },
          {
            "name": "网络通道",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "通道订阅",
            "type": "Event"
          }
        ],
        "height": 155
      },
      "v4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "v4",
        "label": "权威端选举",
        "type": "流程",
        "desc": "初始首位玩家为权威；1s 未到时请求、2s/3s 依次升格；authTerm 裁决，stale-term 静默丢弃。",
        "inputs": [
          {
            "name": "通道订阅",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "权威确定",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "v5",
        "label": "帧心跳",
        "type": "流程",
        "desc": "100ms 心跳、50ms 合并；帧内只含 players（位置/动作），不含球状态。",
        "inputs": [
          {
            "name": "权威确定",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "帧下发",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v6": {
        "location": [
          390,
          265
        ],
        "width": 240,
        "name": "v6",
        "label": "本端操作提交",
        "type": "流程",
        "desc": "syncAction 上报 move/hit 意图并节流；本地不直接改权威球，避免双端分叉。",
        "inputs": [
          {
            "name": "操作意图",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "操作上行",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v7": {
        "location": [
          710,
          265
        ],
        "width": 240,
        "name": "v7",
        "label": "权威处理远端",
        "type": "流程",
        "desc": "_applyAction 按 fromId 找到角色重放 move/hit，再由 _makeHitEvent 生成权威击球事件。",
        "inputs": [
          {
            "name": "操作上行",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "击球广播",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v8": {
        "location": [
          1030,
          265
        ],
        "width": 240,
        "name": "v8",
        "label": "击球重放",
        "type": "流程",
        "desc": "_applyHitEvents 排序/去重/缺口检测；re-hit 前 restoreSnap 到击球时刻，保证双端同起点。",
        "inputs": [
          {
            "name": "击球广播",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "球快照",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v9": {
        "location": [
          70,
          460
        ],
        "width": 240,
        "name": "v9",
        "label": "球校正三层",
        "type": "规则",
        "desc": "hit_event（权威弹道）/ ball_stop（落地）/ ball_recovery（快照）三级校正，容差内不打断。",
        "inputs": [
          {
            "name": "球快照",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "校正",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v10": {
        "location": [
          390,
          460
        ],
        "width": 240,
        "name": "v10",
        "label": "角色帧应用",
        "type": "流程",
        "desc": "非权威端按容差插值应用帧，_verifySelfInAuthFrame 自检并上报 PlayerStateReport。",
        "inputs": [
          {
            "name": "帧下发",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "对局结果",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v11": {
        "location": [
          710,
          460
        ],
        "width": 240,
        "name": "v11",
        "label": "快照恢复",
        "type": "流程",
        "desc": "cache 快照 → recover_request → state_recover/ball_recovery；球恢复不带 hitEvents（P0 缺口）。",
        "inputs": [
          {
            "name": "校正",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "恢复请求",
            "type": "Event"
          }
        ],
        "height": 133
      },
      "v12": {
        "location": [
          1030,
          460
        ],
        "width": 240,
        "name": "v12",
        "label": "断线与清理",
        "type": "待办",
        "desc": "对端离开/解散只做局部提示；2v2 缺 1 人不转 AI；onDestroy 未 fully 解绑消息。",
        "inputs": [
          {
            "name": "对局结果",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 133
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "进入比赛",
        "from_socket_identifier": "进入比赛",
        "from_socket_type": "Event",
        "to_node": "v1",
        "to_socket": "进入比赛",
        "to_socket_identifier": "进入比赛",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v1",
        "from_socket": "房间就绪",
        "from_socket_identifier": "房间就绪",
        "from_socket_type": "Event",
        "to_node": "v2",
        "to_socket": "房间就绪",
        "to_socket_identifier": "房间就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v2",
        "from_socket": "角色绑定",
        "from_socket_identifier": "角色绑定",
        "from_socket_type": "Event",
        "to_node": "v3",
        "to_socket": "角色绑定",
        "to_socket_identifier": "角色绑定",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "网络通道",
        "from_socket_identifier": "网络通道",
        "from_socket_type": "Event",
        "to_node": "v3",
        "to_socket": "网络通道",
        "to_socket_identifier": "网络通道",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v3",
        "from_socket": "通道订阅",
        "from_socket_identifier": "通道订阅",
        "from_socket_type": "Event",
        "to_node": "v4",
        "to_socket": "通道订阅",
        "to_socket_identifier": "通道订阅",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v4",
        "from_socket": "权威确定",
        "from_socket_identifier": "权威确定",
        "from_socket_type": "Event",
        "to_node": "v5",
        "to_socket": "权威确定",
        "to_socket_identifier": "权威确定",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "操作意图",
        "from_socket_identifier": "操作意图",
        "from_socket_type": "Event",
        "to_node": "v6",
        "to_socket": "操作意图",
        "to_socket_identifier": "操作意图",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v6",
        "from_socket": "操作上行",
        "from_socket_identifier": "操作上行",
        "from_socket_type": "Event",
        "to_node": "v7",
        "to_socket": "操作上行",
        "to_socket_identifier": "操作上行",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v7",
        "from_socket": "击球广播",
        "from_socket_identifier": "击球广播",
        "from_socket_type": "Event",
        "to_node": "v8",
        "to_socket": "击球广播",
        "to_socket_identifier": "击球广播",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v8",
        "from_socket": "球快照",
        "from_socket_identifier": "球快照",
        "from_socket_type": "Event",
        "to_node": "v9",
        "to_socket": "球快照",
        "to_socket_identifier": "球快照",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v9",
        "from_socket": "校正",
        "from_socket_identifier": "校正",
        "from_socket_type": "Event",
        "to_node": "v11",
        "to_socket": "校正",
        "to_socket_identifier": "校正",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v5",
        "from_socket": "帧下发",
        "from_socket_identifier": "帧下发",
        "from_socket_type": "Event",
        "to_node": "v10",
        "to_socket": "帧下发",
        "to_socket_identifier": "帧下发",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v10",
        "from_socket": "对局结果",
        "from_socket_identifier": "对局结果",
        "from_socket_type": "Event",
        "to_node": "v12",
        "to_socket": "对局结果",
        "to_socket_identifier": "对局结果",
        "to_socket_type": "Event"
      },
      {
        "from_node": "v10",
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
window.__LAST_DOC=window.__DOC_FILES["nodes/bpvp.js"];
