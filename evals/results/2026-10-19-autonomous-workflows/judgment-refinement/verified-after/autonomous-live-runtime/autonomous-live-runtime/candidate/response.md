已完成商品报价页与购买流程。

- 按用户/租户/商品隔离报价缓存，支持到期刷新与购买后失效。
- 服务端执行会话授权；查看者按钮禁用且购买接口仍拒绝。
- 安全渲染允许的商品描述，隐藏私有报价字段，报价失败返回不泄密的 502 页面。
- 支持 `en-US` / `fr-FR` 货币格式，无 JavaScript 时原生购买可用。
- 增强购买反馈：处理中禁用按钮，成功/失败通过可访问状态区通知。
- 技术设计已记录在 [quote-purchase-design.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-runtime-candidate-md4wbcej/docs/quote-purchase-design.md)。

验证通过：

- `node --test test/server.test.mjs` — 4 passed
- `npm run check` — 3 passed