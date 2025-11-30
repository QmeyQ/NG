// 模拟axios主模块，解决GOBE.js的导入问题
const httpAdapter = require('./lib/adapters/http');

module.exports = {
  create: function() {
    return {
      defaults: {
        adapter: httpAdapter
      },
      request: function(config) {
        return httpAdapter(config);
      },
      get: function(url, config) {
        return httpAdapter({
          ...config,
          url: url,
          method: 'GET'
        });
      },
      post: function(url, data, config) {
        return httpAdapter({
          ...config,
          url: url,
          method: 'POST',
          data: data
        });
      }
    };
  }
};
