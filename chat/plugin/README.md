# 微信通道来源与差异

- 上游：`https://github.com/freestylefly/openclaw-wechat`（MIT），OpenClaw/龙虾 微信 Channel 插件，包名 `@canghe/openclaw-wechat`。
- 本目录 `vendor/openclaw-wechat/` 保留上游 `src/`、`index.ts`、`openclaw.plugin.json`，仅用于协议对照与许可证留存。
- 本目录 `plugin/wechat.cjs` 是**去 SDK 独立化**实现：
  - 保留：`ProxyClient` 的 `/v1/iPadLogin`、`/v1/getIPadLoginInfo`、`/v1/sendText`、`/v1/sendImage2`、`/v1/getAddressList`、`/v1/webhook/register`；`60001/80001` 消息映射；`data.*` 与扁平负载两种 webhook 格式；`newMsgId` 去重；2000 字分段。
  - 去掉：`openclaw/plugin-sdk` 的 routing/reply dispatcher；改为 `onMessage` 回调，由 `chat/bridge.cjs` 转发给 Codex。
  - 增强：webhook 同时挂在 bridge 端口 `/webhook/wechat`，便于单端口穿透；登录轮询状态可查询；`registerWebhook` 同时带 `wcId`。
- 上游许可证：MIT（见 `vendor/openclaw-wechat/package.json` 与 README）。
