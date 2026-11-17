window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/rmaterial.js"]={
  "name":"resMaterial","label":"材质 .lmat / 纹理绑定","type":"Group",
  "location":[1010,265],"width":260,"height":180,
  "desc":"_buildMaterial：材质类型、纹理路径与采样参数、setter/uniform分派、颜色与渲染状态。SkyPanoramic 的 u_Texture 必须经 panoramicTexture setter 绑定。",
  "inputs":[{"name":"材质","type":"Event"}],"outputs":[{"name":"对象","type":"Event"},{"name":"解析失败","type":"Event"}],
  "use_custom_color":true,"color":[0.24,0.62,0.36],
  "node_tree":{
    "name":"材质构造与实际纹理槽绑定",
    "nodes":{
      "json":{"name":"json","label":"解析 .lmat JSON","type":"流程","location":[60,60],"width":290,"height":170,"desc":"src/libs/res/resLoader.ts _buildMaterial 读取props；JSON解析失败抛错，外层资源解析分支返回null，不写成功对象缓存。","inputs":[{"name":"材质","type":"Event"}],"outputs":[{"name":"props","type":"Event"},{"name":"错误","type":"Event"}]},
      "construct":{"name":"construct","label":"类型反射与天空别名","type":"代码","location":[420,60],"width":300,"height":210,"desc":"优先ClassUtils查原type及去Laya.前缀形态。短名SkyPanoramic→SkyPanoramicMaterial，SkyBox→SkyBoxMaterial。查不到或构造异常时现有行为降级PBRStandardMaterial；非空材质不证明类型正确。","inputs":[{"name":"props","type":"Event"}],"outputs":[{"name":"材质实例","type":"Event"}]},
      "path":{"name":"path","label":"相对 / 跨包 / 引擎URL","type":"规则","location":[790,60],"width":300,"height":230,"desc":"先识别绝对地址或res://交引擎；其余先source.hasPack检查前缀，跨包source.loadFile(pack,path)，否则以lmat所在目录拼接并归一化。nor/sky.lmat包内引用court.jpg；assets源文件res://UUID需依赖引擎映射，不能与包内相对路径混为一谈。","inputs":[{"name":"材质实例","type":"Event"}],"outputs":[{"name":"纹理请求","type":"Event"}]},
      "texture":{"name":"texture","label":"Texture2D / 参数透传","type":"流程","location":[1160,60],"width":300,"height":220,"desc":"Web包内Blob用objectURL交Laya.loader；微信写临时文件后加载。constructParams及propertyParams透传，保留sRGB、filterMode、wrapMode与anisoLevel。包内文件缺失会告警并继续；加载失败可能得到null，当前没有严格依赖完整性门禁。","inputs":[{"name":"纹理请求","type":"Event"}],"outputs":[{"name":"纹理结果","type":"Event"}]},
      "bind":{"name":"bind","label":"优先调用真实属性 setter","type":"代码","location":[1160,390],"width":320,"height":270,"desc":"_setMatTex：u_名称转驼峰属性，已映射的JS属性名原样保留；沿原型链找setter并赋值，无setter才shaderData.setTexture(propertyNameToID(name),tex)。u_AlbedoTexture→albedoTexture保留shader define副作用。SkyPanoramic：u_Texture→panoramicTexture→setter→实际u_Texture槽；不能写一个名为panoramicTexture的假uniform。相对与跨包路径共用此绑定逻辑。","inputs":[{"name":"纹理结果","type":"Event"}],"outputs":[{"name":"已处理纹理","type":"Event"}]},
      "props":{"name":"props","label":"颜色 / 数值 / 渲染状态","type":"代码","location":[790,390],"width":300,"height":240,"desc":"vectors按现有属性类型构造Color或Vector，避免Color读取Vector4的r/g/b/a得到undefined。floats走同名属性；顶层u_TintColor/u_Exposure/u_Rotation转setter，天空u_Texture跳过防覆盖。应用Cull/Blend/Depth/Queue等；具体Sky pass状态仍由引擎决定。","inputs":[{"name":"已处理纹理","type":"Event"}],"outputs":[{"name":"材质结果","type":"Event"}]},
      "return":{"name":"return","label":"返回不等于可见性验收","type":"规则","location":[420,390],"width":300,"height":220,"desc":"纹理与属性处理结束返回mat，经Res写对象缓存并resolve/回调。缺贴图或类型降级仍可能返回对象；“材质非空”“skyRenderer已赋值”都不足以证明天空可见。实际场景挂载与浏览器验收在资源主树的动态天空子流程中。","inputs":[{"name":"材质结果","type":"Event"}],"outputs":[{"name":"对象","type":"Event"}]},
      "fail":{"name":"fail","label":"构建异常返回失败","type":"流程","location":[60,390],"width":290,"height":180,"desc":"构建Promise reject由parseBlobToEngineObject的材质分支处理并finish(null)，沿Res失败路径交业务；不将缺失纹理的降级行为误记成严格失败。","inputs":[{"name":"错误","type":"Event"}],"outputs":[{"name":"解析失败","type":"Event"}]}
    },
    "links":[
      {"from_node":"__group_in__","from_socket":"材质","to_node":"json","to_socket":"材质","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"json","from_socket":"props","to_node":"construct","to_socket":"props","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"json","from_socket":"错误","to_node":"fail","to_socket":"错误","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"construct","from_socket":"材质实例","to_node":"path","to_socket":"材质实例","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"path","from_socket":"纹理请求","to_node":"texture","to_socket":"纹理请求","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"texture","from_socket":"纹理结果","to_node":"bind","to_socket":"纹理结果","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"bind","from_socket":"已处理纹理","to_node":"props","to_socket":"已处理纹理","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"props","from_socket":"材质结果","to_node":"return","to_socket":"材质结果","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"return","from_socket":"对象","to_node":"__group_out__","to_socket":"对象","from_socket_type":"Event","to_socket_type":"Event"},
      {"from_node":"fail","from_socket":"解析失败","to_node":"__group_out__","to_socket":"解析失败","from_socket_type":"Event","to_socket_type":"Event"}
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/rmaterial.js"];
