window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/brule.js"]={
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
  "node_tree": {
    "name": "规则与判定 子树",
    "nodes": {
      "r1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "r1",
        "label": "阶段机 MatchPhase",
        "type": "数据",
        "desc": "WAITING_START / COUNTDOWN / SERVING / RALLYING / SCORING / ENDED / EAGLE_CONFIRM / EAGLE_CHALLENGE；前两者未使用。",
        "inputs": [
          {
            "name": "判决请求",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "阶段",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "r2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "r2",
        "label": "initMatch / update",
        "type": "流程",
        "desc": "initMatch 重置比分与发球；update 按阶段分发到倒计时/发球/回合处理。",
        "inputs": [
          {
            "name": "阶段",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "阶段",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "r3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "r3",
        "label": "倒计时与分球",
        "type": "流程",
        "desc": "_updateCountdown 结束时分球：发球方争球，转入 SERVING。",
        "inputs": [
          {
            "name": "阶段",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "发球就绪",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "r4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "r4",
        "label": "发球权与接发",
        "type": "流程",
        "desc": "_updateServerAndReceiver 按队伍奇偶与得分方切换发球员/接发员。",
        "inputs": [
          {
            "name": "发球就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "发球就绪",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "r5": {
        "location": [
          70,
          265
        ],
        "width": 240,
        "name": "r5",
        "label": "发球站位校验",
        "type": "规则",
        "desc": "checkServePosition：发球员与接发员必须在规定半区与站位，否则判违例。",
        "inputs": [
          {
            "name": "发球就绪",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "r6": {
        "location": [
          390,
          265
        ],
        "width": 240,
        "name": "r6",
        "label": "发球区落点",
        "type": "规则",
        "desc": "_isServeIn：前发球线 1.98 + serveHalfZ 判定；短球或越区判失分。",
        "inputs": [
          {
            "name": "碰撞事件",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "r7": {
        "location": [
          710,
          265
        ],
        "width": 240,
        "name": "r7",
        "label": "回合越界与超时",
        "type": "规则",
        "desc": "_updateRally：x>0.2 判出界；发球超 10s 直接判违例。",
        "inputs": [
          {
            "name": "阶段",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "r8": {
        "location": [
          1030,
          265
        ],
        "width": 240,
        "name": "r8",
        "label": "落地结算",
        "type": "流程",
        "desc": "settleGroundHit 按顺序判定：先出界，再触地一方得失分，原因串写入事件。",
        "inputs": [
          {
            "name": "碰撞事件",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "结算",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "r9": {
        "location": [
          70,
          460
        ],
        "width": 240,
        "name": "r9",
        "label": "计分 score",
        "type": "规则",
        "desc": "21 分且净胜 2 分，30 分封顶；bestOf3 三局两胜，更新比分并发事件。",
        "inputs": [
          {
            "name": "结算",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "结算",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "r10": {
        "location": [
          390,
          460
        ],
        "width": 240,
        "name": "r10",
        "label": "换边与局数",
        "type": "规则",
        "desc": "每局结束 _switchSides 交换场地；gamesWon 按「边」统计，换边后不翻转 → 局数漂移（P0）。",
        "inputs": [
          {
            "name": "结算",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "比分阶段",
            "type": "Event"
          }
        ],
        "height": 100
      },
      "r11": {
        "location": [
          710,
          460
        ],
        "width": 240,
        "name": "r11",
        "label": "鹰眼阶段",
        "type": "流程",
        "desc": "EAGLE_CONFIRM 与 EAGLE_CHALLENGE 双开窗，挑战与确认条件重叠，可能同时触发。",
        "inputs": [
          {
            "name": "结算",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 100
      },
      "r12": {
        "location": [
          1030,
          460
        ],
        "width": 240,
        "name": "r12",
        "label": "未判罚项",
        "type": "待办",
        "desc": "触网未判罚；压线球被判出界；连击只靠入口前置拦截，无回看。",
        "inputs": [],
        "outputs": [],
        "height": 100
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "判决请求",
        "from_socket_identifier": "判决请求",
        "from_socket_type": "Event",
        "to_node": "r1",
        "to_socket": "判决请求",
        "to_socket_identifier": "判决请求",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r1",
        "from_socket": "阶段",
        "from_socket_identifier": "阶段",
        "from_socket_type": "Event",
        "to_node": "r2",
        "to_socket": "阶段",
        "to_socket_identifier": "阶段",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r2",
        "from_socket": "阶段",
        "from_socket_identifier": "阶段",
        "from_socket_type": "Event",
        "to_node": "r3",
        "to_socket": "阶段",
        "to_socket_identifier": "阶段",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r3",
        "from_socket": "发球就绪",
        "from_socket_identifier": "发球就绪",
        "from_socket_type": "Event",
        "to_node": "r4",
        "to_socket": "发球就绪",
        "to_socket_identifier": "发球就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r4",
        "from_socket": "发球就绪",
        "from_socket_identifier": "发球就绪",
        "from_socket_type": "Event",
        "to_node": "r5",
        "to_socket": "发球就绪",
        "to_socket_identifier": "发球就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r2",
        "from_socket": "阶段",
        "from_socket_identifier": "阶段",
        "from_socket_type": "Event",
        "to_node": "r7",
        "to_socket": "阶段",
        "to_socket_identifier": "阶段",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "碰撞事件",
        "from_socket_identifier": "碰撞事件",
        "from_socket_type": "Event",
        "to_node": "r6",
        "to_socket": "碰撞事件",
        "to_socket_identifier": "碰撞事件",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "碰撞事件",
        "from_socket_identifier": "碰撞事件",
        "from_socket_type": "Event",
        "to_node": "r8",
        "to_socket": "碰撞事件",
        "to_socket_identifier": "碰撞事件",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r8",
        "from_socket": "结算",
        "from_socket_identifier": "结算",
        "from_socket_type": "Event",
        "to_node": "r9",
        "to_socket": "结算",
        "to_socket_identifier": "结算",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r9",
        "from_socket": "结算",
        "from_socket_identifier": "结算",
        "from_socket_type": "Event",
        "to_node": "r10",
        "to_socket": "结算",
        "to_socket_identifier": "结算",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r9",
        "from_socket": "结算",
        "from_socket_identifier": "结算",
        "from_socket_type": "Event",
        "to_node": "r11",
        "to_socket": "结算",
        "to_socket_identifier": "结算",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r10",
        "from_socket": "比分阶段",
        "from_socket_identifier": "比分阶段",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "比分阶段",
        "to_socket_identifier": "比分阶段",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r2",
        "from_socket": "阶段",
        "from_socket_identifier": "阶段",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "比分阶段",
        "to_socket_identifier": "比分阶段",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/brule.js"];
