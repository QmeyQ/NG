# install-ecs.sh - 在阿里云 ECS(root) 安装 Codex 聊天桥
# 前置: /tmp/codex-chat.tar.gz 已上传(含 chat/ 与 server/re/codex.js)
set -e
APP=/home/ftpu/codex-chat
mkdir -p "$APP"
tar xzf /tmp/codex-chat.tar.gz -C "$APP"
cd "$APP"
# 使用系统 node(>=20); 若无则安装
command -v node >/dev/null 2>&1 || { curl -fsSL https://deb.nodesource.com/setup_20.x | bash -; apt-get install -y nodejs; }
mkdir -p chat/data
[ -f chat/config.json ] || cp chat/config.example.json chat/config.json
# 生成 token
node -e "const fs=require('fs'),c=require('crypto');const p='chat/config.json';const j=JSON.parse(fs.readFileSync(p));j.token=j.token||('cx-'+c.randomBytes(12).toString('hex'));j.host='127.0.0.1';fs.writeFileSync(p,JSON.stringify(j,null,2));"
cat > /etc/systemd/system/codex-chat.service <<'EOF'
[Unit]
Description=Codex chat bridge
After=network.target
[Service]
Type=simple
WorkingDirectory=/home/ftpu/codex-chat
ExecStart=/usr/bin/node /home/ftpu/codex-chat/chat/bridge.cjs
Restart=always
RestartSec=3
Environment=NODE_ENV=production
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now codex-chat
systemctl status codex-chat --no-pager | head -8
echo "OK: curl -H 'X-Cx-Token: <token>' http://127.0.0.1:21121/api/status"
