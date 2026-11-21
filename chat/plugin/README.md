# 微信通道来源与差异

本目录有两条通道，默认走**官方 iLink 扫码直连**：

## 1. 官方 iLink（默认，扫码即可）

- 上游：腾讯 `@tencent-weixin/openclaw-weixin` 2.4.10（MIT），源码在 `vendor/openclaw-weixin/`。
- 独立实现：`plugin/weixin.cjs`
  - 登录：`POST https://ilinkai.weixin.qq.com/ilink/bot/get_bot_qrcode?bot_type=3` → `qrcode/qrcode_img_content`
  - 状态：`GET /ilink/bot/get_qrcode_status?qrcode=...`（长轮询）→ `wait/scaned/confirmed/expired/scaned_but_redirect`
  - 收消息：`POST {baseurl}/ilink/bot/getupdates`（`get_updates_buf` 增量，35s 长轮询）
  - 发消息：`POST {baseurl}/ilink/bot/sendmessage`（`message_type=2,message_state=2,item_list[{type:1,text_item}]`）
  - 头：`iLink-App-Id: bot`、`iLink-App-ClientVersion`、`AuthorizationType: ilink_bot_token`、`Authorization: Bearer <bot_token>`、`X-WECHAT-UIN`
- **不需要 API Key / 代理 / webhook**。扫码确认后 token 存 `chat/data/weixin.json`，随后长轮询收消息。
- 依赖 Node >= 20 的 fetch；无 openclaw SDK 依赖。

## 2. 苍何代理（可选 fallback）

- 上游：`freestylefly/openclaw-wechat`（MIT），源码在 `vendor/openclaw-wechat/`。
- 独立实现：`plugin/wechat.cjs`。保留 `/v1/iPadLogin`、`/v1/sendText`、`60001/80001` webhook 等协议。
- 需要苍何代理 `apiKey + proxyUrl`；仅当没有官方 iLink 环境时使用。

`chat/config.json` 的 `wechat.provider` 选择：`ilink`（默认）/ `canghe`。
