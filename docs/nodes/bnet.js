window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/bnet.js"]={
  "location": [
    -494.23,
    18.02
  ],
  "width": 240,
  "name": "bnet",
  "label": "联网与协议",
  "type": "Group",
  "desc": "GOBE 房间 / 帧同步 + 消息信封 + pvpProto 校验 + NetBoot 会话。frame 有损画面，msg 事件/协商；hit_event/ball_stop 走应用层 ACK+重传。",
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
  "node_tree": {
    "name": "联网与协议 子树",
    "nodes": {
      "t1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "t1",
        "label": "Gnet 初始化",
        "type": "流程",
        "desc": "参数校验（accessToken / clientSecret 互斥）、SDK 加载、Client init 与失败诊断。",
        "inputs": [
          {
            "name": "平台身份",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "会话",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "t2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "t2",
        "label": "消息信封",
        "type": "数据",
        "desc": "v / kind / seq / time / from / to? / authTerm；统一 send 组装、accept 裁决、dispatch 分发。time 是发送端本地时基，跨端只用于估计偏移，不能直接当接收端时刻。",
        "inputs": [
          {
            "name": "会话",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "通道",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "t3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "t3",
        "label": "通道选择",
        "type": "规则",
        "desc": "msg 走 sendToClient(事件/协商，实测会限流丢包)；frame 走 sendFrame(服务端聚合、不可靠，承载角色画面与选举通告)。可靠种类由应用层 ACK+重传保证，不假设底层可靠。",
        "inputs": [
          {
            "name": "通道",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "通道",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "t4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "t4",
        "label": "消息注册表",
        "type": "数据",
        "desc": "按 kind 声明 authOnly / forMe / 去重 / 序号 / 过期 / 校验 / reliable(ACK 重传) / staleTermFree(请求与签收不被任期闸门误杀)，共约 19 类。",
        "inputs": [
          {
            "name": "通道",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "校验",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "t5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "t5",
        "label": "pvpProto 校验",
        "type": "规则",
        "desc": "Kind 枚举、BOUNDS、encodeBall/decodeBall(1/1024 定点)、checkHit、checkAssign、pickPromotable。协议字段语义只在这里定义，msg 注册表只引用不重复解释。decodeBall 必须同时产出两套字段：定点整数 px/py/pz/vx/vy/vz/sx/sy/sz/sai（内核 Phy.restore 的唯一入参形态）与浮点 pos/vel/sn（attach/表现层便利口径）。只给浮点会让 Phy.restore 的有限数校验失败并【静默返回 false】——击球重放/接管锚点的入口恢复全部无效果，两端从各自本地球位起算（run4 发球轨迹同 z 不同 y、落地差 0.42m 的根因）。数组尾部再带 qx/qy/qz/qw（定点四元数）：球姿态参与物理（axes/alx/rstep 都读 rot），恢复时缺省成单位四元数会让后续轨迹与落点算歪；老包（11 项）仍接受，缺省按单位四元数。",
        "inputs": [
          {
            "name": "校验",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "t6": {
        "location": [
          390,
          265
        ],
        "width": 240,
        "name": "t6",
        "label": "NetBoot 会话",
        "type": "流程",
        "desc": "ensure(force)/ready()/openId()；accesstoken 缓存、并发重取队列、失败回调。",
        "inputs": [
          {
            "name": "会话",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "t7": {
        "location": [
          710,
          265
        ],
        "width": 240,
        "name": "t7",
        "label": "QA 调试菜单",
        "type": "代码",
        "desc": "QA.installMenu / installMatch 注入调试面板，正式包需关闭。",
        "inputs": [
          {
            "name": "会话",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "t8": {
        "location": [
          1030,
          265
        ],
        "width": 240,
        "name": "t8",
        "label": "可靠种类 ACK+重传",
        "type": "流程",
        "desc": "hit_event / ball_stop 发送即挂起；300ms 未签收重发同一载荷，接收端按 eventId/stopId 幂等去重；去重命中与接受成功都回 event_ack；16 次仍无签收放弃并告警，交给序号缺口 recovery 兜底。",
        "inputs": [
          {
            "name": "校验",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "t9": {
        "location": [
          70,
          460
        ],
        "width": 240,
        "name": "t9",
        "label": "陈旧任期豁免",
        "type": "规则",
        "desc": "stale-term 只用于权威状态/裁决类消息(帧、hit_event、ball_stop、state_*、recovery 响应)。非权威端的 action、event_ack、sync_recover、state_confirm 等必须放行——否则新权威上任后这些端的上行会被整封丢弃。",
        "inputs": [],
        "outputs": [],
        "height": 100
      },
      "t10": {
        "location": [
          390,
          460
        ],
        "width": 240,
        "name": "t10",
        "label": "房间事件桥接",
        "type": "流程",
        "desc": "_bridgeRoom 把 client.room 的 onRecvFrame/onRecvFromClient/onJoin/onLeave/onDismiss 桥到 MPM 多播，按 room 引用幂等。坑: 房间可能在 joinRoom 回调【之后】才挂到 client 上，而 bindRoomEvents 只执行一次且只在注册监听时顺带桥接——若那一刻 client.room 还空，新 room 永远没有桥接，本端能发包(直接用 room.sendToClient)却收不到任何消息(实测配对时一端永久停在「仍未收到 role_assign」，对端每 800ms 重发都进不来)。因此 Gnet.getRoom() 每次取房都补一次桥接(引用相同则直接返回)。",
        "inputs": [],
        "outputs": [],
        "height": 100
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "平台身份",
        "from_socket_identifier": "平台身份",
        "from_socket_type": "Event",
        "to_node": "t1",
        "to_socket": "平台身份",
        "to_socket_identifier": "平台身份",
        "to_socket_type": "Event"
      },
      {
        "from_node": "t1",
        "from_socket": "会话",
        "from_socket_identifier": "会话",
        "from_socket_type": "Event",
        "to_node": "t2",
        "to_socket": "会话",
        "to_socket_identifier": "会话",
        "to_socket_type": "Event"
      },
      {
        "from_node": "t2",
        "from_socket": "通道",
        "from_socket_identifier": "通道",
        "from_socket_type": "Event",
        "to_node": "t3",
        "to_socket": "通道",
        "to_socket_identifier": "通道",
        "to_socket_type": "Event"
      },
      {
        "from_node": "t3",
        "from_socket": "通道",
        "from_socket_identifier": "通道",
        "from_socket_type": "Event",
        "to_node": "t4",
        "to_socket": "通道",
        "to_socket_identifier": "通道",
        "to_socket_type": "Event"
      },
      {
        "from_node": "t4",
        "from_socket": "校验",
        "from_socket_identifier": "校验",
        "from_socket_type": "Event",
        "to_node": "t5",
        "to_socket": "校验",
        "to_socket_identifier": "校验",
        "to_socket_type": "Event"
      },
      {
        "from_node": "t4",
        "from_socket": "校验",
        "from_socket_identifier": "校验",
        "from_socket_type": "Event",
        "to_node": "t8",
        "to_socket": "校验",
        "to_socket_identifier": "校验",
        "to_socket_type": "Event"
      },
      {
        "from_node": "t1",
        "from_socket": "会话",
        "from_socket_identifier": "会话",
        "from_socket_type": "Event",
        "to_node": "t6",
        "to_socket": "会话",
        "to_socket_identifier": "会话",
        "to_socket_type": "Event"
      },
      {
        "from_node": "t1",
        "from_socket": "会话",
        "from_socket_identifier": "会话",
        "from_socket_type": "Event",
        "to_node": "t7",
        "to_socket": "会话",
        "to_socket_identifier": "会话",
        "to_socket_type": "Event"
      },
      {
        "from_node": "t3",
        "from_socket": "通道",
        "from_socket_identifier": "通道",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "网络通道",
        "to_socket_identifier": "网络通道",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/bnet.js"];
