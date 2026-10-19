# 商品报价与购买技术设计

## 需求与既有事实

`/products/sku1` 必须为已登录用户展示其所属租户和账户的报价；报价到期前可复用，购买成功后仅使该用户的报价失效。买家可以购买，查看者只能查看；权限始终由服务端会话决定，表单字段与查询参数不能提升权限。页面需以 `en-US` 或 `fr-FR` 展示货币、以平台允许的白名单格式显示描述，并在无 JavaScript 时仍可完成购买。服务端平台已提供会话、权限、报价、购买、时钟及描述格式化能力。

服务端只向浏览器发送展示和操作所需的字段；服务令牌、成本和上游错误详情不会离开服务端。购买是不可重复的命令：页面和增强脚本会阻止同一页面上的重复激活，但服务端仍以会话授权为准。

## 实施顺序（3 步）

1. 在 `server/app.mjs` 建立按 `tenantId:userId:sku` 隔离、以 `validUntil` 判定到期的报价读取器，并将上游异常转换为不泄密的 502 页面。完成条件：两位用户的报价独立、到期后重新读取、失败不是零价格。
2. 在同一服务端入口实现页面渲染和 `POST /api/buy`：鉴权后执行 `purchase` 并删除该用户报价缓存；普通表单返回确认页面，JSON 客户端收到确认结果。完成条件：查看者/未登录被拒绝、购买后下一次报价刷新、原生表单能看到确认。
3. 在 `src/app.mjs` 为原生表单添加增强反馈：请求期间禁用按钮，成功或失败都在实时状态区公布，并在网络/服务失败时恢复可重试状态。完成条件：浏览器购买显示可访问反馈，失败不伪装成成功。

## 代码契约与所有权

- `createApp(services)` 继续是 HTTP 边界和依赖注入点。它拥有请求路由、会话/权限响应、按身份的报价缓存及缓存失效。
- `getCachedQuote(sku, session)`（`server/app.mjs` 内部）只在缓存仍满足 `validUntil > services.now()` 时复用数据；缓存键包含完整授权身份，返回仍是平台报价对象，且只由服务端消费。
- `renderQuotePage(services, quote, locale, canBuy)` 和 `renderConfirmationPage(locale)` 只生成安全的 HTML。前者使用 `services.descriptionHtml` 与 `services.escapeHtml`，货币由 `Intl.NumberFormat(locale, { style: 'currency', currency })` 格式化；没有购买权限时输出禁用的原生按钮及原因。它们不序列化整份平台对象。
- `POST /api/buy` 的效果顺序是：确认会话和 `canBuy`、执行 `purchase('sku1', session)`、删除同一身份的缓存、发布成功响应。购买确认后，不再依赖报价刷新来宣告购买失败；下次商品请求再读取新报价。
- `src/app.mjs` 仅拥有当前页面的 pending/状态文本。它发送现有表单的 URL 编码内容并接受 JSON；不会承担授权、金额或商品身份决定。

## 技术架构

```text
浏览器（原生表单 / app.mjs）
        | GET /products/sku1?lang=…       | POST /api/buy
        v                                 v
createApp(services) ──readSession/canBuy──> platform
        |                                      |
        | getCachedQuote / cache invalidation   | getQuote / purchase
        v                                      v
安全 HTML 页面 / JSON 确认 <─────────────── 平台数据
```

## 数据流：购买

```text
用户激活 Buy
  -> HTML form POST /api/buy（无 JS）或 app.mjs fetch（JS；按钮 pending）
  -> createApp 读取 session
     -> 无 session：401；非 buyer：403
     -> buyer：services.purchase('sku1', session)
        -> 删除 tenantId:userId:sku 的缓存
        -> JSON { ok: true } 或确认 HTML（role=status）
  -> app.mjs 发布 “Purchase accepted” 并恢复按钮
     -> 当前请求失败：发布 “Purchase failed”，恢复可重试按钮
  -> 后续 GET：缓存未命中，services.getQuote 产生更新报价
     -> 上游失败：502 “Quote unavailable”，不显示私有详情
```

## 验证与演进

现有 Node 测试覆盖身份/到期、授权/失效、私有数据与上游失败；Playwright 覆盖无脚本原生购买、查看者限制、描述安全和增强反馈。已执行 `node --test test/server.test.mjs`（4 通过）和 `npm run check`（3 通过）。若未来加入多个 SKU，只需将路由解析出的受支持 SKU 传给缓存键和平台调用；不会改变身份缓存或购买授权边界。

实施后，需将本设计中的内部名称、流程和检查结果与实际代码交叉核对。
