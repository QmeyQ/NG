window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/srv.js"]={
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
  "node_tree": {
    "name": "服务端后端 子树",
    "nodes": {
      "sv1": {
        "location": [
          70,
          70
        ],
        "width": 240,
        "name": "sv1",
        "label": "Worker 入口 index.js",
        "type": "代码",
        "desc": "Cloudflare Worker（www.normalgame.cn）。路由：/js/* 静态资源、GET /health、/gobe/debug、POST /token(注册/校验)、/gobe/token、POST /|/call|/function 云函数代理；统一信封 {code,msg,wv}；先 IP gate 再路由，/te.reg 被拦( code 9 )强制走 /token。无 D1/KV/R2，风控状态在内存。",
        "inputs": [
          {
            "name": "云端请求",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "路由分发",
            "type": "Event"
          }
        ],
        "height": 150
      },
      "sv2": {
        "location": [
          390,
          70
        ],
        "width": 240,
        "name": "sv2",
        "label": "IP 风控 risk.js",
        "type": "风险",
        "desc": "内存滑动窗口：20 次/10s 触发阶梯封禁(10s…90s+30s)，每日重置，整月每日滥用→永久；注册配额 5/IP/日(UTC+8)；userHistoryGate 基于 CloudDB 审计历史裁决(USER_RATE_LIMITED，fail-closed)。隔离重启即丢失。",
        "inputs": [
          {
            "name": "路由分发",
            "type": "Event"
          },
          {
            "name": "历史裁决",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "放行",
            "type": "Event"
          },
          {
            "name": "拦截",
            "type": "Event"
          }
        ],
        "height": 160,
        "use_custom_color": true,
        "color": [
          0.85,
          0.28,
          0.3
        ]
      },
      "sv3": {
        "location": [
          710,
          70
        ],
        "width": 240,
        "name": "sv3",
        "label": "AGC 代理 SDK agc/*",
        "type": "代码",
        "desc": "Worker 自实现 AGC SDK：credential 解析服务端凭据(AGC_CREDENTIAL)，tokenService 取 accesstoken(提前 2min 刷新/并发去重/多网关回退)，functionService.callFunction Bearer 代理到 AGC 云函数(≤55s)。CN 网关屏蔽 CF 出口(501)→回退 SG/RU/DE。",
        "inputs": [
          {
            "name": "放行",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "云函数调用",
            "type": "Event"
          }
        ],
        "height": 150
      },
      "sv4": {
        "location": [
          1030,
          70
        ],
        "width": 240,
        "name": "sv4",
        "label": "云函数入口 te/user.js",
        "type": "代码",
        "desc": "单一 handler，body {t,d}(接受字符串或对象)。无 DB 分支 agt/gt/gprobe；DB 分支 reg/user/bag/set/buy/del。响应恒为 {code, v:\"v1107a\", ...}。reg 与 bag(d.gt=1) 内联下发 gobe 凭据。",
        "inputs": [
          {
            "name": "云函数调用",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "鉴权",
            "type": "Event"
          }
        ],
        "height": 150
      },
      "sv5": {
        "location": [
          70,
          300
        ],
        "width": 240,
        "name": "sv5",
        "label": "鉴权 code.js",
        "type": "规则",
        "desc": "确定性密钥：key = sha256(SALT + \"\\0\" + userid).hex.slice(0,32)，SALT 仅服务端；keyOk 常量时间比较，永不查库(不再读写 secret 列)。",
        "inputs": [
          {
            "name": "鉴权",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "身份可信",
            "type": "Event"
          }
        ],
        "height": 130
      },
      "sv6": {
        "location": [
          390,
          300
        ],
        "width": 240,
        "name": "sv6",
        "label": "注册 reg",
        "type": "流程",
        "desc": "_seq.etc 顺序发号(≥1000，16 次尝试)或指定 d.userid；写 claim 令牌 etc=Date.now():random 后回读，back.etc===claim 才赢得非原子竞争；默认 head/head/0.png、bag{head:1}、dollar:1、flag 默认签名；返回 key=code.key(id)。",
        "inputs": [
          {
            "name": "身份可信",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "用户记录",
            "type": "Event"
          }
        ],
        "height": 150
      },
      "sv7": {
        "location": [
          710,
          300
        ],
        "width": 240,
        "name": "sv7",
        "label": "资料 user/set/buy/bag/del",
        "type": "流程",
        "desc": "user 改名耗 1 金币(4)、签名免费；set 头像需 bag[head]≥1，扣减/删除(3)；buy 头像道具 −1 金币且 bag++、dollar.png +5(仅测试)；bag 拉背包(d.gt=1 附带 gobe)；del 删号。每次成功调 shield.record。",
        "inputs": [
          {
            "name": "用户记录",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "资料就绪",
            "type": "Event"
          },
          {
            "name": "账号资料",
            "type": "Event"
          }
        ],
        "height": 160
      },
      "sv8": {
        "location": [
          1030,
          300
        ],
        "width": 240,
        "name": "sv8",
        "label": "错误码约定",
        "type": "数据",
        "desc": "0 成功 / 1 用户不存在 / 2 key 失效 / 3 背包数量不足 / 4 金币不足 / 5 参数或存储或内部 / 6 已注册 / 11 GOBE 上游失败(可重试)。te/user.js 统一返回。",
        "inputs": [
          {
            "name": "资料就绪",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 140
      },
      "sv9": {
        "location": [
          70,
          530
        ],
        "width": 240,
        "name": "sv9",
        "label": "GOBE 凭据 gobe.js",
        "type": "流程",
        "desc": "grant_type=client_credentials(useJwt:0) 换 GOBE token；网关 drcn→dra→drru→dre 顺序、8s 超时；缓存 {token,expireAt,gateway}(提前 120s 刷新、pending 去重)。在函数内执行以绕开 CN 网关对 CF 的 501；失败仅省略 gobe 字段，登录/注册照常成功。",
        "inputs": [
          {
            "name": "资料就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "GOBE 凭据",
            "type": "Event"
          }
        ],
        "height": 160
      },
      "sv10": {
        "location": [
          390,
          530
        ],
        "width": 240,
        "name": "sv10",
        "label": "审计 shield.js",
        "type": "数据",
        "desc": "每次成功写一行：id __shield__<userid>__<13位ms><op>__<6随机字节hex>，record=ts+op(每操作一行避免追加覆盖)。op：0 reg/1 user/2 bag/3 set/4 buy/5 del。zone User，保留 24h，前缀查询惰性清理(MAX_SCAN 500)。",
        "inputs": [
          {
            "name": "资料就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "审计行",
            "type": "Event"
          }
        ],
        "height": 150
      },
      "sv11": {
        "location": [
          710,
          530
        ],
        "width": 240,
        "name": "sv11",
        "label": "DB 门面 te/db.js",
        "type": "代码",
        "desc": "dbGet/dbPut/dbDel/dbList、dbErr()、dbOk。dbPut = 读-合并-整行 upsert(非原子)。直连 CloudDB 取代旧 Worker→cloudb 回环(2-5s→~100ms)。",
        "inputs": [
          {
            "name": "用户记录",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "CloudDB",
            "type": "Event"
          }
        ],
        "height": 130
      },
      "sv12": {
        "location": [
          1030,
          530
        ],
        "width": 240,
        "name": "sv12",
        "label": "CloudDB 封装 & NG 对象",
        "type": "数据",
        "desc": "CloudDBZoneWrapper 从 resources/agc-apiclient json 初始化、按 zone 缓存客户端、lastError() 诊断；executeQueryById/ByIdPrefix(beginsWith，limit 1-1000)/All/Upsert/Delete。NG 对象：PK id，dollar(Integer)，name/flag/bag(JSON)/head/secret/pass/social/history/record/etc(String)；zone User。",
        "inputs": [
          {
            "name": "CloudDB",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 160
      },
      "sv13": {
        "location": [
          70,
          760
        ],
        "width": 240,
        "name": "sv13",
        "label": "风控回读 agc.js",
        "type": "规则",
        "desc": "Worker 侧直连 CloudDB REST(connect-api…/v4/objects/queries，zone User/type NG) 读取 __shield__<userid>__ 审计行(24h，limit 500)，供 risk.userHistoryGate 裁决。与 mag 内嵌 SDK 是不同传输。",
        "inputs": [
          {
            "name": "审计行",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "历史裁决",
            "type": "Event"
          }
        ],
        "height": 140
      },
      "sv14": {
        "location": [
          390,
          760
        ],
        "width": 240,
        "name": "sv14",
        "label": "管理云函数 mag.js",
        "type": "代码",
        "desc": "独立 AGC 函数 mag.myHandler。t：login/list/get/set(含 dollar 金币 0–1e8)/bag(≤0 删除)/del/passwd/shell(execSync 任意命令)。token=sha256(MAG_SALT+account)，管理员行 mag:admin(默认 1/1)，内存登录锁(5 次失败封 1h)。经 Worker / 代理，无 userid 故跳过 history gate。",
        "inputs": [
          {
            "name": "管理请求",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "CloudDB",
            "type": "Event"
          }
        ],
        "height": 170
      },
      "sv15": {
        "location": [
          710,
          760
        ],
        "width": 240,
        "name": "sv15",
        "label": "管理后台 UI magh",
        "type": "流程",
        "desc": "浏览器 admin(magh/web)。API_BASE=https://www.normalgame.cn/；call(t,d)→POST {name:\"mag\",data:{t,d}}；sessionStorage 存 token；用户列表/搜索/编辑、背包 +/−/增删、删用户、改密、shell 终端。",
        "inputs": [
          {
            "name": "管理入口",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "管理请求",
            "type": "Event"
          }
        ],
        "height": 150
      },
      "sv16": {
        "location": [
          1030,
          760
        ],
        "width": 240,
        "name": "sv16",
        "label": "遗留 CRUD cloudb.js",
        "type": "待办",
        "desc": "db/cloudb.js 旧通用 CRUD 云函数(action get/put/del/list，extraData{id,zone,...FIELDS}，仅 0/5，无 key 校验)。已被 te/db.js 直连 CloudDB 取代，保留待清理。",
        "inputs": [],
        "outputs": [],
        "height": 130
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "云端请求",
        "from_socket_identifier": "云端请求",
        "from_socket_type": "Event",
        "to_node": "sv1",
        "to_socket": "云端请求",
        "to_socket_identifier": "云端请求",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv1",
        "from_socket": "路由分发",
        "from_socket_identifier": "路由分发",
        "from_socket_type": "Event",
        "to_node": "sv2",
        "to_socket": "路由分发",
        "to_socket_identifier": "路由分发",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv2",
        "from_socket": "放行",
        "from_socket_identifier": "放行",
        "from_socket_type": "Event",
        "to_node": "sv3",
        "to_socket": "放行",
        "to_socket_identifier": "放行",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv3",
        "from_socket": "云函数调用",
        "from_socket_identifier": "云函数调用",
        "from_socket_type": "Event",
        "to_node": "sv4",
        "to_socket": "云函数调用",
        "to_socket_identifier": "云函数调用",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv4",
        "from_socket": "鉴权",
        "from_socket_identifier": "鉴权",
        "from_socket_type": "Event",
        "to_node": "sv5",
        "to_socket": "鉴权",
        "to_socket_identifier": "鉴权",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv5",
        "from_socket": "身份可信",
        "from_socket_identifier": "身份可信",
        "from_socket_type": "Event",
        "to_node": "sv6",
        "to_socket": "身份可信",
        "to_socket_identifier": "身份可信",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv6",
        "from_socket": "用户记录",
        "from_socket_identifier": "用户记录",
        "from_socket_type": "Event",
        "to_node": "sv7",
        "to_socket": "用户记录",
        "to_socket_identifier": "用户记录",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv6",
        "from_socket": "用户记录",
        "from_socket_identifier": "用户记录",
        "from_socket_type": "Event",
        "to_node": "sv11",
        "to_socket": "用户记录",
        "to_socket_identifier": "用户记录",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv7",
        "from_socket": "资料就绪",
        "from_socket_identifier": "资料就绪",
        "from_socket_type": "Event",
        "to_node": "sv8",
        "to_socket": "资料就绪",
        "to_socket_identifier": "资料就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv7",
        "from_socket": "资料就绪",
        "from_socket_identifier": "资料就绪",
        "from_socket_type": "Event",
        "to_node": "sv9",
        "to_socket": "资料就绪",
        "to_socket_identifier": "资料就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv7",
        "from_socket": "资料就绪",
        "from_socket_identifier": "资料就绪",
        "from_socket_type": "Event",
        "to_node": "sv10",
        "to_socket": "资料就绪",
        "to_socket_identifier": "资料就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv7",
        "from_socket": "账号资料",
        "from_socket_identifier": "账号资料",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "账号资料",
        "to_socket_identifier": "账号资料",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv9",
        "from_socket": "GOBE 凭据",
        "from_socket_identifier": "GOBE 凭据",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "GOBE 凭据",
        "to_socket_identifier": "GOBE 凭据",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv10",
        "from_socket": "审计行",
        "from_socket_identifier": "审计行",
        "from_socket_type": "Event",
        "to_node": "sv13",
        "to_socket": "审计行",
        "to_socket_identifier": "审计行",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv11",
        "from_socket": "CloudDB",
        "from_socket_identifier": "CloudDB",
        "from_socket_type": "Event",
        "to_node": "sv12",
        "to_socket": "CloudDB",
        "to_socket_identifier": "CloudDB",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv13",
        "from_socket": "历史裁决",
        "from_socket_identifier": "历史裁决",
        "from_socket_type": "Event",
        "to_node": "sv2",
        "to_socket": "历史裁决",
        "to_socket_identifier": "历史裁决",
        "to_socket_type": "Event"
      },
      {
        "from_node": "__group_in__",
        "from_socket": "管理入口",
        "from_socket_identifier": "管理入口",
        "from_socket_type": "Event",
        "to_node": "sv15",
        "to_socket": "管理入口",
        "to_socket_identifier": "管理入口",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv15",
        "from_socket": "管理请求",
        "from_socket_identifier": "管理请求",
        "from_socket_type": "Event",
        "to_node": "sv14",
        "to_socket": "管理请求",
        "to_socket_identifier": "管理请求",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv14",
        "from_socket": "CloudDB",
        "from_socket_identifier": "CloudDB",
        "from_socket_type": "Event",
        "to_node": "sv12",
        "to_socket": "CloudDB",
        "to_socket_identifier": "CloudDB",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/srv.js"];
