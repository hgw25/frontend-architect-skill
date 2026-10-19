已完成商品报价页与购买流程。

- 服务端实现了按用户/租户隔离、到期失效的报价缓存，以及购买后的定向失效。
- 私有报价字段不再下发；描述按平台允许的富文本安全输出。
- 买家可购买，viewer 显示禁用购买操作；服务端强制授权并忽略浏览器传入的 SKU。
- 支持 `en-US` / `fr-FR` 价格显示、无脚本原生购买、JS 提交中与失败反馈。
- 新增技术设计文档：[quote-purchase-design.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-runtime-candidate-t7bfa2y0/docs/quote-purchase-design.md)

验证通过：

- `npm run check` — 3 个浏览器测试通过
- `node --test test/server.test.mjs` — 4 个服务端测试通过