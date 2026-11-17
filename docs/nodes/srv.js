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
        "desc": "reg: _seq.etc 顺序发号(≥1000, 16 次尝试)或指定 d.userid; 最小写入: 用户行/seq 行均 dbUpsert 整行直写(含行内审计 op0), 模块级 seqHint 热缓存省 seq 查(冷 5 次/热 4 次), 撞号/认领失败才重读 seq 追赶且不写回踩号; claim 令牌 etc=Date.now():random 回读校验保留(非原子竞争唯一性)。默认 head/0.png、bag{head:1}、dollar:1; 返回 key=code.key(id)。显式注册=查存在+直写+回读 3 次。",
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
        "desc": "user/set/buy/bag/del 最小写入: 先 dbGet 旧行→内存合并→commitRow(字段+shield.append 审计)→dbUpsert 一次(1 查 1 写); bag 审计写失败不阻塞登录; del=1 查 1 删(行不存在无审计, IP 闸门兜底)。user 改名耗 1 金币(4)/签名免费; set 需 bag[head]≥1(3); buy 头像 −1 金币 bag++、dollar.png +5(仅测试)。错误码增 12=社交条件不满足。",
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
        "desc": "shield.js 行内审计(纯函数, 零 DB 操作): append/parse/makeRecord, 条目=13位ms+op 逗号分隔, 24h 裁剪+120 条上限, 随业务同一次 upsert 落用户行 history。op: 0 reg/1 user/2 bag/3 set/4 buy/6 friend(自己行)/8 score/9 mes clear; 5 del 遗留不再写。写别人行不追加对方 history(防刷爆受害者 USER_RATE_LIMITED)。并发末写覆盖丢条目为已知取舍(窗口 10s/20 次远大于丢失率)。遗留独立 __shield__ 行由 mag clean 一次性清理。",
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
        "desc": "db.js 门面: dbGet/dbPut/dbDel/dbList 保留 + 新增 dbUpsert(整行直写无内部读)/dbTop(orderByDesc 索引取前 N)/dbByIds(in 批量)。dbPut=读-合并-整行 upsert 仅兼容保留, 业务不再走(消灭二次读)。直连 CloudDB ~100ms。",
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
        "desc": "Worker agc.js getUserCallHistory: 改 EqualTo 主键点查用户行(limit 1)+解析 history 为 [{record}](24h 过滤), 替代旧 __shield__ 前缀扫描 ≤500 行; 行不存在→[](放行, te 自回 1); 查询失败抛错由调用方 fail-open 记录放行(行为不变)。每受闸请求 1 次点查。",
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
      },
      "sv17": {
        "location": [
          70,
          990
        ],
        "width": 270,
        "height": 170,
        "name": "sv17",
        "label": "DB 最小写入优化",
        "type": "流程",
        "desc": "已实施(本地验证): 最小写入契约落地——每请求单记录一查一写(del 一查一删), 审计合并 history 额外操作 0, reg 冷 5/热 4/显式 3, Worker 点查替代前缀扫描。离线 62+34 测试断言操作次数; 浏览器 18/18。并发末写覆盖/删行无审计/纯读不审计(IP 闸门兜底)为明示取舍。证据: 离线 node --test 62(注册契约)+34(社交/最小写入) 全过; tsc 新增错误 0(基线 card.ts:80/82); esbuild bundle 1098542B; Edge CDP 真实引擎页 18/18(local/social-verify.json, 截图 local/social-page.png)。边界: 部署未授权, te/Worker/mag 改动仅本地, 线上 E2E 待授权部署后补; 并发读-合并-写末写覆盖(审计丢条目)为已知取舍; CDN token 过期 400 与 nor 缺 girl/au/hit.MP3 属既有环境问题。",
        "inputs": [
          {
            "name": "DB门面",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "审计合并",
            "type": "Event"
          },
          {
            "name": "最小写入",
            "type": "Event"
          }
        ],
        "use_custom_color": true,
        "color": [
          0.3,
          0.7,
          0.45
        ]
      },
      "sv18": {
        "location": [
          390,
          990
        ],
        "width": 270,
        "height": 170,
        "name": "sv18",
        "label": "社交 API(te 分支)",
        "type": "代码",
        "desc": "已实施(本地验证, 待部署): te 新增 find/profiles/friend(request|accept|reject|remove)/msg/sync/mes(clear)/rank/score。数据落 NG 既有字段 social/mes/record/level; 容量 200 好友/50 申请/50 消息/200 字/10 recent; score 30s 冷却; rank orderByDesc(level)≤50; 条件不满足 code 12+msg; 认证仍 keyOk 纯计算。客户端 social.ts+SocialPage 接线, 结算 badm.onMatchEnded 上报。证据: 离线 node --test 62(注册契约)+34(社交/最小写入) 全过; tsc 新增错误 0(基线 card.ts:80/82); esbuild bundle 1098542B; Edge CDP 真实引擎页 18/18(local/social-verify.json, 截图 local/social-page.png)。边界: 部署未授权, te/Worker/mag 改动仅本地, 线上 E2E 待授权部署后补; 并发读-合并-写末写覆盖(审计丢条目)为已知取舍; CDN token 过期 400 与 nor 缺 girl/au/hit.MP3 属既有环境问题。",
        "inputs": [
          {
            "name": "身份可信",
            "type": "Event"
          },
          {
            "name": "最小写入",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "社交数据",
            "type": "Event"
          }
        ],
        "use_custom_color": true,
        "color": [
          0.48,
          0.38,
          0.75
        ]
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
      },
      {
        "from_node": "sv11",
        "from_socket": "CloudDB",
        "from_socket_identifier": "CloudDB",
        "from_socket_type": "Event",
        "to_node": "sv17",
        "to_socket": "DB门面",
        "to_socket_identifier": "DB门面",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv17",
        "from_socket": "审计合并",
        "from_socket_identifier": "审计合并",
        "from_socket_type": "Event",
        "to_node": "sv10",
        "to_socket": "资料就绪",
        "to_socket_identifier": "资料就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv17",
        "from_socket": "最小写入",
        "from_socket_identifier": "最小写入",
        "from_socket_type": "Event",
        "to_node": "sv18",
        "to_socket": "最小写入",
        "to_socket_identifier": "最小写入",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv5",
        "from_socket": "身份可信",
        "from_socket_identifier": "身份可信",
        "from_socket_type": "Event",
        "to_node": "sv18",
        "to_socket": "身份可信",
        "to_socket_identifier": "身份可信",
        "to_socket_type": "Event"
      },
      {
        "from_node": "sv18",
        "from_socket": "社交数据",
        "from_socket_identifier": "社交数据",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "社交数据",
        "to_socket_identifier": "社交数据",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/srv.js"];
