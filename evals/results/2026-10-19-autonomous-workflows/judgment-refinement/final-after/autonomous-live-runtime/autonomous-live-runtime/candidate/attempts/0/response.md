已完成商品报价页与购买操作。

- 服务端按用户、租户与有效期缓存报价；购买后仅失效当前用户报价。
- 服务端强制购买权限，隐藏字段和查询参数不能授权。
- 安全渲染允许的商品描述格式，私有 token/成本不再输出到浏览器。
- 支持 en-US/fr-FR 价格、无 JavaScript 原生购买及可访问的增强状态反馈。
- 新增设计记录：[product-quote-purchase-design.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-runtime-candidate-fgf75_fc/docs/product-quote-purchase-design.md)

验证已通过：

- `node --test test/server.test.mjs`：4 项通过
- `npm run check`：3 项 Playwright 通过