# NG · Badminton3D

LayaAir 羽毛球游戏（微信小游戏 + Web 双端），单机 PVE 与华为 GOBE 实时对战 PVP。

## 架构可视化（在线可交互）

[![架构可视化](https://img.shields.io/badge/打开-节点工作流文档-4c8dff)](https://qmeyq.github.io/NG/node-workflow.html)

项目架构以「节点工作流文档」形式可视化展示，**在线可交互**：

- 在线演示：<https://qmeyq.github.io/NG/node-workflow.html>
- 离线查看：打开 `docs/node-workflow.html`（需用 http 方式打开，例如在仓库根目录执行 `python -m http.server`，再访问 `http://localhost:8000/docs/node-workflow.html`）

操作方式：

- 拖动 / 滚轮缩放画布，双击「分组节点」进入其子树
- 进入分组后左右两侧有「组输入 / 组输出」镜像节点，能看到数据从哪进、从哪出
- 单击节点查看属性、描述与端口定义；拖动节点底边可拉高
- 「导出」可下载整包 ZIP：全工程 JSON + 每个节点的独立 JSON

## 文档覆盖范围

按分层梳理，逐层可下钻：

| 分组 | 内容 |
| --- | --- |
| 项目总览 | 多玩法聚合：羽毛球（已开发）+ 社交模块 / 其他小游戏（规划中） |
| 启动流程 | index.ts 启动页 → 隐私协议 → 资源检查 → SceneNav 导航 |
| 主菜单 | 玩法入口分发壳 |
| 羽毛球游戏 | select 选局 → netboot 会话 → 匹配页 → 实时联网 / 比赛核心 |
| 比赛核心 | badm 主场景、Control 输入、UI、比赛管理（Mag/PVP/PVE/Rule/AI）、物理引擎（Phy rk4/碰撞）、场上对象（球/角色/动画） |
| 实时联网 | Gnet（GOBE 房间 / 帧同步）、pvpProto 协议、同步与补算 |
| 云服务与账号 | Cloud 云函数（注册 / 背包 / 商店）、AGC 通道、Worker 凭据代理 |
| 资源管线 | 多包加载、包编解码、Brotli 解压、本地缓存 |
| 公共支撑库 | 平台适配、数学库、空间索引、音频音效、系统/输入/计时 |

## 目录

```
src/            TypeScript 源码
docs/
  ├─ node-workflow.html   节点工作流编辑器（单文件，零依赖）
  └─ index.json           架构节点树数据（页面默认加载）
```
