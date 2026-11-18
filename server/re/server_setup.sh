#!/bin/bash
# re-relay 服务器端配置: 给站点 nginx 增加 /apim 反代到 frp 隧道口 127.0.0.1:5001。
# 幂等: 已配置则跳过。在 ECS Workbench(已登录)里以 root/sudo 运行: bash server_setup.sh
set -e
echo "== 查找含 htlml 站点根的 nginx 配置 =="
CONF=""
for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf /etc/nginx/nginx.conf; do
  [ -f "$f" ] || continue
  if grep -q "htlml" "$f"; then CONF="$f"; break; fi
done
if [ -z "$CONF" ]; then echo "未找到含 htlml 的 nginx 配置, 请手动指定"; exit 1; fi
echo "站点配置: $CONF"

if grep -q "location /apim" "$CONF"; then
  echo "/apim 已存在, 跳过插入"
else
  echo "== 备份并插入 /apim location =="
  cp "$CONF" "$CONF.bak.re"
  # 在 root ...htlml... 行后插入 location 块(单行合法 nginx), 保持位于 server 块内
  sed -i '/root[[:space:]].*htlml/a\    location /apim { proxy_pass http://127.0.0.1:5001/; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_read_timeout 300s; proxy_send_timeout 300s; client_max_body_size 64m; }' "$CONF"
  echo "已插入"
fi

echo "== 校验 nginx 配置 =="
nginx -t
echo "== 重载 nginx =="
systemctl reload nginx || nginx -s reload
echo "== 确认 frps 在跑(bindPort 7000) =="
(systemctl status frps --no-pager 2>/dev/null | head -3) || (ps aux | grep -i frps | grep -v grep | head -3) || echo "请确认 frps 已运行"
echo "== 本机自测 /apim =="
curl -s -m 10 http://127.0.0.1/apim | head -c 200 || echo "自测失败(隧道未连?)"
echo ""
echo "== 完成: 外部 POST http://47.119.120.119/apim 即达本机 relay =="
