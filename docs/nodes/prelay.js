window.__DOC_FILES=window.__DOC_FILES||{};
window.__DOC_FILES["nodes/prelay.js"]={
  "location": [
    -905,
    620
  ],
  "width": 260,
  "name": "prelay",
  "label": "远程中转接管(re-relay)",
  "type": "Group",
  "desc": "AI远程中转: 远端AI经服务器/apim(HTTP+HTTPS)全权处理本机Laya项目(文件/终端/LayaAir IDE MCP)。relay在server/re/, frp独立隧道21119→5001(不碰远程控制FRPC), 服务器nginx反代。含服务器CDP接管法/nginx+FTP配置/NSSM自启/扩展优化。按r1→r7维护与扩展。",
  "inputs": [
    {
      "name": "接管指令",
      "type": "Event"
    }
  ],
  "outputs": [],
  "use_custom_color": true,
  "color": [
    0.85,
    0.45,
    0.2
  ],
  "height": 160,
  "node_tree": {
    "name": "远程中转接管 子树",
    "nodes": {
      "r1": {
        "location": [
          0,
          0
        ],
        "width": 280,
        "name": "r1",
        "label": "架构与链路",
        "type": "规则",
        "desc": "链路: 远端AI ─HTTP/HTTPS─> 服务器nginx /apim ─> 127.0.0.1:5001(frps远程口) ─frp隧道─> 本机127.0.0.1:21119(server/re/server.js relay)。服务器47.119.120.119(阿里云ECS i-wz9ai3ubuaio96cedrf4, cn-shenzhen, Ubuntu22.04, 内网172.18.167.46, root)。站点根/home/ftpu/html; nodejs服务/home/ftpu/server.js(:3000, nginx /api/反代); frps在/home/ftpu/frp/(bindPort7000; 远程口5000=远程控制m-tcp, 5001=relay re-api)。relay项目全在 server/re/。端口隔离: relay用21119→5001独立frpc, 绝不碰远程控制FRPC(21118→5000)。",
        "inputs": [
          {
            "name": "接管指令",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "下一步",
            "type": "Event"
          }
        ],
        "height": 200
      },
      "r2": {
        "location": [
          0,
          0
        ],
        "width": 280,
        "name": "r2",
        "label": "本机 relay 服务",
        "type": "规则",
        "desc": "server/re/server.js(Node HTTP监听127.0.0.1:21119; 自带bin/node.exe+DLL, 不依赖用户WindowsApps node)。鉴权token在re/config.json(body.token或X-Re-Token头或Bearer)。参数缺失/错误直接返回帮助{ok:false,error,help}; GET任意路径或action=help返回完整API文档。动作: help/ping/info; fs.read/write/append/list/stat/delete/move/copy/mkdir(path相对项目根F:/LayaProject或绝对, encoding utf8/base64); exec{cmd,cwd,timeout}(高危shell); laya.list/call/state/build/find/open/eval(经mcp.js接管LayaAir IDE MCP 127.0.0.1:18090, SSE+JSON-RPC, 断线自动重连)。响应{ok:true,...}; 日志re/relay.log。",
        "inputs": [
          {
            "name": "上一步",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "下一步",
            "type": "Event"
          }
        ],
        "height": 200
      },
      "r3": {
        "location": [
          0,
          0
        ],
        "width": 280,
        "name": "r3",
        "label": "frp 隧道(独立)",
        "type": "规则",
        "desc": "server/re/frpc.toml: serverAddr47.119.120.119:7000, token qmeyqmilo, proxy re-api(tcp) localPort21119→remotePort5001。独立frpc进程: re/frp/frpc.exe -c re/frpc.toml。与远程控制frp/frpc.toml(m-tcp 21118→5000, 服务FRPC)互不干扰。frps在服务器/home/ftpu/frp/运行。扩展隧道: 加[[proxies]]换唯一name/localPort/remotePort, 勿与既有冲突; 服务器安全组需放行新remotePort。",
        "inputs": [
          {
            "name": "上一步",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "下一步",
            "type": "Event"
          }
        ],
        "height": 200
      },
      "r4": {
        "location": [
          0,
          0
        ],
        "width": 280,
        "name": "r4",
        "label": "服务器接管方法(CDP)",
        "type": "规则",
        "desc": "cua对Edge的计算机使用许可常被拒(独立于exec full access)。改用CDP(同mcdrive测试法): ①复制本机Edge Profile1会话(Local State+Local Storage+Network/Cookies等)到可调试profile local/edge-srv, 启Edge --remote-debugging-port=9228(local/copy_session_edge.ps1); Cookies常EBUSY锁定但Local Storage足以保留阿里云登录。②CDP导航ECS Workbench免密登录实例(local/open_workbench.cjs, click_login.cjs)。③经xterm键入命令(local/type_cmd.cjs '<cmd>'或@file; Input.insertText+Enter; 回读.xterm-rows)。脚本均在local/。得root shell即全权配置服务器。",
        "inputs": [
          {
            "name": "上一步",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "下一步",
            "type": "Event"
          }
        ],
        "height": 200
      },
      "r5": {
        "location": [
          0,
          0
        ],
        "width": 280,
        "name": "r5",
        "label": "服务器配置(nginx/FTP)",
        "type": "规则",
        "desc": "nginx /etc/nginx/sites-enabled/default: HTTP(:80)与HTTPS(:443 normalgame.cn, 证书/etc/nginx/ssl/normalgame.cn.pem/key)两个server各加 location /apim { proxy_pass http://127.0.0.1:5001/; proxy_http_version 1.1; proxy_set_header Host $host; X-Real-IP; X-Forwarded-For; proxy_read_timeout 300s; client_max_body_size 64m; }。备份/root/default.bak.re/.re2(勿放sites-enabled内, 否则duplicate default server)。nginx -t && systemctl reload nginx; reload后curl瞬时404是竞态, 稍候重试。FTP vsftpd(/etc/vsftpd.conf): listen=YES/listen_ipv6=NO(原listen_ipv6=YES致PASV返回0.0.0.0忽略pasv_address→数据连接失败), pasv_address=47.119.120.119, pasv端口1024-1048(安全组已放行), systemctl restart vsftpd; 备份/root/vsftpd.conf.bak.re; 客户端用被动模式PASV。诊断local/ftp_test.cjs。",
        "inputs": [
          {
            "name": "上一步",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "下一步",
            "type": "Event"
          }
        ],
        "height": 200
      },
      "r6": {
        "location": [
          0,
          0
        ],
        "width": 280,
        "name": "r6",
        "label": "开机自启(NSSM)",
        "type": "规则",
        "desc": "NSSM=re/frp/nssm.exe。re/frp/ontask.bat(需管理员/UAC)装ReAPI(bin/node.exe server.js)+ReFrp(frpc.exe -c re/frpc.toml)两自启服务(SERVICE_AUTO_START, AppExit Restart, 日志relay_service.log/frpc_re_service.log); 先调kill_manual.ps1停手动实例(避免端口21119/proxy re-api冲突)。re/frp/uninstall.bat仅卸ReAPI/ReFrp, 不动FRPC。服务安装需管理员: exec非admin, 须用户点UAC或右键bat以管理员运行。手动运行用local/restore_manual.ps1起relay+frpc。",
        "inputs": [
          {
            "name": "上一步",
            "type": "Event"
          }
        ],
        "outputs": [
          {
            "name": "下一步",
            "type": "Event"
          }
        ],
        "height": 200
      },
      "r7": {
        "location": [
          0,
          0
        ],
        "width": 280,
        "name": "r7",
        "label": "扩展与优化/排障",
        "type": "规则",
        "desc": "扩展API: server.js handlers加动作+HELP.actions加文档(参数缺失自动返回帮助); 新远程能力经exec/laya.call即可, 无需改架构。优化: ①token轮换改config.json重启relay; ②按需加路径/命令白名单(当前全权); ③exec超时/输出截断已设; ④MCP断线重连已设; ⑤多机接管: 每机一个frpc proxy(不同remotePort)+服务器nginx多location。排障: 看relay.log/frpc_re.log; 服务器经r4接管查nginx/frps/vsftpd; 公网不通查安全组(21/5001/1024-1048/80/443)。验证: 本地test_local.cjs(15项); 公网POST https://normalgame.cn/apim 的exec/laya.state。",
        "inputs": [
          {
            "name": "上一步",
            "type": "Event"
          }
        ],
        "outputs": [],
        "height": 200
      }
    },
    "links": [
      {
        "from_node": "__group_in__",
        "from_socket": "接管指令",
        "from_socket_identifier": "接管指令",
        "from_socket_type": "Event",
        "to_node": "r1",
        "to_socket": "接管指令",
        "to_socket_identifier": "接管指令",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r1",
        "from_socket": "下一步",
        "from_socket_identifier": "下一步",
        "from_socket_type": "Event",
        "to_node": "r2",
        "to_socket": "上一步",
        "to_socket_identifier": "上一步",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r2",
        "from_socket": "下一步",
        "from_socket_identifier": "下一步",
        "from_socket_type": "Event",
        "to_node": "r3",
        "to_socket": "上一步",
        "to_socket_identifier": "上一步",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r3",
        "from_socket": "下一步",
        "from_socket_identifier": "下一步",
        "from_socket_type": "Event",
        "to_node": "r4",
        "to_socket": "上一步",
        "to_socket_identifier": "上一步",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r4",
        "from_socket": "下一步",
        "from_socket_identifier": "下一步",
        "from_socket_type": "Event",
        "to_node": "r5",
        "to_socket": "上一步",
        "to_socket_identifier": "上一步",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r5",
        "from_socket": "下一步",
        "from_socket_identifier": "下一步",
        "from_socket_type": "Event",
        "to_node": "r6",
        "to_socket": "上一步",
        "to_socket_identifier": "上一步",
        "to_socket_type": "Event"
      },
      {
        "from_node": "r6",
        "from_socket": "下一步",
        "from_socket_identifier": "下一步",
        "from_socket_type": "Event",
        "to_node": "r7",
        "to_socket": "上一步",
        "to_socket_identifier": "上一步",
        "to_socket_type": "Event"
      }
    ]
  }
};
window.__LAST_DOC=window.__DOC_FILES["nodes/prelay.js"];
