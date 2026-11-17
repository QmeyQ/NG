window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/rsky.js"]={
  "name":"rsky","label":"动态天空 / 挂载与验收","type":"Group",
  "location":[710,770],"width":280,"height":180,
  "desc":"badm 的 nor/sky.lmat 回调挂载 SkyDome；区分材质返回、renderer赋值与实际可见。记录纹理槽修复、54项回归及本地浏览器结果，不宣称已发布或完整对局验收。",
  "inputs":[{"name":"天空材质","type":"Event"}],"outputs":[],
  "use_custom_color":true,"color":[0.24,0.62,0.36],
  "node_tree":{
    "name":"天空回调、渲染条件与回归证据",
    "nodes":{
      "callback":{"name":"callback","label":"Res.get 异步回调","type":"流程","location":[60,60],"width":300,"height":200,"desc":"src/badm.ts：Res.get('nor/sky.lmat',callback)取得材质；nor包就绪只是前置条件，不会自动解析所有材质。当前比赛开始不等待天空回调，加载结束后才补挂天空。","inputs":[{"name":"天空材质","type":"Event"}],"outputs":[{"name":"回调结果","type":"Event"}]},
      "guard":{"name":"guard","label":"当前挂载前置判断","type":"规则","location":[430,60],"width":300,"height":220,"desc":"回调重新取Laya.stage._scene3Ds[0]；mat/scene/skyRenderer任一为空则warn并跳过，否则进入挂载。尚无专门的材质类型、占位纹理和scene销毁校验；异步期间切场景的目标归属仍属待验证边界，不伪装成本次已修复。","inputs":[{"name":"回调结果","type":"Event"}],"outputs":[{"name":"可挂载","type":"Event"},{"name":"缺失","type":"Event"}]},
      "mount":{"name":"mount","label":"SkyDome + material","type":"代码","location":[800,60],"width":300,"height":220,"desc":"scene.skyRenderer.mesh=Laya.SkyDome.instance；material=skyMat。当前本地跟随相机及鹰眼相机已用CameraClearFlags.Sky，本次不改清屏模式。挂载日志只能证明赋值执行；实际渲染还要求活动相机、兼容天空材质与正确纹理槽。","inputs":[{"name":"可挂载","type":"Event"}],"outputs":[{"name":"验收入口","type":"Event"}]},
      "skip":{"name":"skip","label":"跳过 / 留存日志","type":"流程","location":[430,390],"width":300,"height":170,"desc":"现有代码输出天空盒挂载跳过的mat/scene状态并返回；不会因此自动重试、阻塞比赛或显示匹配失败。本次仅修复ResLoader的纹理setter分派。","inputs":[{"name":"缺失","type":"Event"}],"outputs":[]},
      "repro":{"name":"repro","label":"根因复现：默认1×1纹理","type":"数据","location":[1170,60],"width":310,"height":250,"desc":"2026-11-12真实Laya引擎：SkyPanoramicMaterial构造成功，1920×1080 court.jpg也加载成功，但旧代码把panoramicTexture当uniform写入。实际u_Texture仍是默认1×1纹理，所以仅断言非空也会误判成功。修复后属性名同样查找setter，真实u_Texture获得全景图。","inputs":[{"name":"验收入口","type":"Event"}],"outputs":[{"name":"回归检查","type":"Event"}]},
      "tests":{"name":"tests","label":"自动回归：54项通过","type":"数据","location":[1170,390],"width":310,"height":260,"desc":"test/res-loader.test.js：验证天空类型、1920×1080尺寸、实际u_Texture与panoramicTexture同对象、不生成错误uniform、曝光/色调、跨包天空、PBR setter及define、自定义uniform回退、Res.get包内回调。连同原控制器/图集/预制体/缓存/失败用例共54项通过。测试在local/build/res-loader-check.html执行，不是游戏启动时自动执行。","inputs":[{"name":"回归检查","type":"Event"}],"outputs":[{"name":"显示检查","type":"Event"}]},
      "visual":{"name":"visual","label":"浏览器动态渲染通过","type":"数据","location":[800,390],"width":300,"height":230,"desc":"本地回归页构造真实Scene3D与Sky相机，Res.get回调动态设置SkyDome+材质；修复前灰色、修复后可见星空，浏览器无warn/error。截图：local/build/sky-before.png、sky-after.png。证明资源链与渲染链联通，不等同完整PVP/切场景验收。","inputs":[{"name":"显示检查","type":"Event"}],"outputs":[{"name":"交付状态","type":"Event"}]},
      "delivery":{"name":"delivery","label":"本地构建 / 未发布","type":"规则","location":[60,390],"width":300,"height":250,"desc":"2026-11-12：node tool/build.cjs --out local/build/bundle.sky-check.js成功；npx tsc -p tsconfig.qa.json --noEmit仍被card.ts:80、82旧3参数调用与6参数构造签名不符阻塞。天空修复是客户端代码变更，未修改/发布远端资源包，未部署线上；微信真机、完整对局与切场景尚未验证。","inputs":[{"name":"交付状态","type":"Event"}],"outputs":[]}
    },
    "links":[
      {"from_node":"__group_in__","from_socket":"天空材质","to_node":"callback","to_socket":"天空材质","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"callback","from_socket":"回调结果","to_node":"guard","to_socket":"回调结果","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"guard","from_socket":"可挂载","to_node":"mount","to_socket":"可挂载","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"guard","from_socket":"缺失","to_node":"skip","to_socket":"缺失","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"mount","from_socket":"验收入口","to_node":"repro","to_socket":"验收入口","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"repro","from_socket":"回归检查","to_node":"tests","to_socket":"回归检查","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"tests","from_socket":"显示检查","to_node":"visual","to_socket":"显示检查","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"visual","from_socket":"交付状态","to_node":"delivery","to_socket":"交付状态","from_socket_type":"Event","to_socket_type":"Event"}
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/rsky.js"];
