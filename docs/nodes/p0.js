window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/p0.js"]={
  "location": [
    70,
    70
  ],
  "width": 240,
  "name": "p0",
  "label": "P0 阻断级",
  "type": "Group",
  "desc": "直接影响胜负判定或对局可玩性，必须先修。",
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
  "height": 100,
  "node_tree": {
    "name": "P0 阻断级 子树",
    "nodes": {
      "x1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "x1",
        "label": "gamesWon 按边统计",
        "type": "风险",
        "desc": "每局 _switchSides 交换场地但 gamesWon 不翻转；2:0 判不出，第 3 局可能把冠军判给实际输方。",
        "inputs": [
          {
            "name": "问题",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "x2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "x2",
        "label": "击球序号回绕",
        "type": "风险",
        "desc": "权威切换后各端序号独立自增；落后端 Action 被 stale-term 静默丢弃，新权威击球可能被当旧事件跳过。",
        "inputs": [
          {
            "name": "问题",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "x3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "x3",
        "label": "ball_recovery 丢事件",
        "type": "风险",
        "desc": "快照不带 hitEvents，却把 _lastAppliedAuthHitSeq 抬到当前值，恢复窗口内的击球事件被吞。",
        "inputs": [
          {
            "name": "问题",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "x4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "x4",
        "label": "时钟未对齐",
        "type": "风险",
        "desc": "击球时刻用发送端本机时钟，对端当本机时间用；phy 只把未来钳到 now，钟差不收敛。",
        "inputs": [
          {
            "name": "问题",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "x5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "x5",
        "label": "结束无结算",
        "type": "风险",
        "desc": "ENDED/断线无结算链路；2v2 掉 1 人不转 AI、不判负，房间可能挂住。",
        "inputs": [
          {
            "name": "问题",
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
        "from_socket": "问题",
        "from_socket_identifier": "问题",
        "from_socket_type": "Event",
        "to_node": "x1",
        "to_socket": "问题",
        "to_socket_identifier": "问题",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/p0.js"];
