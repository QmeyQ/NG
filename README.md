# NG · Badminton3D

LayaAir 羽毛球游戏（微信小游戏 + Web 双端），单机 PVE 与华为 GOBE 实时对战 PVP。

## 项目规划文档（在线可交互）

整个项目是一份节点文档：平台侧的启动、选局、账号、社交、服务端与 AI 开发辅助，以及羽毛球比赛的完整实现，全部在同一棵树里，逐层双击下钻。

- 在线查看：<https://qmeyq.github.io/NG/node-workflow.html>
- 离线查看：在仓库根目录执行 `python -m http.server`，再打开 `http://localhost:8000/docs/node-workflow.html`
- 深链直达某一组 / 某个节点：`node-workflow.html#bmb/bpvp`（分组键逐层用 `/` 分隔，末段可以是普通节点，打开即选中并居中）

操作方式：

- 拖动 / 滚轮缩放画布，双击任意分组进入其子树
- 进入分组后左右两侧有「组输入 / 组输出」镜像节点，能看到数据从哪进、从哪出
- 单击节点查看属性、描述与端口定义；拖动节点底边可拉高
- 面包屑可回退到任意上层，地址栏 `#` 随之更新，可直接复制分享
- 「导出」可下载整包 ZIP：全工程 `index.js` + 每个节点的独立 `nodes/*.js`

## 项目首页（静态快照）

下面这块 HTML 由 `node tool/docsstatic.cjs` 从 `docs/index.js` + `docs/nodes/*.js` 生成，是交互版首页的静态副本：分组、说明、子节点与连线一一对应。所有链接都指向 Pages 上的文档（分组名 → 交互版对应位置，「原始链接」列 → 该节点的数据文件），链接文字与 `title` 里保留了仓库内的原始相对路径。改完文档数据后重跑该脚本即可刷新，`--check` 可校验是否过期。

<!-- DOCS-HOME:BEGIN 由 node tool/docsstatic.cjs 生成，勿手改 -->
<div align="center">
  <b>项目规划 · 首页静态快照</b><br>
  <sub>12 个分组 · 210 个节点 · 29 个数据文件 · 生成于 2026-11-07</sub><br>
  <sub>交互版 <a href="https://qmeyq.github.io/NG/node-workflow.html" title="原链接：docs/node-workflow.html">node-workflow.html</a> · 数据源 <a href="https://qmeyq.github.io/NG/index.js" title="原链接：docs/index.js">index.js</a> · 双击分组可继续下钻</sub>
</div>

<p><b>主干</b>：<a href="https://qmeyq.github.io/NG/node-workflow.html#pstart">启动与隐私</a> → <a href="https://qmeyq.github.io/NG/node-workflow.html#pmenu">主菜单</a> → <a href="https://qmeyq.github.io/NG/node-workflow.html#pselect">游戏大厅 / 选局</a> → <a href="https://qmeyq.github.io/NG/node-workflow.html#pmatch">匹配与加载</a> → <a href="https://qmeyq.github.io/NG/node-workflow.html#bmb">羽毛球游戏</a></p>

<table>
  <thead><tr><th align="left">分组</th><th align="left">内容</th><th>节点</th><th align="left">原始链接</th></tr></thead>
  <tbody>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pstart" title="进入分组 pstart"><b>启动与隐私</b></a><br><sub><code>pstart</code></sub></td>
      <td>index.ts 启动链：启动页 → 隐私协议 → 资源版本检查 → 下载/恢复 → 进入主菜单。</td>
      <td align="center"><a href="https://qmeyq.github.io/NG/node-workflow.html#pstart">5</a><br><sub>0 组</sub></td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pstart.js" title="原链接：docs/nodes/pstart.js"><code>nodes/pstart.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmenu" title="进入分组 pmenu"><b>主菜单</b></a><br><sub><code>pmenu</code></sub></td>
      <td>menu.ls 预制体：item0~4 五页（首页/商店/社交/我的/设置），Controller c0 切页；负责玩法入口分发。</td>
      <td align="center"><a href="https://qmeyq.github.io/NG/node-workflow.html#pmenu">6</a><br><sub>0 组</sub></td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pmenu.js" title="原链接：docs/nodes/pmenu.js"><code>nodes/pmenu.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pselect" title="进入分组 pselect"><b>游戏大厅 / 选局</b></a><br><sub><code>pselect</code></sub></td>
      <td>slecet.ts：游戏列表、账号校验、nor 资源检查；选中羽毛球后进入匹配页。其他条目统一提示未开放。</td>
      <td align="center"><a href="https://qmeyq.github.io/NG/node-workflow.html#pselect">6</a><br><sub>0 组</sub></td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pselect.js" title="原链接：docs/nodes/pselect.js"><code>nodes/pselect.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmatch" title="进入分组 pmatch"><b>匹配与加载</b></a><br><sub><code>pmatch</code></sub></td>
      <td>load.ts：恢复会话 → Gnet 初始化 → 随机匹配 → role_assign 协商 → 跳 game/badm.ls；PVE 走 pve/pve2 直进。</td>
      <td align="center"><a href="https://qmeyq.github.io/NG/node-workflow.html#pmatch">8</a><br><sub>0 组</sub></td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pmatch.js" title="原链接：docs/nodes/pmatch.js"><code>nodes/pmatch.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pcloud" title="进入分组 pcloud"><b>账号与云服务</b></a><br><sub><code>pcloud</code></sub></td>
      <td>Cloud 用户体系 + 云函数 + AGC/GOBE token。本地乐观更新、云端权威覆盖，失败不阻塞主流程。</td>
      <td align="center"><a href="https://qmeyq.github.io/NG/node-workflow.html#pcloud">9</a><br><sub>0 组</sub></td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pcloud.js" title="原链接：docs/nodes/pcloud.js"><code>nodes/pcloud.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#psocial" title="进入分组 psocial"><b>社交模块（规划）</b></a><br><sub><code>psocial</code></sub></td>
      <td>整块未开发：主菜单社交页只有占位文案，无好友/聊天/排行/分享的任何代码与数据结构。</td>
      <td align="center"><a href="https://qmeyq.github.io/NG/node-workflow.html#psocial">5</a><br><sub>0 组</sub></td>
      <td><a href="https://qmeyq.github.io/NG/nodes/psocial.js" title="原链接：docs/nodes/psocial.js"><code>nodes/psocial.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pgame" title="进入分组 pgame"><b>其他小游戏（规划）</b></a><br><sub><code>pgame</code></sub></td>
      <td>游戏列表里只有 index 0（羽毛球）可进入；其余条目点击统一 toast 未开放，无任何场景与资源包。</td>
      <td align="center"><a href="https://qmeyq.github.io/NG/node-workflow.html#pgame">3</a><br><sub>0 组</sub></td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pgame.js" title="原链接：docs/nodes/pgame.js"><code>nodes/pgame.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pres" title="进入分组 pres"><b>资源与存储</b></a><br><sub><code>pres</code></sub></td>
      <td>nor / ui / game 三级分包，版本比对、下载解压、进度预测与本地缓存（Web IndexedDB / 微信 kv+file）。</td>
      <td align="center"><a href="https://qmeyq.github.io/NG/node-workflow.html#pres">6</a><br><sub>0 组</sub></td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pres.js" title="原链接：docs/nodes/pres.js"><code>nodes/pres.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pplat" title="进入分组 pplat"><b>平台适配</b></a><br><sub><code>pplat</code></sub></td>
      <td>微信/Web 差异、音频解锁、场景导航与本地设置；是平台层的横切能力。</td>
      <td align="center"><a href="https://qmeyq.github.io/NG/node-workflow.html#pplat">5</a><br><sub>0 组</sub></td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pplat.js" title="原链接：docs/nodes/pplat.js"><code>nodes/pplat.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#bmb" title="进入分组 bmb"><b>羽毛球游戏</b></a><br><sub><code>bmb</code></sub></td>
      <td>首个已上线的完整玩法。双击进入后是比赛侧的全部结构：入口装配、Mag、规则、PVP/PVE、联网、物理、碰撞、对象、输入、AI、UI 与已知问题。</td>
      <td align="center"><a href="https://qmeyq.github.io/NG/node-workflow.html#bmb">117</a><br><sub>16 组</sub></td>
      <td><a href="https://qmeyq.github.io/NG/nodes/bmb.js" title="原链接：docs/nodes/bmb.js"><code>nodes/bmb.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv" title="进入分组 srv"><b>服务端后端</b></a><br><sub><code>srv</code></sub></td>
      <td>Cloudflare Worker(www.normalgame.cn) 网关 + 自实现 AGC 代理 SDK + IP/历史风控；AGC 云函数 te/user.js(用户体系/发号/商店) 与 gobe.js(GOBE 凭据)、shield.js(审计)、db.js→CloudDB(NG/User)；独立管理后台 mag/magh。客户端 pcloud 经此完成注册/资料/联机凭据。</td>
      <td align="center"><a href="https://qmeyq.github.io/NG/node-workflow.html#srv">16</a><br><sub>0 组</sub></td>
      <td><a href="https://qmeyq.github.io/NG/nodes/srv.js" title="原链接：docs/nodes/srv.js"><code>nodes/srv.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#aidev" title="进入分组 aidev"><b>AI 开发辅助</b></a><br><sub><code>aidev</code></sub></td>
      <td>AI 开发闭环：web-api+tool 浏览器自动化把网页 AI 转 OpenAI 兼容 API(含工具调用中继) → com.layabox.mcp 在 LayaAir IDE 起 SSE MCP(动态 tool/prompt、跨进程回调) → AI 自动编译 → 自动运行 web → 浏览器自动测试 → 自动服务端配置 → 自动上传/发布，测试反馈回灌形成迭代。</td>
      <td align="center"><a href="https://qmeyq.github.io/NG/node-workflow.html#aidev">12</a><br><sub>0 组</sub></td>
      <td><a href="https://qmeyq.github.io/NG/nodes/aidev.js" title="原链接：docs/nodes/aidev.js"><code>nodes/aidev.js</code></a></td>
    </tr>
  </tbody>
</table>

<details>
<summary><b>启动与隐私</b> · 5 个节点 · <a href="https://qmeyq.github.io/NG/node-workflow.html#pstart" title="进入分组 pstart">在交互版中打开</a></summary>

<table>
  <thead><tr><th align="left">节点</th><th>类型</th><th align="left">说明</th><th align="left">原始链接</th></tr></thead>
  <tbody>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pstart/i1">启动页 index.ts</a><br><sub><code>i1</code></sub></td>
      <td align="center"><sub>代码</sub></td>
      <td>初始化 Dialog / Res / SceneNav，绑定资源进度事件，初始化隐私协议复选框。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pstart.js" title="原链接：docs/nodes/pstart.js"><code>nodes/pstart.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pstart/i2">隐私协议弹窗</a><br><sub><code>i2</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>Dialog.showD 弹协议；同意→写本地标记继续；拒绝→退出或撤回许可。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pstart.js" title="原链接：docs/nodes/pstart.js"><code>nodes/pstart.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pstart/i3">资源版本检查</a><br><sub><code>i3</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>Res.vers('ui'/'nor') 比对版本；需更新则提示下载，失败红条提示并重试。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pstart.js" title="原链接：docs/nodes/pstart.js"><code>nodes/pstart.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pstart/i4">下载与本地恢复</a><br><sub><code>i4</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>Res.url 下载解压（DP/XP 进度），或从 IndexedDB / 微信 kv 恢复已有资源。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pstart.js" title="原链接：docs/nodes/pstart.js"><code>nodes/pstart.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pstart/i5">进入主菜单</a><br><sub><code>i5</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>SceneNav.open('ui/menu.ls')；加载失败清缓存自愈重试。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pstart.js" title="原链接：docs/nodes/pstart.js"><code>nodes/pstart.js</code></a></td>
    </tr>
  </tbody>
</table>

</details>

<details>
<summary><b>主菜单</b> · 6 个节点 · <a href="https://qmeyq.github.io/NG/node-workflow.html#pmenu" title="进入分组 pmenu">在交互版中打开</a></summary>

<table>
  <thead><tr><th align="left">节点</th><th>类型</th><th align="left">说明</th><th align="left">原始链接</th></tr></thead>
  <tbody>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmenu/m1">菜单场景结构</a><br><sub><code>m1</code></sub></td>
      <td align="center"><sub>代码</sub></td>
      <td>ui/menu.ls：item0~4 + Controller(c0) + 底部页码；保存 musicOn/sfxOn/hitShow/double 开关。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pmenu.js" title="原链接：docs/nodes/pmenu.js"><code>nodes/pmenu.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmenu/m2">首页与游戏入口</a><br><sub><code>m2</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>从 Res.getList('ui') 的 main/game/ 图片生成游戏列表；点击进选局。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pmenu.js" title="原链接：docs/nodes/pmenu.js"><code>nodes/pmenu.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmenu/m3">商店页</a><br><sub><code>m3</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>loadShop 渲染头像与金币商品；onBuy→Cloud.buy；金币商品标注『仅测试使用』。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pmenu.js" title="原链接：docs/nodes/pmenu.js"><code>nodes/pmenu.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmenu/m4">社交页（占位）</a><br><sub><code>m4</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>item2 仅有『暂未开放，敬请期待』文案，无好友/排行/分享逻辑。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pmenu.js" title="原链接：docs/nodes/pmenu.js"><code>nodes/pmenu.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmenu/m5">我的页</a><br><sub><code>m5</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>昵称/签名编辑（各 1 金币）、头像选择、背包；Cloud.update / setHead / loadBag。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pmenu.js" title="原链接：docs/nodes/pmenu.js"><code>nodes/pmenu.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmenu/m6">设置页</a><br><sub><code>m6</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>音乐/音效/击球显示/单手模式开关；清除数据走 Cloud.del + clearLocal。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pmenu.js" title="原链接：docs/nodes/pmenu.js"><code>nodes/pmenu.js</code></a></td>
    </tr>
  </tbody>
</table>

</details>

<details>
<summary><b>游戏大厅 / 选局</b> · 6 个节点 · <a href="https://qmeyq.github.io/NG/node-workflow.html#pselect" title="进入分组 pselect">在交互版中打开</a></summary>

<table>
  <thead><tr><th align="left">节点</th><th>类型</th><th align="left">说明</th><th align="left">原始链接</th></tr></thead>
  <tbody>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pselect/s1">选局界面结构</a><br><sub><code>s1</code></sub></td>
      <td align="center"><sub>代码</sub></td>
      <td>GPanel + Controller(c0) + GList，item0~4 切页；游戏图来自 ui 包 main/game/。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pselect.js" title="原链接：docs/nodes/pselect.js"><code>nodes/pselect.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pselect/s2">列表渲染与判定</a><br><sub><code>s2</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>onListRender 用 childIndexToItemIndex 实时取 _selIdx；index 0 为羽毛球。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pselect.js" title="原链接：docs/nodes/pselect.js"><code>nodes/pselect.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pselect/s3">羽毛球入口</a><br><sub><code>s3</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>_checkNorAndJump()：nor 包就绪→_jumpGame() 打开 nor/match/match.ls。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pselect.js" title="原链接：docs/nodes/pselect.js"><code>nodes/pselect.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pselect/s4">其他游戏占位</a><br><sub><code>s4</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>index&gt;0 点击统一 Dialog.toast('暂未开放，敬请期待')。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pselect.js" title="原链接：docs/nodes/pselect.js"><code>nodes/pselect.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pselect/s5">账号校验 verifyUser</a><br><sub><code>s5</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>Cloud.verify：ok→initGobe；gone→重新注册；limited→toast；err 静默。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pselect.js" title="原链接：docs/nodes/pselect.js"><code>nodes/pselect.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pselect/s6">nor 包检查与下载</a><br><sub><code>s6</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>Res.net.cGet / Res.vers 判定；提示下载并用 DP 进度更新；失败红条重试。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pselect.js" title="原链接：docs/nodes/pselect.js"><code>nodes/pselect.js</code></a></td>
    </tr>
  </tbody>
</table>

</details>

<details>
<summary><b>匹配与加载</b> · 8 个节点 · <a href="https://qmeyq.github.io/NG/node-workflow.html#pmatch" title="进入分组 pmatch">在交互版中打开</a></summary>

<table>
  <thead><tr><th align="left">节点</th><th>类型</th><th align="left">说明</th><th align="left">原始链接</th></tr></thead>
  <tbody>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmatch/l1">匹配页场景</a><br><sub><code>l1</code></sub></td>
      <td align="center"><sub>代码</sub></td>
      <td>nor/match/match.ls：Button 匹配、bButton 返回、pve / pve2 单机入口。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pmatch.js" title="原链接：docs/nodes/pmatch.js"><code>nodes/pmatch.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmatch/l2">会话恢复 onSceneShow</a><br><sub><code>l2</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>openId=Cloud.getUser().userid；状态归零，优先恢复既有 GOBE 会话/房间，不自动匹配。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pmatch.js" title="原链接：docs/nodes/pmatch.js"><code>nodes/pmatch.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmatch/l3">Gnet 初始化</a><br><sub><code>l3</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>NetBoot.ensure 取 accesstoken、加载 GOBE SDK、绑定 client/room 事件；失败重试。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pmatch.js" title="原链接：docs/nodes/pmatch.js"><code>nodes/pmatch.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmatch/l4">随机匹配 / 取消</a><br><sub><code>l4</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>Gnet 随机匹配；isMatching + _armMatchWait 看门狗；中心按钮支持取消与重匹配。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pmatch.js" title="原链接：docs/nodes/pmatch.js"><code>nodes/pmatch.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmatch/l5">角色指派协商</a><br><sub><code>l5</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>房主单源生成 role_assign，各端 role_ack；收齐 first/final/okplay 得 _finalAssignment。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pmatch.js" title="原链接：docs/nodes/pmatch.js"><code>nodes/pmatch.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmatch/l6">PVE 入口</a><br><sub><code>l6</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>pve→_jumpPve(2) 1v1；pve2→_jumpPve(4) 2v2；跳过联网。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pmatch.js" title="原链接：docs/nodes/pmatch.js"><code>nodes/pmatch.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmatch/l7">进入比赛场景</a><br><sub><code>l7</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>SceneNav.open('game/badm.ls')；文件头注释提示 uuid 通道断链。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pmatch.js" title="原链接：docs/nodes/pmatch.js"><code>nodes/pmatch.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmatch/l8">断线重连与错误码</a><br><sub><code>l8</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>101106/104101 置 _roomRecoveryRequired；_scheduleReconnect 退避；监听 online/offline。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pmatch.js" title="原链接：docs/nodes/pmatch.js"><code>nodes/pmatch.js</code></a></td>
    </tr>
  </tbody>
</table>

</details>

<details>
<summary><b>账号与云服务</b> · 9 个节点 · <a href="https://qmeyq.github.io/NG/node-workflow.html#pcloud" title="进入分组 pcloud">在交互版中打开</a></summary>

<table>
  <thead><tr><th align="left">节点</th><th>类型</th><th align="left">说明</th><th align="left">原始链接</th></tr></thead>
  <tbody>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pcloud/c1">用户模型 CloudUser</a><br><sub><code>c1</code></sub></td>
      <td align="center"><sub>数据</sub></td>
      <td>name/flag/head/userid/dollar/bag；IDB 存用户记录，后台自动注册。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pcloud.js" title="原链接：docs/nodes/pcloud.js"><code>nodes/pcloud.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pcloud/c2">init / verify / reg</a><br><sub><code>c2</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>Cloud.init 回调 from=local|cloud；verify 成功补资料；gone 时 reregister()。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pcloud.js" title="原链接：docs/nodes/pcloud.js"><code>nodes/pcloud.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pcloud/c3">update 昵称/签名</a><br><sub><code>c3</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>各消耗 1 金币；返回码 2 登录失效、4 金币不足，失败回滚输入。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pcloud.js" title="原链接：docs/nodes/pcloud.js"><code>nodes/pcloud.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pcloud/c4">setHead 头像</a><br><sub><code>c4</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>校验拥有数量；未拥有 toast『未拥有』，数量不足回码 3。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pcloud.js" title="原链接：docs/nodes/pcloud.js"><code>nodes/pcloud.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pcloud/c5">buy 商店购买</a><br><sub><code>c5</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>头像商品与金币商品（+5，仅测试）；Cloud.buy 失败回滚余额。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pcloud.js" title="原链接：docs/nodes/pcloud.js"><code>nodes/pcloud.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pcloud/c6">loadBag 背包</a><br><sub><code>c6</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>拉取拥有物品，用于头像弹窗与我的页背包列表。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pcloud.js" title="原链接：docs/nodes/pcloud.js"><code>nodes/pcloud.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pcloud/c7">del / clearLocal</a><br><sub><code>c7</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>清除账号与本地缓存，随后 SceneNav.reset 回到加载页。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pcloud.js" title="原链接：docs/nodes/pcloud.js"><code>nodes/pcloud.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pcloud/c8">token 链路</a><br><sub><code>c8</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>AGC accesstoken（Web/WX 两套实现）→ NetBoot 缓存与并发重取 → Gnet 登录。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pcloud.js" title="原链接：docs/nodes/pcloud.js"><code>nodes/pcloud.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pcloud/c9">错误码约定</a><br><sub><code>c9</code></sub></td>
      <td align="center"><sub>数据</sub></td>
      <td>0 成功 / 2 登录失效 / 3 数量不足 / 4 金币不足；服务端 te/user.js 返回。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pcloud.js" title="原链接：docs/nodes/pcloud.js"><code>nodes/pcloud.js</code></a></td>
    </tr>
  </tbody>
</table>

</details>

<details>
<summary><b>社交模块（规划）</b> · 5 个节点 · <a href="https://qmeyq.github.io/NG/node-workflow.html#psocial" title="进入分组 psocial">在交互版中打开</a></summary>

<table>
  <thead><tr><th align="left">节点</th><th>类型</th><th align="left">说明</th><th align="left">原始链接</th></tr></thead>
  <tbody>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#psocial/f1">好友系统（待开发）</a><br><sub><code>f1</code></sub></td>
      <td align="center"><sub>待办</sub></td>
      <td>缺少好友申请/列表/删除；无对应云函数与本地表结构。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/psocial.js" title="原链接：docs/nodes/psocial.js"><code>nodes/psocial.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#psocial/f2">私聊与消息（待开发）</a><br><sub><code>f2</code></sub></td>
      <td align="center"><sub>待办</sub></td>
      <td>无会话存储与推送；GOBE 仅用于对局房间。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/psocial.js" title="原链接：docs/nodes/psocial.js"><code>nodes/psocial.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#psocial/f3">排行榜（待开发）</a><br><sub><code>f3</code></sub></td>
      <td align="center"><sub>待办</sub></td>
      <td>无分数上报与榜单查询接口；结算结果当前未持久化。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/psocial.js" title="原链接：docs/nodes/psocial.js"><code>nodes/psocial.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#psocial/f4">分享与邀请（待开发）</a><br><sub><code>f4</code></sub></td>
      <td align="center"><sub>待办</sub></td>
      <td>无微信分享卡片/邀请链接接入。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/psocial.js" title="原链接：docs/nodes/psocial.js"><code>nodes/psocial.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#psocial/f5">接入前提</a><br><sub><code>f5</code></sub></td>
      <td align="center"><sub>待办</sub></td>
      <td>依赖：结算结果落库 → 云函数 → 平台入口与 UI；现有 Cloud 只覆盖账号/背包/商店。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/psocial.js" title="原链接：docs/nodes/psocial.js"><code>nodes/psocial.js</code></a></td>
    </tr>
  </tbody>
</table>

</details>

<details>
<summary><b>其他小游戏（规划）</b> · 3 个节点 · <a href="https://qmeyq.github.io/NG/node-workflow.html#pgame" title="进入分组 pgame">在交互版中打开</a></summary>

<table>
  <thead><tr><th align="left">节点</th><th>类型</th><th align="left">说明</th><th align="left">原始链接</th></tr></thead>
  <tbody>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pgame/g1">入口列表来源</a><br><sub><code>g1</code></sub></td>
      <td align="center"><sub>数据</sub></td>
      <td>列表项来自 ui 包 main/game/ 图片，顺序 sort；index 0 为羽毛球。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pgame.js" title="原链接：docs/nodes/pgame.js"><code>nodes/pgame.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pgame/g2">占位行为</a><br><sub><code>g2</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>_selIdx&gt;0 → Dialog.toast('暂未开放，敬请期待')，不触发资源检查。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pgame.js" title="原链接：docs/nodes/pgame.js"><code>nodes/pgame.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pgame/g3">新增玩法接入清单</a><br><sub><code>g3</code></sub></td>
      <td align="center"><sub>待办</sub></td>
      <td>需要：独立分包 + 场景 .ls + SceneNav 入口 + 选局图标 + 角色/结算适配 + 云数据表。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pgame.js" title="原链接：docs/nodes/pgame.js"><code>nodes/pgame.js</code></a></td>
    </tr>
  </tbody>
</table>

</details>

<details>
<summary><b>资源与存储</b> · 6 个节点 · <a href="https://qmeyq.github.io/NG/node-workflow.html#pres" title="进入分组 pres">在交互版中打开</a></summary>

<table>
  <thead><tr><th align="left">节点</th><th>类型</th><th align="left">说明</th><th align="left">原始链接</th></tr></thead>
  <tbody>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pres/r1">分包结构</a><br><sub><code>r1</code></sub></td>
      <td align="center"><sub>数据</sub></td>
      <td>nor（含 nor/match/match.ls）/ ui / game（game/badm.ls）；对应 manifest 与 res.json。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pres.js" title="原链接：docs/nodes/pres.js"><code>nodes/pres.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pres/r2">版本检查 Res.vers</a><br><sub><code>r2</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>返回 {needUpdate,size}；会话级 markVerified 避免重复检查。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pres.js" title="原链接：docs/nodes/pres.js"><code>nodes/pres.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pres/r3">下载与解压 Res.url</a><br><sub><code>r3</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>按需下载并解压；DP 事件给 url/percent/speed，XP 事件给解压进度。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pres.js" title="原链接：docs/nodes/pres.js"><code>nodes/pres.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pres/r4">进度预测</a><br><sub><code>r4</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>MT.ProgModel 渐近模型 + 呼吸条，弱网下让进度条不倒退。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pres.js" title="原链接：docs/nodes/pres.js"><code>nodes/pres.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pres/r5">缓存写入</a><br><sub><code>r5</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>Web: IndexedDB 双 store（数据 + 文件）；微信: wxKv* 与 wxFile*。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pres.js" title="原链接：docs/nodes/pres.js"><code>nodes/pres.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pres/r6">热更新入口</a><br><sub><code>r6</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>后台发现 nor 新版本时提示『发现游戏资源新版本』，更新后不跳转、仅 toast。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pres.js" title="原链接：docs/nodes/pres.js"><code>nodes/pres.js</code></a></td>
    </tr>
  </tbody>
</table>

</details>

<details>
<summary><b>平台适配</b> · 5 个节点 · <a href="https://qmeyq.github.io/NG/node-workflow.html#pplat" title="进入分组 pplat">在交互版中打开</a></summary>

<table>
  <thead><tr><th align="left">节点</th><th>类型</th><th align="left">说明</th><th align="left">原始链接</th></tr></thead>
  <tbody>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pplat/a1">微信 vs Web 判定</a><br><sub><code>a1</code></sub></td>
      <td align="center"><sub>数据</sub></td>
      <td>sys.ts 判定运行环境；存储、文件、网络请求按平台分流。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pplat.js" title="原链接：docs/nodes/pplat.js"><code>nodes/pplat.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pplat/a2">音频 Au</a><br><sub><code>a2</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>首次点击解锁 AudioContext；Tone.js 动态加载；bgmPlayRich('main') 带 3s 防抖。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pplat.js" title="原链接：docs/nodes/pplat.js"><code>nodes/pplat.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pplat/a3">场景导航 SceneNav</a><br><sub><code>a3</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>open/reset；back 复用预制体不重跑 onAwake；派发 sceneShow。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pplat.js" title="原链接：docs/nodes/pplat.js"><code>nodes/pplat.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pplat/a4">本地设置</a><br><sub><code>a4</code></sub></td>
      <td align="center"><sub>数据</sub></td>
      <td>LocalStorage：musicOn/sfxOn/hitShow/double，默认开/显示/单手。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pplat.js" title="原链接：docs/nodes/pplat.js"><code>nodes/pplat.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#pplat/a5">隐私同意标记</a><br><sub><code>a5</code></sub></td>
      <td align="center"><sub>数据</sub></td>
      <td>同意状态存本地；已同意用户可再次进入设置撤回。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/pplat.js" title="原链接：docs/nodes/pplat.js"><code>nodes/pplat.js</code></a></td>
    </tr>
  </tbody>
</table>

</details>

<details>
<summary><b>羽毛球游戏</b> · 13 个节点 · <a href="https://qmeyq.github.io/NG/node-workflow.html#bmb" title="进入分组 bmb">在交互版中打开</a></summary>

<table>
  <thead><tr><th align="left">节点</th><th>类型</th><th align="left">说明</th><th align="left">原始链接</th></tr></thead>
  <tbody>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#bmb/bentry">比赛入口与装配</a><br><sub><code>bentry</code> · 分组</sub></td>
      <td align="center"><sub>Group</sub></td>
      <td>badm.ts：进入 game/badm.ls 后装配场景、角色与控制器，按 mode/人数创建 PVP 或 PVE。此后与平台/选局无关。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/bentry.js" title="原链接：docs/nodes/bentry.js"><code>nodes/bentry.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#bmb/bmag">比赛管理 Mag</a><br><sub><code>bmag</code> · 分组</sub></td>
      <td align="center"><sub>Group</sub></td>
      <td>比赛核心态与操作入口：players / ball / phase / 比分 / 发球方 / 权威标志；本地输入与远端重放最终都走 hit()。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/bmag.js" title="原链接：docs/nodes/bmag.js"><code>nodes/bmag.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#bmb/brule">规则与判定</a><br><sub><code>brule</code> · 分组</sub></td>
      <td align="center"><sub>Group</sub></td>
      <td>rule.ts：8 个 MatchPhase、发球权/接发、站位与发球区、越界、落地结算、21 分制、换边与鹰眼。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/brule.js" title="原链接：docs/nodes/brule.js"><code>nodes/brule.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#bmb/bpvp">PVP 对战</a><br><sub><code>bpvp</code> · 分组</sub></td>
      <td align="center"><sub>Group</sub></td>
      <td>pvp.ts：角色指派 → 权威端选举 → 帧心跳 → 操作上行/重放 → 球校正与快照恢复。当前有 5 个 P0 级问题。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/bpvp.js" title="原链接：docs/nodes/bpvp.js"><code>nodes/bpvp.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#bmb/bpve">PVE 单机</a><br><sub><code>bpve</code> · 分组</sub></td>
      <td align="center"><sub>Group</sub></td>
      <td>pve.ts：无联网权威，本地全部权威；AI 接管对手与队友。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/bpve.js" title="原链接：docs/nodes/bpve.js"><code>nodes/bpve.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#bmb/bnet">联网与协议</a><br><sub><code>bnet</code> · 分组</sub></td>
      <td align="center"><sub>Group</sub></td>
      <td>GOBE 房间 / 帧同步 + 消息信封 + pvpProto 校验 + NetBoot 会话。消息分帧通道与可靠通道两类。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/bnet.js" title="原链接：docs/nodes/bnet.js"><code>nodes/bnet.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#bmb/bphy">物理内核</a><br><sub><code>bphy</code> · 分组</sub></td>
      <td align="center"><sub>Group</sub></td>
      <td>phy.ts：Q10 定点 + RK4 + 固定步；strike / attachAt / restore 是唯一写入面，其余只读采样。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/bphy.js" title="原链接：docs/nodes/bphy.js"><code>nodes/bphy.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#bmb/bcoll">碰撞检测</a><br><sub><code>bcoll</code> · 分组</sub></td>
      <td align="center"><sub>Group</sub></td>
      <td>collision.ts：角色-角色/角色-网推挤与球-角色检测。注意：CollisionManager 在 src 中无引用，疑似未接线。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/bcoll.js" title="原链接：docs/nodes/bcoll.js"><code>nodes/bcoll.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#bmb/bobj">场上对象</a><br><sub><code>bobj</code> · 分组</sub></td>
      <td align="center"><sub>Group</sub></td>
      <td>Obj 基类 + Ball / Cha / Ani：表现层只写节点位姿，物理真相仍在 Phy 内核。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/bobj.js" title="原链接：docs/nodes/bobj.js"><code>nodes/bobj.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#bmb/binput">输入控制</a><br><sub><code>binput</code> · 分组</sub></td>
      <td align="center"><sub>Group</sub></td>
      <td>control.ts：按下/滑动/松手映射为击球参数；单手按按住时长定角，双手用移动摇杆定仰角；双击切特殊接球。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/binput.js" title="原链接：docs/nodes/binput.js"><code>nodes/binput.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#bmb/bai">AI 对手</a><br><sub><code>bai</code> · 分组</sub></td>
      <td align="center"><sub>Group</sub></td>
      <td>ai.ts：难度 0.4/0.6/0.8/0.95；发球/对打两阶段，抛物线预测落点 + PID 自纠错；硬编码较多。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/bai.js" title="原链接：docs/nodes/bai.js"><code>nodes/bai.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#bmb/bui">界面与表现</a><br><sub><code>bui</code> · 分组</sub></td>
      <td align="center"><sub>Group</sub></td>
      <td>CUI 摇杆/箭头、比赛 HUD、弹窗提示、音频与相机；结算界面缺失是当前最大体验缺口。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/bui.js" title="原链接：docs/nodes/bui.js"><code>nodes/bui.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#bmb/brisk">已知问题与待办</a><br><sub><code>brisk</code> · 分组</sub></td>
      <td align="center"><sub>Group</sub></td>
      <td>按优先级归集当前 PVP/规则/同步的真实缺口，可直接当作迭代清单使用。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/brisk.js" title="原链接：docs/nodes/brisk.js"><code>nodes/brisk.js</code></a></td>
    </tr>
  </tbody>
</table>

</details>

<details>
<summary><b>服务端后端</b> · 16 个节点 · <a href="https://qmeyq.github.io/NG/node-workflow.html#srv" title="进入分组 srv">在交互版中打开</a></summary>

<table>
  <thead><tr><th align="left">节点</th><th>类型</th><th align="left">说明</th><th align="left">原始链接</th></tr></thead>
  <tbody>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv/sv1">Worker 入口 index.js</a><br><sub><code>sv1</code></sub></td>
      <td align="center"><sub>代码</sub></td>
      <td>Cloudflare Worker（www.normalgame.cn）。路由：/js/* 静态资源、GET /health、/gobe/debug、POST /token(注册/校验)、/gobe/token、POST /|/call|/function 云函数代理；统一信封 {code,msg,wv}；先 IP gate 再路由，/te.reg 被拦( code 9 )强制走 /token。无 D1/KV/R2，风控状态在内存。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/srv.js" title="原链接：docs/nodes/srv.js"><code>nodes/srv.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv/sv2">IP 风控 risk.js</a><br><sub><code>sv2</code></sub></td>
      <td align="center"><sub>风险</sub></td>
      <td>内存滑动窗口：20 次/10s 触发阶梯封禁(10s…90s+30s)，每日重置，整月每日滥用→永久；注册配额 5/IP/日(UTC+8)；userHistoryGate 基于 CloudDB 审计历史裁决(USER_RATE_LIMITED，fail-closed)。隔离重启即丢失。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/srv.js" title="原链接：docs/nodes/srv.js"><code>nodes/srv.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv/sv3">AGC 代理 SDK agc/*</a><br><sub><code>sv3</code></sub></td>
      <td align="center"><sub>代码</sub></td>
      <td>Worker 自实现 AGC SDK：credential 解析服务端凭据(AGC_CREDENTIAL)，tokenService 取 accesstoken(提前 2min 刷新/并发去重/多网关回退)，functionService.callFunction Bearer 代理到 AGC 云函数(≤55s)。CN 网关屏蔽 CF 出口(501)→回退 SG/RU/DE。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/srv.js" title="原链接：docs/nodes/srv.js"><code>nodes/srv.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv/sv4">云函数入口 te/user.js</a><br><sub><code>sv4</code></sub></td>
      <td align="center"><sub>代码</sub></td>
      <td>单一 handler，body {t,d}(接受字符串或对象)。无 DB 分支 agt/gt/gprobe；DB 分支 reg/user/bag/set/buy/del。响应恒为 {code, v:&quot;v1107a&quot;, ...}。reg 与 bag(d.gt=1) 内联下发 gobe 凭据。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/srv.js" title="原链接：docs/nodes/srv.js"><code>nodes/srv.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv/sv5">鉴权 code.js</a><br><sub><code>sv5</code></sub></td>
      <td align="center"><sub>规则</sub></td>
      <td>确定性密钥：key = sha256(SALT + &quot;\0&quot; + userid).hex.slice(0,32)，SALT 仅服务端；keyOk 常量时间比较，永不查库(不再读写 secret 列)。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/srv.js" title="原链接：docs/nodes/srv.js"><code>nodes/srv.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv/sv6">注册 reg</a><br><sub><code>sv6</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>_seq.etc 顺序发号(≥1000，16 次尝试)或指定 d.userid；写 claim 令牌 etc=Date.now():random 后回读，back.etc===claim 才赢得非原子竞争；默认 head/head/0.png、bag{head:1}、dollar:1、flag 默认签名；返回 key=code.key(id)。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/srv.js" title="原链接：docs/nodes/srv.js"><code>nodes/srv.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv/sv7">资料 user/set/buy/bag/del</a><br><sub><code>sv7</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>user 改名耗 1 金币(4)、签名免费；set 头像需 bag[head]≥1，扣减/删除(3)；buy 头像道具 −1 金币且 bag++、dollar.png +5(仅测试)；bag 拉背包(d.gt=1 附带 gobe)；del 删号。每次成功调 shield.record。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/srv.js" title="原链接：docs/nodes/srv.js"><code>nodes/srv.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv/sv8">错误码约定</a><br><sub><code>sv8</code></sub></td>
      <td align="center"><sub>数据</sub></td>
      <td>0 成功 / 1 用户不存在 / 2 key 失效 / 3 背包数量不足 / 4 金币不足 / 5 参数或存储或内部 / 6 已注册 / 11 GOBE 上游失败(可重试)。te/user.js 统一返回。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/srv.js" title="原链接：docs/nodes/srv.js"><code>nodes/srv.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv/sv9">GOBE 凭据 gobe.js</a><br><sub><code>sv9</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>grant_type=client_credentials(useJwt:0) 换 GOBE token；网关 drcn→dra→drru→dre 顺序、8s 超时；缓存 {token,expireAt,gateway}(提前 120s 刷新、pending 去重)。在函数内执行以绕开 CN 网关对 CF 的 501；失败仅省略 gobe 字段，登录/注册照常成功。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/srv.js" title="原链接：docs/nodes/srv.js"><code>nodes/srv.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv/sv10">审计 shield.js</a><br><sub><code>sv10</code></sub></td>
      <td align="center"><sub>数据</sub></td>
      <td>每次成功写一行：id __shield__&lt;userid&gt;__&lt;13位ms&gt;&lt;op&gt;__&lt;6随机字节hex&gt;，record=ts+op(每操作一行避免追加覆盖)。op：0 reg/1 user/2 bag/3 set/4 buy/5 del。zone User，保留 24h，前缀查询惰性清理(MAX_SCAN 500)。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/srv.js" title="原链接：docs/nodes/srv.js"><code>nodes/srv.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv/sv11">DB 门面 te/db.js</a><br><sub><code>sv11</code></sub></td>
      <td align="center"><sub>代码</sub></td>
      <td>dbGet/dbPut/dbDel/dbList、dbErr()、dbOk。dbPut = 读-合并-整行 upsert(非原子)。直连 CloudDB 取代旧 Worker→cloudb 回环(2-5s→~100ms)。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/srv.js" title="原链接：docs/nodes/srv.js"><code>nodes/srv.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv/sv12">CloudDB 封装 &amp; NG 对象</a><br><sub><code>sv12</code></sub></td>
      <td align="center"><sub>数据</sub></td>
      <td>CloudDBZoneWrapper 从 resources/agc-apiclient json 初始化、按 zone 缓存客户端、lastError() 诊断；executeQueryById/ByIdPrefix(beginsWith，limit 1-1000)/All/Upsert/Delete。NG 对象：PK id，dollar(Integer)，name/flag/bag(JSON)/head/secret/pass/social/history/record/etc(String)；zone User。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/srv.js" title="原链接：docs/nodes/srv.js"><code>nodes/srv.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv/sv13">风控回读 agc.js</a><br><sub><code>sv13</code></sub></td>
      <td align="center"><sub>规则</sub></td>
      <td>Worker 侧直连 CloudDB REST(connect-api…/v4/objects/queries，zone User/type NG) 读取 __shield__&lt;userid&gt;__ 审计行(24h，limit 500)，供 risk.userHistoryGate 裁决。与 mag 内嵌 SDK 是不同传输。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/srv.js" title="原链接：docs/nodes/srv.js"><code>nodes/srv.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv/sv14">管理云函数 mag.js</a><br><sub><code>sv14</code></sub></td>
      <td align="center"><sub>代码</sub></td>
      <td>独立 AGC 函数 mag.myHandler。t：login/list/get/set(含 dollar 金币 0–1e8)/bag(≤0 删除)/del/passwd/shell(execSync 任意命令)。token=sha256(MAG_SALT+account)，管理员行 mag:admin(默认 1/1)，内存登录锁(5 次失败封 1h)。经 Worker / 代理，无 userid 故跳过 history gate。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/srv.js" title="原链接：docs/nodes/srv.js"><code>nodes/srv.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv/sv15">管理后台 UI magh</a><br><sub><code>sv15</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>浏览器 admin(magh/web)。API_BASE=https://www.normalgame.cn/；call(t,d)→POST {name:&quot;mag&quot;,data:{t,d}}；sessionStorage 存 token；用户列表/搜索/编辑、背包 +/−/增删、删用户、改密、shell 终端。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/srv.js" title="原链接：docs/nodes/srv.js"><code>nodes/srv.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv/sv16">遗留 CRUD cloudb.js</a><br><sub><code>sv16</code></sub></td>
      <td align="center"><sub>待办</sub></td>
      <td>db/cloudb.js 旧通用 CRUD 云函数(action get/put/del/list，extraData{id,zone,...FIELDS}，仅 0/5，无 key 校验)。已被 te/db.js 直连 CloudDB 取代，保留待清理。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/srv.js" title="原链接：docs/nodes/srv.js"><code>nodes/srv.js</code></a></td>
    </tr>
  </tbody>
</table>

</details>

<details>
<summary><b>AI 开发辅助</b> · 12 个节点 · <a href="https://qmeyq.github.io/NG/node-workflow.html#aidev" title="进入分组 aidev">在交互版中打开</a></summary>

<table>
  <thead><tr><th align="left">节点</th><th>类型</th><th align="left">说明</th><th align="left">原始链接</th></tr></thead>
  <tbody>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#aidev/ai1">Web-to-API 桥接</a><br><sub><code>ai1</code></sub></td>
      <td align="center"><sub>代码</sub></td>
      <td>web-api+tool：DrissionPage 控制本地 Chrome，把 ChatGPT/Grok/DeepSeek 等网页 AI 转成 OpenAI 兼容 /v1/chat/completions(SSE 流式)。FastAPI 服务 127.0.0.1:8199，作为 AI 大脑供 MCP 客户端(Cursor/Claude/Qoder)调用。start.bat 一键起 venv+独立 Chrome+API。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/aidev.js" title="原链接：docs/nodes/aidev.js"><code>nodes/aidev.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#aidev/ai2">工具调用中继</a><br><sub><code>ai2</code></sub></td>
      <td align="center"><sub>规则</sub></td>
      <td>ToolSchemaConformer 对齐 OpenAI / Anthropic(input_schema) / Gemini(parameters) 三种工具声明；ToolCallStreamParser 解析 5 种工具调用文本格式；续聊保留 tool_calls 配对；深度思考走 reasoning_content 独立通道，流式头部净化。把网页 AI 输出转成标准 tool_calls。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/aidev.js" title="原链接：docs/nodes/aidev.js"><code>nodes/aidev.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#aidev/ai3">并发与自恢复</a><br><sub><code>ai3</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>request_manager：FIFO 队列+全局锁+取消/客户端断开检测。多账号实例(browser_config INSTANCES，deploy profile，相对 user_data_dir)；页面可用性守卫 PageUnavailableError、_wait_for_composer 等 SPA 渲染、显式代理注入、faulthandler 崩溃落盘、uploads 提示词分片(FILE/CHUNKED)。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/aidev.js" title="原链接：docs/nodes/aidev.js"><code>nodes/aidev.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#aidev/ai4">Laya MCP 服务器</a><br><sub><code>ai4</code></sub></td>
      <td align="center"><sub>代码</sub></td>
      <td>com.layabox.mcp 插件在 IDE liveServer(Express) 起 SSE MCP：GET {liveServer.url}/ai/mcp + POST /ai/mcp-messages?sessionId。server name LayaAirIDE；资源 res://{uuid}(asset)、内置 tool get-product-version、prompt greeting。MCP 客户端填该 URL 接入。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/aidev.js" title="原链接：docs/nodes/aidev.js"><code>nodes/aidev.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#aidev/ai5">工具/提示动态注册</a><br><sub><code>ai5</code></sub></td>
      <td align="center"><sub>规则</sub></td>
      <td>@IEditor.mcp.tool(UI进程) / @IEditorEnv.mcp.tool(场景进程) 装饰器注册 tool/prompt；handlers 分 scene/editor/package。reload() 热更新并 sendToolListChanged/PromptListChanged；参数经 parsePropType→Zod(required/type/desc)。用户脚本加载即 reload。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/aidev.js" title="原链接：docs/nodes/aidev.js"><code>nodes/aidev.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#aidev/ai6">跨进程回调路由</a><br><sub><code>ai6</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>toolCallback：场景进程回调直接执行；UI进程回调(callback 为 id)经 EditorEnv.runUIScript(&quot;McpPluginEditor.invokeCallback&quot;, id, args)；promptCallback 经 port.invoke(&quot;invoke-mcp-callback&quot;)。UI handlers 由 runSceneScript(&quot;McpPluginEnv.syncUIHandlers&quot;) 同步。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/aidev.js" title="原链接：docs/nodes/aidev.js"><code>nodes/aidev.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#aidev/ai7">自动编译</a><br><sub><code>ai7</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>AI 经 MCP 工具触发 LayaAir 编译/构建：TS→JS 产物、资源刷新(flushChanges)。编译错误回传 AI 修正。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/aidev.js" title="原链接：docs/nodes/aidev.js"><code>nodes/aidev.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#aidev/ai8">自动运行 Web 端</a><br><sub><code>ai8</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>启动/刷新 IDE liveServer 预览，浏览器自动化打开 web 运行页(index.html)。产出可交互运行页面供测试。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/aidev.js" title="原链接：docs/nodes/aidev.js"><code>nodes/aidev.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#aidev/ai9">自动测试</a><br><sub><code>ai9</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>浏览器自动化驱动运行页：点击/输入/断言，覆盖启动→菜单→选局→匹配→对局黄金路径与边界；采集 console/network 错误回传 AI。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/aidev.js" title="原链接：docs/nodes/aidev.js"><code>nodes/aidev.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#aidev/ai10">自动服务端配置</a><br><sub><code>ai10</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>deploy Chrome profile 登录 AGC / Cloudflare 控制台：配置云函数(te/user、mag)、wrangler vars/secrets、CloudDB zone(User/NG)；或经 API/CLI 下发。对应服务端后端 srv 分组。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/aidev.js" title="原链接：docs/nodes/aidev.js"><code>nodes/aidev.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#aidev/ai11">自动上传 / 发布</a><br><sub><code>ai11</code></sub></td>
      <td align="center"><sub>流程</sub></td>
      <td>编译产物与资源上传/发布：web 资源发布、云函数部署(wrangler deploy / AGC 上传)。上线结果回传。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/aidev.js" title="原链接：docs/nodes/aidev.js"><code>nodes/aidev.js</code></a></td>
    </tr>
    <tr>
      <td><a href="https://qmeyq.github.io/NG/node-workflow.html#aidev/ai12">反馈闭环</a><br><sub><code>ai12</code></sub></td>
      <td align="center"><sub>规则</sub></td>
      <td>测试反馈/错误 → 回灌 AI 大脑(ai1)，触发下一轮 修改→编译→运行→测试→部署，形成自动迭代闭环。</td>
      <td><a href="https://qmeyq.github.io/NG/nodes/aidev.js" title="原链接：docs/nodes/aidev.js"><code>nodes/aidev.js</code></a></td>
    </tr>
  </tbody>
</table>

</details>

<details>
<summary><b>分组间连线</b> · 16 条</summary>

<table>
  <thead><tr><th align="left">从</th><th align="left">端口</th><th align="left">到</th><th align="left">端口</th></tr></thead>
  <tbody>
    <tr><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pstart">启动与隐私</a></td><td><sub>主菜单就绪</sub></td><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmenu">主菜单</a></td><td><sub>主菜单就绪</sub></td></tr>
    <tr><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmenu">主菜单</a></td><td><sub>游戏大厅</sub></td><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pselect">游戏大厅 / 选局</a></td><td><sub>游戏大厅</sub></td></tr>
    <tr><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmenu">主菜单</a></td><td><sub>社交入口</sub></td><td><a href="https://qmeyq.github.io/NG/node-workflow.html#psocial">社交模块（规划）</a></td><td><sub>社交入口</sub></td></tr>
    <tr><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmenu">主菜单</a></td><td><sub>其他游戏</sub></td><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pgame">其他小游戏（规划）</a></td><td><sub>其他游戏</sub></td></tr>
    <tr><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pcloud">账号与云服务</a></td><td><sub>用户身份</sub></td><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pselect">游戏大厅 / 选局</a></td><td><sub>用户身份</sub></td></tr>
    <tr><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pselect">游戏大厅 / 选局</a></td><td><sub>匹配页打开</sub></td><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmatch">匹配与加载</a></td><td><sub>匹配页打开</sub></td></tr>
    <tr><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pcloud">账号与云服务</a></td><td><sub>GOBE token</sub></td><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmatch">匹配与加载</a></td><td><sub>平台身份</sub></td></tr>
    <tr><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pres">资源与存储</a></td><td><sub>资源就绪</sub></td><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pselect">游戏大厅 / 选局</a></td><td><sub>资源就绪</sub></td></tr>
    <tr><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pplat">平台适配</a></td><td><sub>平台能力</sub></td><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pstart">启动与隐私</a></td><td><sub>平台启动</sub></td></tr>
    <tr><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmatch">匹配与加载</a></td><td><sub>进入比赛</sub></td><td><a href="https://qmeyq.github.io/NG/node-workflow.html#bmb">羽毛球游戏</a></td><td><sub>进入比赛</sub></td></tr>
    <tr><td><a href="https://qmeyq.github.io/NG/node-workflow.html#bmb">羽毛球游戏</a></td><td><sub>对局结果</sub></td><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pmatch">匹配与加载</a></td><td><sub>对局结果</sub></td></tr>
    <tr><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pcloud">账号与云服务</a></td><td><sub>云端请求</sub></td><td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv">服务端后端</a></td><td><sub>云端请求</sub></td></tr>
    <tr><td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv">服务端后端</a></td><td><sub>账号资料</sub></td><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pcloud">账号与云服务</a></td><td><sub>云端返回</sub></td></tr>
    <tr><td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv">服务端后端</a></td><td><sub>GOBE 凭据</sub></td><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pcloud">账号与云服务</a></td><td><sub>云端返回</sub></td></tr>
    <tr><td><a href="https://qmeyq.github.io/NG/node-workflow.html#aidev">AI 开发辅助</a></td><td><sub>服务端部署</sub></td><td><a href="https://qmeyq.github.io/NG/node-workflow.html#srv">服务端后端</a></td><td><sub>管理入口</sub></td></tr>
    <tr><td><a href="https://qmeyq.github.io/NG/node-workflow.html#aidev">AI 开发辅助</a></td><td><sub>编译运行</sub></td><td><a href="https://qmeyq.github.io/NG/node-workflow.html#pplat">平台适配</a></td><td><sub>启动</sub></td></tr>
  </tbody>
</table>

</details>

<!-- DOCS-HOME:END -->

### 当前 PVP 待完善项（摘自文档）

- **P0** `gamesWon` 按边统计，换边不翻转，可能判错冠军
- **P0** 权威切换后击球序号回绕，落后端 Action 被静默丢弃
- **P0** `ball_recovery` 不带 `hitEvents`，恢复窗口内击球事件被吞
- **P0** 击球时刻用发送端本机时钟，钟差不收敛
- **P0** 结束/断线无结算链路，2v2 掉人不转 AI
- **P1** 帧内不含球状态、压线判出界、触网无判罚、鹰眼双开窗
- **P2** `CollisionManager` 疑似未接线、调试日志遗留、魔法数值分散

## 目录

```
src/            TypeScript 源码
docs/
  ├─ node-workflow.html   节点文档编辑器（单文件，零依赖）
  ├─ index.js             项目规划根文档（页面默认加载）
  └─ nodes/*.js           每个分组/节点的独立数据文件（按需异步装配）
tool/docsstatic.cjs       把 docs 首页渲染成 README 里的静态 HTML
```
