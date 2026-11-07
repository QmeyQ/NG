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

## 画布预览

[![画布预览](https://qmeyq.github.io/NG/preview.png)](https://qmeyq.github.io/NG/node-workflow.html)

<sub>点击图片进入交互版首页 · 预览图源文件 <a href="https://qmeyq.github.io/NG/preview.png">docs/preview.png</a> · 根层 12 个分组 / 210 个节点，双击分组逐层下钻</sub>

## 当前 PVP 待完善项（摘自文档）

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
  ├─ nodes/*.js           每个分组/节点的独立数据文件（按需异步装配）
  └─ preview.png          首页画布预览图（README 顶部点击跳转用）
```
