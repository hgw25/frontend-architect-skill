已完成商品报价页与购买流程。

- 服务端实现了按租户/用户/商品及有效期隔离的报价缓存、服务端购买授权、购买后的定向缓存失效与安全失败提示。
- 页面安全呈现受限富文本描述，隐藏私密报价字段，支持 `en-US` / `fr-FR` 货币格式。
- 无脚本时可原生提交购买表单；有脚本时提供提交中、成功和失败的可访问状态反馈。
- 技术设计已记录在 [product-quote-purchase-design.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-runtime-candidate-bxtk9jgb/docs/product-quote-purchase-design.md)。

验证通过：

- `node --test test/server.test.mjs`（4 项）
- `npm run check`（3 项 Playwright）