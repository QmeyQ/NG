// 模拟axios http适配器，解决GOBE.js的导入问题
module.exports = function httpAdapter(config) {
  return new Promise(function dispatchHttpRequest(resolve, reject) {
    // 使用Laya的HTTP请求代替axios原生适配器
    const http = new Laya.HttpRequest();
    
    // 设置响应类型
    if (config.responseType) {
      http.responseType = config.responseType;
    }
    
    // 设置超时
    if (config.timeout) {
      http.time = config.timeout;
    }
    
    // 监听完成事件
    http.once(Laya.Event.COMPLETE, null, function() {
      resolve({
        data: http.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config,
        request: http
      });
    });
    
    // 监听错误事件
    http.once(Laya.Event.ERROR, null, function() {
      reject(new Error('Request failed'));
    });
    
    // 发送请求
    http.send(config.url, config.data || '', config.method || 'GET', config.headers || {});
  });
};
