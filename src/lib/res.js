/**
Res.js
依赖：net.js IDBStorage.js
this.process：已下载
this.count:下载总量
this.err:下载错误计数
Res()初始IDB、Net等
url(url, force)：加载资源配置文件res.json(getlist获取健列表)，支持缓存与强制更新,成功后storage.set('resJson'）
downRes()：下载列表中所有的资源
down(key, force)：下载列表单中key对应资源
get(key, index)：获取key对应文件blob，无时返回null
getList()：获取json资源表
getProcess(){process err count};
 */
class Res {
  constructor() {
    this.storage = new IDBStorage();
    this.net = new Net();
    this.list = null;
    this.img = {};
    this.process = 0;
    this.err = 0;
    this.count = 0;
  }

  url(url, force) {
    this.storage.get('resJson', (cachedData) => {
      if (cachedData === null || force) {
        console.log('加载res.json（远程）');
        this.net.download(url, {
          key: 'resJson',
          force,
          onComplete: (blob) => {
            if (blob) {
              new Response(blob).text().then((content) => {
                
              console.log(content)
                try {
                  this.list = JSON.parse(content);
                  this.storage.set('resJson', JSON.stringify(this.list));
                } catch (e) {
                  this.storage.delete('resJson');
                }
              });
            } else {
              this.storage.delete('resJson');
            }
          },
          onError: () => this.storage.delete('resJson')
        });
      } else {
        try {
          this.list = JSON.parse(cachedData);
        } catch (e) {
          this.storage.delete('resJson', () => this.url(url, true));
        }
      }
    });
    return this;
  }

  down(key, force) {
    if (!this.list) return console.error('请先通过url()加载res.json');
    this.storage.getFile(key, (cachedBlob) => {
      if (cachedBlob && !force) {
        this.img[key] = cachedBlob;
        this.process++;
        return;
      }
      const resourceUrl = this.list[key]?.[0];
      if (resourceUrl) {
        this.net.download(resourceUrl, {
          key,
          force,
          onComplete: (blob) => {
            if (blob) {
              this.storage.setFile(key, blob, (success) => {
                if (success) this.img[key] = blob;
                else this.err++;
                this.process++;
              });
            } else {
              this.err++;
              this.process++;
            }
          },
          onError: () => {
            this.err++;
            this.process++;
          }
        });
      } else {
        this.err++;
      }
    });
  }

  downRes() {
    if (!this.list) return console.error('请先通过url()加载res.json');
    this.err = this.process = 0;
    this.img = {};
    this.count = 0;
    const resourceKeys = Object.keys(this.list).filter(k => k !== 'v');
    resourceKeys.forEach(k => this.count += this.list[k].length - 1);
    resourceKeys.forEach(groupKey => {
      this.img[groupKey] = [];
      const baseUrl = this.list[groupKey][0];
      for (let i = 1; i < this.list[groupKey].length; i++) {
        const subKey = `${groupKey}_${i}`;
        const fullUrl = `${baseUrl}${this.list[groupKey][i]}`;
        const subIndex = i - 1;
        this.storage.getFile(subKey, (cachedBlob) => {
          if (cachedBlob) {
            this.img[groupKey][subIndex] = cachedBlob;
            this.process++;
          } else {
            this.net.download(fullUrl, {
              key: subKey,
              onComplete: (blob) => {
                if (blob) {
                  this.storage.setFile(subKey, blob, (success) => {
                    if (success) this.img[groupKey][subIndex] = blob;
                    else this.err++;
                    this.process++;
                  });
                } else {
                  this.err++;
                  this.process++;
                }
              },
              onError: () => {
                this.err++;
                this.process++;
              }
            });
          }
        });
      }
    });
  }

  get(name, index) {
    return this.img[name] ? (index !== undefined ? this.img[name][index] : this.img[name]) : null;
  }

  /**
   * 获取所有已加载的资源
   * @returns {Object} 包含所有资源组的对象，键为资源组名称，值为资源Blob数组
   */
  getList() {
    return this.list;
  }

  setNet(netInstance) {
    this.net = netInstance;
  }

  getProcess(){
    return {process:this.process, err:this.err, count:this.count};
  }
}
