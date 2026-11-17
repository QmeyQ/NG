window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/rprogress.js"]={
  "name":"r4","label":"真实进度 + ProgPID","type":"Group",
  "location":[1030,70],"width":260,"height":180,
  "desc":"DP/XP 真值按业务阶段映射；缺少采样时由 ProgPID 预测，不倒退、不提前完成。任务成功/失败/取消由业务回调决定，不由进度值决定。",
  "inputs":[{"name":"进度事件","type":"Event"},{"name":"任务结束","type":"Event"}],"outputs":[],
  "use_custom_color":true,"color":[0.24,0.62,0.36],
  "node_tree":{
    "name":"进度采样、预测与生命周期",
    "nodes":{
      "samples":{"name":"samples","label":"DP / XP 实际采样","type":"数据","location":[60,60],"width":290,"height":200,"desc":"Res.DP(url,percent,speed,loaded,total) 表示下载；XP(packName,fraction) 表示包提取。index/slecet 过滤目标 URL/包，DP 仅 total>0 时作为真值锚；下载100%不等于解压和对象解析完成。","inputs":[{"name":"进度事件","type":"Event"}],"outputs":[{"name":"采样","type":"Event"}]},
      "phases":{"name":"phases","label":"各入口阶段映射","type":"规则","location":[420,60],"width":320,"height":260,"desc":"index：版本预测≤15%，下载真值15–80%，下载后XP为80–99%；本地恢复XP为15–85%。slecet：下载0–80%，XP为80–99%，本地恢复初始预测上限95%。badm：版本≤10%，DP为10–50%，DC后上限80%，XP为50–80%，模型阶段上限95%。这些是显示权重，不是精确剩余时间。来源：src/index.ts、src/slecet.ts、src/badm.ts。","inputs":[{"name":"采样","type":"Event"}],"outputs":[{"name":"阶段真值","type":"Event"}]},
      "anchor":{"name":"anchor","label":"anchor / cap 状态更新","type":"代码","location":[810,60],"width":300,"height":220,"desc":"src/libs/MT.ts：anchor 接受有限、非负且递增的真值，更新实测速率EMA并保证显示不回退；cap变化清空PID积分和测速历史，但不拉低已显示进度。anchor/cap均限制≤0.99。重复或倒退的采样不作为新锚。","inputs":[{"name":"阶段真值","type":"Event"}],"outputs":[{"name":"预测状态","type":"Event"}]},
      "predict":{"name":"predict","label":"tick / PID 速度环","type":"代码","location":[1190,60],"width":300,"height":220,"desc":"有有效速率时按真值+速率×时间外推并受阶段cap限制；没有速率（含首个锚后）仍向cap推进。PID误差输出作为非负速度；帧间隔最多100ms，拒绝非法dt/时间，显示值只增不减。预测不表示任务已成功。","inputs":[{"name":"预测状态","type":"Event"}],"outputs":[{"name":"显示值","type":"Event"}]},
      "display":{"name":"display","label":"帧环更新条，事件更新文案","type":"流程","location":[1190,390],"width":300,"height":180,"desc":"index 更新条宽；slecet 更新对话框进度；badm 仅进度条可见时刷新百分比。下载速度/文件名、解压百分比、失败提示分别由对应事件更新。","inputs":[{"name":"显示值","type":"Event"}],"outputs":[]},
      "end":{"name":"end","label":"成功 / 失败 / 取消","type":"规则","location":[60,390],"width":300,"height":220,"desc":"只有业务实际成功才显示完成或隐藏进度；ProgPID.finish()可置1，现有入口也可停预测后直接设置终值。失败/取消停止预测，绝不能用预测99%触发成功。index本地恢复失败会重置检查状态，后续点击可重试。","inputs":[{"name":"任务结束","type":"Event"}],"outputs":[{"name":"停止跟踪","type":"Event"}]},
      "cleanup":{"name":"cleanup","label":"清理订阅与帧回调","type":"流程","location":[420,390],"width":320,"height":200,"desc":"index/slecet 的停止函数清Timer并解绑Res.DP/XP；badm._stopProg清Timer并解绑XP，onDestroy也调用。边界：badm现有Res.net匿名DP/DC/DE监听尚未统一回收，XP亦未按包过滤；不能宣称三个入口生命周期完全对齐。","inputs":[{"name":"停止跟踪","type":"Event"}],"outputs":[{"name":"核验入口","type":"Event"}]},
      "verify":{"name":"verify","label":"回归结果 / 验证边界","type":"数据","location":[810,390],"width":300,"height":220,"desc":"2026-11-12：test/progress-pid.test.cjs 的13项测试通过，覆盖首锚后推进、阶段切换、非法输入、长帧、不倒退及完成。index/slecet/badm全流程UI、弱网与取消重入仍待实测；本节点是验收记录，不是运行时自动调用。","inputs":[{"name":"核验入口","type":"Event"}],"outputs":[]}
    },
    "links":[
      {"from_node":"__group_in__","from_socket":"进度事件","to_node":"samples","to_socket":"进度事件","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"samples","from_socket":"采样","to_node":"phases","to_socket":"采样","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"phases","from_socket":"阶段真值","to_node":"anchor","to_socket":"阶段真值","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"anchor","from_socket":"预测状态","to_node":"predict","to_socket":"预测状态","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"predict","from_socket":"显示值","to_node":"display","to_socket":"显示值","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"__group_in__","from_socket":"任务结束","to_node":"end","to_socket":"任务结束","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"end","from_socket":"停止跟踪","to_node":"cleanup","to_socket":"停止跟踪","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"cleanup","from_socket":"核验入口","to_node":"verify","to_socket":"核验入口","from_socket_type":"Event","to_socket_type":"Event"}
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/rprogress.js"];
