# 商品报价与购买技术设计

## 目标与已确认事实

完成 `/products/sku1` 的报价展示及购买操作。报价由平台按会话身份返回，含 `validUntil`；购买成功后仅该用户的报价失效。页面须支持 `en-US` 与 `fr-FR`、在无 JavaScript 时可阅读和购买，并让 viewer 可看不能买。平台已提供会话、`canBuy`、报价、购买、时钟及描述格式化；浏览器不能得到服务 token 或内部成本。

服务端是报价和授权的唯一权威：查询参数、隐藏字段及浏览器按钮都不参与授权。`descriptionHtml` 是富文本白名单边界；它的输出才可以进入 HTML。服务故障显示普通可行动错误，不透露上游细节。

## 实施序列（3 步）

1. **服务端报价页（`server/app.mjs`）**：按 `tenantId/userId/sku` 缓存报价，在 `validUntil` 后重取；格式化白名单语言的价格，安全渲染名称和描述。完成检查：不同用户独立、到期刷新、法语价格与安全描述可见。
2. **购买命令（`server/app.mjs`）**：`POST /api/buy` 先检查登录和 `canBuy`，成功后删除当前身份的报价缓存；JSON 客户端得到确认，原生表单得到带状态文本的完整页面。完成检查：viewer 和匿名被拒绝，成功购买后同用户看到新报价、其他用户不刷新。
3. **渐进增强（`src/app.mjs`）**：拦截可购买表单，提交期间禁用按钮并在状态区报告结果；网络/服务失败后恢复按钮。完成检查：可访问状态反馈、重复点击不重复提交，无脚本路径仍有效。

## 契约与归属

| 能力 | 操作与拥有者 | 契约 |
| --- | --- | --- |
| 报价缓存 | `createApp` 闭包中的 `quoteCache` | key 为 `tenantId:userId:sku`；仅在 `quote.validUntil > services.now()` 时复用。 |
| 页面渲染 | `renderProductPage(quote, session, locale, status)` | 仅接收已取到的报价；将价格、已格式化描述和可购买状态表现为语义 HTML。 |
| 购买 | `handlePurchase`（`createApp` 内） | 忽略请求表单中的授权字段；服务端验证会话与 `canBuy`，成功才使该用户缓存失效。 |
| 浏览器反馈 | `src/app.mjs` 的 submit listener | 只拥有按钮 pending 状态和状态文字；不承担授权，也不缓存报价。 |

选择 `Map` 而非全局单报价，令身份、租户与商品成为缓存身份的一部分，并让每个 `createApp(services)` 测试实例独立。购买是不可重复命令：浏览器在请求未完成时禁用提交；服务端仍是最终效果边界。

## 技术架构

```text
Browser (native form / enhanced fetch)
  | GET /products/sku1, POST /api/buy
  v
createApp in server/app.mjs
  |-- readSession + canBuy ------> platform session policy
  |-- quoteCache (identity + expiry)
  |-- getQuote / purchase ------> platform service
  `-- renderProductPage --------> safe HTML response

src/app.mjs depends only on rendered <form> and [role=status]
```

## 数据流

```text
GET + session -> readSession -> cache key -> valid quote? --yes--> render price
                                         | no
                                         v
                                  getQuote -> cache -> render safe description

POST /api/buy -> session/canBuy? --no--> 401/403 + visible failure
                         | yes
                         v
                    purchase -> delete caller cache -> confirmation
                         |                         |-- JSON -> enhanced status
                         |                         `-- HTML -> native status page
                         `-> upstream failure -> 502 generic error (no details)
```

## 验证与演进

已执行 `node --test test/server.test.mjs`（4 项通过）和 `npm run check`（3 项 Playwright 通过），覆盖身份隔离、到期、权限、敏感字段、无脚本购买和增强反馈。实际后续变化“新增 SKU”只需由路由/调用方提供 SKU；缓存键和购买失效已经包含 SKU，不需要通用缓存框架。实现完成后以符号搜索核对本文件中的操作和调用关系。
