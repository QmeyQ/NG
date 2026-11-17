window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/bphy.js"]={
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
  "node_tree": {
    "name": "物理内核 子树",
    "nodes": {
      "h1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "h1",
        "label": "唯一写入面纪律",
        "type": "规则",
        "desc": "弹道 strike()、静置 attachAt()、网络快照 restore()；其余 sample/advance 只读。",
        "inputs": [
          {
            "name": "物理步进",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "状态",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "h2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "h2",
        "label": "构造与 Q10",
        "type": "流程",
        "desc": "从表现层取 PoseIn 一次，转换到 Q10 整数状态，建立历史 MPMD。",
        "inputs": [
          {
            "name": "状态",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "状态",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "h3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "h3",
        "label": "strike()",
        "type": "流程",
        "desc": "击球弹道唯一入口：时间回退、历史恢复、施加击球参数、迟到补算上限。",
        "inputs": [
          {
            "name": "状态",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "弹道",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "h4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "h4",
        "label": "attachAt()",
        "type": "流程",
        "desc": "静止/持球挂载：零速度、时钟对齐、定点整数。整数零速必须同步回浮点影子(state.iSync)——否则 state.vel 仍留着上一段弹道的速度，外部诊断读成「躺着还在飞」，后续速度判据也会误判。attachAt 清空历史并把 state.time 置为挂载时刻，同时丢弃表现态尾状态 disp(理由同 restore：disp.time > state.time 时 poseOut 会继续返回旧弹道的显示位置，钉球/停球对齐后节点不动)；它不改 isCalc(恒 false)，但会 isSleeping=true。",
        "inputs": [
          {
            "name": "状态",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "弹道",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "h5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "h5",
        "label": "restore()",
        "type": "流程",
        "desc": "网络快照落地：球位姿/速度整体覆盖，用于校正与恢复；时刻压回本机现在(不许未来)，清空重铺内核历史——否则后续 strike/stateUpTo 回退时会读到上一段弹道的旧状态，把恢复后第一拍从错误入口起算；同时必须丢弃表现态尾状态 disp。poseOut() 在 disp.time > state.time 时优先返回 disp(不足一格的显示尾巴)，恢复/挂载后若不清，节点仍停在上一条弹道的显示位置：restoreSnap 看似生效、节点却没动，随后 replayHit 的 _startWindup 从球节点读入口位置，就把旧弹道终点当成击球入口(实测对端发球重放从上一拍落点 -7.3m 起算，整段单飞)。restore 还必须把 isCalc 置 true 并清 lastGndHit/lastNetHit：快照是权威「此刻仍在算」的证据（恢复端此前可能已熄火/停算，isCalc=false 会让 advanceTo 一帧都推不动），旧的碰撞记录也要丢，否则上一段弹道的碰网/落地回调会在恢复后被再抛一次。",
        "inputs": [
          {
            "name": "状态",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "弹道",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "h6": {
        "location": [
          390,
          265
        ],
        "width": 240,
        "name": "h6",
        "label": "只读采样",
        "type": "流程",
        "desc": "advanceTo / sampleAt / sampleRange / flying / resting / poseOut 供表现层与判定查询。",
        "inputs": [
          {
            "name": "弹道",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "球位姿",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "h7": {
        "location": [
          710,
          265
        ],
        "width": 240,
        "name": "h7",
        "label": "历史 MPMD",
        "type": "数据",
        "desc": "按时间索引的历史状态，供回退与迟到帧补算命中。",
        "inputs": [
          {
            "name": "弹道",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "h8": {
        "location": [
          1030,
          265
        ],
        "width": 240,
        "name": "h8",
        "label": "RK4 与碰撞响应",
        "type": "流程",
        "desc": "der() 四阶积分；球头/球羽双球体、网面与地面冲量、摩擦、回转。",
        "inputs": [
          {
            "name": "弹道",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "h9": {
        "location": [
          70,
          460
        ],
        "width": 240,
        "name": "h9",
        "label": "phyCfg 参数",
        "type": "数据",
        "desc": "Fx 定点转换、State 字段、Params / NetConfig / BallRegion / NetCollision 默认值。",
        "inputs": [
          {
            "name": "弹道",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "物理步进",
        "from_socket_identifier": "物理步进",
        "from_socket_type": "Event",
        "to_node": "h1",
        "to_socket": "物理步进",
        "to_socket_identifier": "物理步进",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h1",
        "from_socket": "状态",
        "from_socket_identifier": "状态",
        "from_socket_type": "Event",
        "to_node": "h2",
        "to_socket": "状态",
        "to_socket_identifier": "状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h2",
        "from_socket": "状态",
        "from_socket_identifier": "状态",
        "from_socket_type": "Event",
        "to_node": "h3",
        "to_socket": "状态",
        "to_socket_identifier": "状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h2",
        "from_socket": "状态",
        "from_socket_identifier": "状态",
        "from_socket_type": "Event",
        "to_node": "h4",
        "to_socket": "状态",
        "to_socket_identifier": "状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h2",
        "from_socket": "状态",
        "from_socket_identifier": "状态",
        "from_socket_type": "Event",
        "to_node": "h5",
        "to_socket": "状态",
        "to_socket_identifier": "状态",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h3",
        "from_socket": "弹道",
        "from_socket_identifier": "弹道",
        "from_socket_type": "Event",
        "to_node": "h6",
        "to_socket": "弹道",
        "to_socket_identifier": "弹道",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h4",
        "from_socket": "弹道",
        "from_socket_identifier": "弹道",
        "from_socket_type": "Event",
        "to_node": "h6",
        "to_socket": "弹道",
        "to_socket_identifier": "弹道",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h5",
        "from_socket": "弹道",
        "from_socket_identifier": "弹道",
        "from_socket_type": "Event",
        "to_node": "h6",
        "to_socket": "弹道",
        "to_socket_identifier": "弹道",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h3",
        "from_socket": "弹道",
        "from_socket_identifier": "弹道",
        "from_socket_type": "Event",
        "to_node": "h7",
        "to_socket": "弹道",
        "to_socket_identifier": "弹道",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h3",
        "from_socket": "弹道",
        "from_socket_identifier": "弹道",
        "from_socket_type": "Event",
        "to_node": "h8",
        "to_socket": "弹道",
        "to_socket_identifier": "弹道",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h3",
        "from_socket": "弹道",
        "from_socket_identifier": "弹道",
        "from_socket_type": "Event",
        "to_node": "h9",
        "to_socket": "弹道",
        "to_socket_identifier": "弹道",
        "to_socket_type": "Event"
      },
      {
        "from_node": "h6",
        "from_socket": "球位姿",
        "from_socket_identifier": "球位姿",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "球位姿",
        "to_socket_identifier": "球位姿",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/bphy.js"];
