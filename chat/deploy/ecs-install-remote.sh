#!/bin/bash
# ecs-install-remote.sh - 在 ECS 上从 /apim/codex.bundle 一键部署 Codex 桥
# 用法: bash ecs-install-remote.sh <RE_TOKEN> [APIM_URL]
set -e
TOKEN="${1:?需要 re/config.json 的 token}"
API="${2:-http://127.0.0.1/apim}"
APP=/home/ftpu/codex-chat
mkdir -p "$APP"
curl -fsS -X POST "$API" -H 'Content-Type: application/json' \
  -d "{\"token\":\"$TOKEN\",\"action\":\"codex.bundle\"}" -o /tmp/codex-bundle.json
node -e '
const fs=require("fs"),path=require("path");
const j=JSON.parse(fs.readFileSync("/tmp/codex-bundle.json","utf8"));
if(!j.ok) throw new Error(j.error||"bundle failed");
for(const f of j.files){const p=path.join("/home/ftpu/codex-chat",f.path);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,Buffer.from(f.b64,"base64"));}
console.log("wrote "+j.files.length+" files");
'
bash "$APP/chat/deploy/install-ecs.sh"
