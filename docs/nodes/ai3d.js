window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/ai3d.js"]={
  "location": [
    -905,
    760
  ],
  "width": 300,
  "height": 220,
  "name": "ai3d",
  "label": "3D 素材 AI 工作流（Blender MCP）",
  "type": "Group",
  "desc": "3D 角色素材 AI 闭环(Blender MCP)：源文件 F:\\LayaProject\\3d\\model → MCP 连通/库存盘点 → 诊断 boy 全部动画连续性问题(循环卡顿/姿势怪异/未适配游戏卡点/球拍拿反) → 自动调整动画帧(红线:不强制插入起始动画帧) → FBX 导出(仅可见对象, NLA 轨 take) → 替换 assets/nor/boy.fbx 与 IDE 发布产物(release/web+dist/web-1107 基线) → h4 重打 nor.br → h6 上传 → 浏览器复验+目检 → 回填。权威子树 nodes/ai3d.js(m0→m8)，可读镜像 handover h19。发布需明确授权，失败即停。",
  "inputs": [
    {
      "name": "3D素材指令",
      "type": "Event"
    }
  ],
  "outputs": [
    {
      "name": "素材发布完成",
      "type": "Event"
    }
  ],
  "use_custom_color": true,
  "color": [
    0.85,
    0.55,
    0.2
  ],
  "node_tree": {
    "name": "3D 素材 AI 工作流 子树",
    "nodes": {
      "m0": {
        "location": [
          0,
          0
        ],
        "width": 280,
        "height": 300,
        "name": "m0",
        "label": "源文件与库存(硬事实)",
        "type": "规则",
        "desc": "【用户明确 2026-11-22】羽毛球游戏角色源文件全部放在 F:\\LayaProject\\3d\\model：boy.blend/boy.fbx(男)、girl.blend/girl1.blend/girl1.fbx(女)、cha.blend、racket.blend/racket.fbx(球拍)、通用骨架.blend、贴图 boycolor.png/boynor.png/Racket.1001-1002.png、重定向映射 remap_*.bmap/本地混元映射.bmap。boy.blend 实测库存(2026-11-22 MCP 盘点)：场景 30fps；骨架 pole(130 骨, Mixamo 命名+LP/RP 球拍挂点)；可见对象 body(mesh)+racket(mesh)+pole，body.001 隐藏(不导出)；NLA 9 轨=导出 take：stand(1-31→standa 1-30)、diving(1-205)、jumphit(1-28→downupremap_off.003_off 1-150)、hitoff(1-66→hitoff_off_off 1-90)、up(1-24)、back(1-25.6)、right(1-51→moveh_off.001 1-557)、left(1-51.8→moveh_off_off 1-557)、down(1-27)；up/back/down 共享 downupremap_off_off(1-150)。发布现状：web/nor/boy/ 仅 8 个 .lani(缺 back)；ani.controller 8 个 clip 状态(stand/up/down/left/right/hitoff/jumphit/diving)；游戏核心状态表 src/badm/obj/ani.ts(17 核心+extras，双端 ID 同源)。",
        "inputs": [
          {
            "name": "3D素材指令",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "库存就绪",
            "type": "Event"
          }
        ],
        "use_custom_color": true,
        "color": [
          0.8,
          0.3,
          0.3
        ]
      },
      "m1": {
        "location": [
          320,
          0
        ],
        "width": 280,
        "height": 300,
        "name": "m1",
        "label": "Blender MCP 调用方式",
        "type": "代码",
        "desc": "连通先检：mcp__blender__get_addon_status(up_to_date/protocol 16；2026-11-22 实测 addon 2.0 + Blender 5.4 Alpha PASS)。启动：F:\\LayaProject\\tools\\blender\\start_blender_mcp.bat [blend路径](bpy.app.timers 延迟 start_server，socket 127.0.0.1:9876)；Codex 配置 ~/.codex/config.toml [mcp_servers.blender] command=C:/Users/mien/.codex/blender-mcp/.venv/Scripts/mcp-for-blender.exe args=[\"--host\",\"127.0.0.1\",\"--port\",\"9876\"](改后完全重启 Codex 才出现 mcp__blender__*)；Qoder 经 settings.json 顶层 mcpServers + qoder_mcp_wrapper.bat 自动拉起。核心工具：execute_blender_code(完整 bpy：骨骼/姿态/关键帧/约束/NLA/导出)、get_scene_info、look(视口/多角度/帧条 PNG，必须 view_image 目检)。打开源文件：bpy.ops.wm.open_mainfile(filepath=r\"F:\\LayaProject\\3d\\model\\boy.blend\")。Blender 5.x 注意：Action 分层，fcurves 在 action.layers[*].strips[*].channelbags[*].fcurves(action.fcurves 不存在)；NLA 采样需 track.mute=False + scene.frame_set(f) 求值。安装/重装/自启细节：handover h18 + tools/blender/README.md。",
        "inputs": [
          {
            "name": "库存就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "MCP就绪",
            "type": "Event"
          }
        ]
      },
      "m2": {
        "location": [
          640,
          0
        ],
        "width": 280,
        "height": 300,
        "name": "m2",
        "label": "问题诊断(boy 全部动画)",
        "type": "流程",
        "desc": "四类已知问题(用户明确)：①循环卡顿：首尾帧姿态不闭合+小数 strip 端点(back=25.599998/left=51.80008)+共享 action 截断(up/back/down 同 action 不同区间)；②运动姿势怪异：重定向残留(_off 后缀 action、mixamo.com 源)致肢体扭曲/重心漂移；③没适配原游戏卡点：mag.ts 时间驱动击球链=滑动→HIT_WINDUP 前摇(minW=cha.upTime*300ms，自动出手阈值 upTime*200ms)→松手/超时 _executeHit(出手=前摇结束, ball.hitAt 轨迹起算)→HIT_RECOVERY 后摇(recoveryDuration)；hitoff/jumphit 的球拍触球帧必须落在前摇结束时刻，后摇段须覆盖 recoveryDuration；④球拍拿反：racket mesh 对象级 parent=pole(无 parent_bone)，查顶点组(RP/RightHand)与局部旋转，拍面应朝向击球方向。诊断脚本：逐轨 frame_set 采样首尾帧骨骼矩阵差+逐帧角速度峰值定位卡顿帧；look frames 帧条截图目检。产出逐轨问题清单(帧号+骨骼+偏差)再进 m3。",
        "inputs": [
          {
            "name": "MCP就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "问题清单",
            "type": "Event"
          }
        ]
      },
      "m3": {
        "location": [
          960,
          0
        ],
        "width": 280,
        "height": 280,
        "name": "m3",
        "label": "自动调整动画帧(硬规则)",
        "type": "流程",
        "desc": "修复规则：①循环轨(stand/up/down/left/right/back)：首尾帧姿态闭合(尾段混合或首帧姿态包裹到末帧)，strip 端点整数化，共享 action 拆独立区间防跨轨串扰；②一次性轨(diving/jumphit/hitoff)：起止姿态与 stand 衔接(游戏 crossFade 0.05s)，无跳变；③卡点：hitoff/jumphit 触球帧对齐前摇结束(upTime=1→约 300ms@30fps≈第9帧，以实际 cha.upTime 为准)，后摇段长度≥recoveryDuration；④球拍朝向：经 RP/RightHand 骨骼旋转/racket 顶点权重修正，禁止整体镜像网格。【红线·用户明确 2026-11-22】不强制插入起始动画帧——禁止在帧0/1插关键帧凑导出，必须修真实姿态与区间。每轨修完：look 复检+首尾帧骨骼矩阵差断言低于阈值；bpy.ops.wm.save_as_mainfile 同路径保存(.blend1 自动备份)。",
        "inputs": [
          {
            "name": "问题清单",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "帧调整完成",
            "type": "Event"
          }
        ],
        "use_custom_color": true,
        "color": [
          0.8,
          0.3,
          0.3
        ]
      },
      "m4": {
        "location": [
          1280,
          0
        ],
        "width": 280,
        "height": 280,
        "name": "m4",
        "label": "FBX 导出(仅可见对象)",
        "type": "流程",
        "desc": "导出硬参数(用户明确：导出可见、不强制插入起始动画帧)：bpy.ops.export_scene.fbx(filepath=r\"F:\\LayaProject\\3d\\model\\boy.fbx\", use_visible=True, bake_anim=True, bake_anim_use_nla_strips=True, bake_anim_use_all_actions=True, bake_anim_simplify_factor=0, add_leaf_bones=False)——use_visible 排除隐藏 body.001；take 名=NLA 轨名(stand/diving/jumphit/hitoff/up/back/right/left/down 共9)+pole|action 名 take，与现有 assets/nor/boy.fbx 一致。导出断言：解析 FBX 二进制 \\x00\\x01AnimStack 取 take 列表=9 轨；可见对象=body/pole/racket；轴/缩放与旧 FBX 一致(IDE 导入后对比 rest pose 防漂移)。导出后替换 assets/nor/boy.fbx(保留 .meta uuid d342d960-d9b9-4c66-9521-99cdc3497c71 与 remappedMaterials)。 【实测坑 2026-11-22】①FBX 导出器跳过 mute 的 NLA 轨→导出前必须全轨 unmute(导完再恢复预览 mute)；②Blender 5.4 插值在关键帧点上(kp.interpolation)，FCurve.interpolation 已移除；③新建 action 无 slot 直到首次 keyframe_insert；NLA strip 换 action 必须同时设 action_slot 且 action_frame_start=1(旧 strip 残留 afs=173 会采样越界=静止)；旧 strip 内部状态可能失效→删 strip 重建(tr.strips.new)最稳。",
        "inputs": [
          {
            "name": "帧调整完成",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "导出完成",
            "type": "Event"
          }
        ]
      },
      "m5": {
        "location": [
          1600,
          0
        ],
        "width": 280,
        "height": 280,
        "name": "m5",
        "label": "替换 IDE 发布",
        "type": "流程",
        "desc": "assets/nor/boy.fbx 替换后触发 IDE 重导入+发布：node local/layamcp.cjs call ide-build '{\"platform\":\"web\"}' → release/web/nor/boy@0.lh + boy/*.lani(应为9含back)。【关键】packstage.cjs 的 nor 树来自 dist/web-1107 基线且只 overlay ui/menu.ls+game/badm.ls——必须把 release/web/nor/boy@0.lh 与 boy/*.lani 同步覆盖到 dist/web-1107/nor/(替换 IDE 发布基线)，否则新动画进不了包。核对：boy@0.lh Animator clip 引用 boy/*.lani 全存在；ani.controller(assets/nor+web/nor)8 状态 clip 路径有效；back 为新增 clip 无游戏状态引用(无副作用)；如需补方向状态(up_right 等)须同时补 girl1 同名 clip(双角色共用 controller)，否则 controller 保持不动。IDE 不可用：停止并回填，禁止手写 .lani 二进制。 【实测坑 2026-11-22】①IDE 发布 tree-shake 掉仅运行时加载的资源(badm.ls 不引用 boy)→release/web/nor 无 boy；必须从 library 导入缓存组装发布产物：library/d3/<uuid>@0.lh 重写引用(@laniN→boy/<take>.lani、@lm0→boy/node_0.005.lm、材质uuid→body.lmat)后写 release/web/nor 与 dist/web-1107/nor 双份；②lani 索引=take 名字母序(旧16take/新9take 均验证)；③外部替换 assets fbx 后 IDE 不自动重导入→ide-ui-eval 调 Editor.assetDb.flushChanges() 触发(reimport/refreshFolder 单独无效)；④ide-ui-eval 上下文=渲染窗口 Editor 对象(assetDb/reimport/flushChanges/getAssetSync 路径相对 assets 如 nor/boy.fbx)，无 Editor.Message，代码非 async 函数体(用 Promise 链/最后一表达式)。",
        "inputs": [
          {
            "name": "导出完成",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "发布替换完成",
            "type": "Event"
          }
        ]
      },
      "m6": {
        "location": [
          1920,
          0
        ],
        "width": 280,
        "height": 240,
        "name": "m6",
        "label": "资源包重发布(nor.br)",
        "type": "流程",
        "desc": "h4 链路：node local/packstage.cjs(dist/web-1107 完整树+release overlay+旧 ui.br 恢复 head/ProgressBar) → node tool/assetsCollect.js local/packstage --dst F:/LayaProject/web(纯镜像覆盖, internal→ui/internal 改写) → node tool/tmpPack.js(web/nor→nor.br+nor.manifest.json；web/ui→ui.br)。核对：nor.br 含 boy@0.lh+boy/9.lani+node_0.005.lm；nor.manifest.json 尺寸/哈希更新；ui.br 的 menu.ls+4 head 齐全。打包失败即停，不带病上传。",
        "inputs": [
          {
            "name": "发布替换完成",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "资源包就绪",
            "type": "Event"
          }
        ]
      },
      "m7": {
        "location": [
          2240,
          0
        ],
        "width": 280,
        "height": 280,
        "name": "m7",
        "label": "上传+浏览器复验(硬规则)",
        "type": "流程",
        "desc": "发布需明确授权(aidev 纪律)。h6 上传：Python/pythoncore-3.14-64/python.exe local/doupload.py(PUB_FORCE=1 覆盖华为云 sgf-rhq1y nor.br；登录态已持久化，先探测后执行)；令牌不变→res.ts/index.html 无需改。h5 浏览器复验：探针进对局(__qa.pve()/__qa.toMatch())，断言 stand 循环无卡顿(首尾帧姿态差)、四向移动切换、击球卡点(出手=前摇结束约300ms)、球拍朝向正确；按 ai13 硬规则每个关键状态截图+view_image 目检(循环首尾对比/触球帧/球拍特写)；动画资源双端同源(ani.ts 稳定状态 ID 表)，PVP 改动须双客户端 mcdrive 复验；生产复验走真实 CDN。失败即停并回填。 【实测坑 2026-11-22】publish.py upload() 以\"文件名出现在目录列表\"判成功→PUB_FORCE 覆盖重传时同名已在列表=假成功(覆盖确认弹窗未点, 实际未提交)；必须 local/reupload_verify.py：上传后循环点覆盖确认(确定/确认/覆盖)+源站回读断言(Range GET 带唯一 cb 参数, Content-Range total==本地字节)。回读通过后再查_plain URL_：若仍旧字节=CDN 缓存→ResList URL 加 ver 参数+重编 bundle 上传。客户端按 size 比对触发重下载(res_idx)。另：PVE 待机时游戏每帧把角色 crossFade 回 stand，探针直接 crossFade 会被覆盖→移动动画实测须真实输入驱动或回合中截图。 【交付改道 2026-11-22】华为上传端点不可用+publish.py 假成功→改 CF 交付：www.normalgame.cn 根 index+/packs/+新 bundle(ResList 指 www/packs?v=20261122b)；apex index 在 ECS nginx 需 FTP/Workbench 凭据(待用户)；apex worker 路由透传方案已验证不可行(1003/1019/DNS 无权限)并回退, relay /apim 保持 200。",
        "inputs": [
          {
            "name": "资源包就绪",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "复验通过",
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
      "m8": {
        "location": [
          2560,
          0
        ],
        "width": 280,
        "height": 220,
        "name": "m8",
        "label": "回填工作流",
        "type": "规则",
        "desc": "回填 docs/handover.md h19+h12 模块行+本节点树(ai3d)+docs/auto/state.json(phase/done/next/updatedAt)；记录逐轨帧区间变更、修复断言、导出 take 列表、IDE 发布产物、dist 同步、nor.br 尺寸/哈希、上传时间戳、探针断言数与截图路径。未回填=本轮未完成；下一轮从 state.json next 续跑。发现工作流与代码/资产不符：先修工作流或先修资产使两者一致，不允许绕过。",
        "inputs": [
          {
            "name": "复验通过",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "素材发布完成",
            "type": "Event"
          }
        ]
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "3D素材指令",
        "from_socket_identifier": "3D素材指令",
        "from_socket_type": "Event",
        "to_node": "m0",
        "to_socket": "3D素材指令",
        "to_socket_identifier": "3D素材指令",
        "to_socket_type": "Event"
      },
      {
        "from_node": "m0",
        "from_socket": "库存就绪",
        "from_socket_identifier": "库存就绪",
        "from_socket_type": "Event",
        "to_node": "m1",
        "to_socket": "库存就绪",
        "to_socket_identifier": "库存就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "m1",
        "from_socket": "MCP就绪",
        "from_socket_identifier": "MCP就绪",
        "from_socket_type": "Event",
        "to_node": "m2",
        "to_socket": "MCP就绪",
        "to_socket_identifier": "MCP就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "m2",
        "from_socket": "问题清单",
        "from_socket_identifier": "问题清单",
        "from_socket_type": "Event",
        "to_node": "m3",
        "to_socket": "问题清单",
        "to_socket_identifier": "问题清单",
        "to_socket_type": "Event"
      },
      {
        "from_node": "m3",
        "from_socket": "帧调整完成",
        "from_socket_identifier": "帧调整完成",
        "from_socket_type": "Event",
        "to_node": "m4",
        "to_socket": "帧调整完成",
        "to_socket_identifier": "帧调整完成",
        "to_socket_type": "Event"
      },
      {
        "from_node": "m4",
        "from_socket": "导出完成",
        "from_socket_identifier": "导出完成",
        "from_socket_type": "Event",
        "to_node": "m5",
        "to_socket": "导出完成",
        "to_socket_identifier": "导出完成",
        "to_socket_type": "Event"
      },
      {
        "from_node": "m5",
        "from_socket": "发布替换完成",
        "from_socket_identifier": "发布替换完成",
        "from_socket_type": "Event",
        "to_node": "m6",
        "to_socket": "发布替换完成",
        "to_socket_identifier": "发布替换完成",
        "to_socket_type": "Event"
      },
      {
        "from_node": "m6",
        "from_socket": "资源包就绪",
        "from_socket_identifier": "资源包就绪",
        "from_socket_type": "Event",
        "to_node": "m7",
        "to_socket": "资源包就绪",
        "to_socket_identifier": "资源包就绪",
        "to_socket_type": "Event"
      },
      {
        "from_node": "m7",
        "from_socket": "复验通过",
        "from_socket_identifier": "复验通过",
        "from_socket_type": "Event",
        "to_node": "m8",
        "to_socket": "复验通过",
        "to_socket_identifier": "复验通过",
        "to_socket_type": "Event"
      },
      {
        "from_node": "m8",
        "from_socket": "素材发布完成",
        "from_socket_identifier": "素材发布完成",
        "from_socket_type": "Event",
        "to_node": "__group_out__",
        "to_socket": "素材发布完成",
        "to_socket_identifier": "素材发布完成",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/ai3d.js"];
