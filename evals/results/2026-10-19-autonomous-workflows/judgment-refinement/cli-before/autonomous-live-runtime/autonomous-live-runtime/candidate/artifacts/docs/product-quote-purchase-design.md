# 商品报价与购买流程设计

## 范围与已知事实

目标是让已登录用户在 `/products/sku1` 查看其当前报价并完成购买。`server/platform.mjs`
是权威平台契约：报价按租户和用户变化，携带 `validUntil`；`canBuy(session)` 才能授权购买；
`purchase` 成功后该用户的下一次报价会变化。报价里的服务令牌和成本不得进入浏览器；描述仅可
使用平台提供的 `descriptionHtml` 进行受限格式化。支持 `en-US` 与 `fr-FR`，无 JavaScript 时仍能
阅读报价并提交购买表单。

## 实施步骤（3 项，按依赖顺序）

1. **服务端报价边界** — 在 `server/app.mjs` 增加按 `tenantId:userId:sku` 隔离且以
   `validUntil` 为准的缓存；通过显式展示模型筛选公开字段、格式化货币、转义名称并格式化描述。
   完成检查：不同用户/过期报价各自重新获取，私密字段与危险标记不在 HTML 中。
2. **购买边界与回退页面** — `POST /api/buy` 仅从服务端会话和 `canBuy` 决定权限，固定支持的
   sku；成功后只失效该用户对应缓存。JSON 请求返回机器可读结果，原生表单返回带状态消息的商品页；
   上游异常返回通用失败信息。完成检查：访客为 403、未登录为 401，成功后本用户价格刷新而其他用户不变。
3. **渐进增强反馈** — `src/app.mjs` 拦截可用的表单提交，提交期间禁用按钮并将 API 成功或失败写入
   `role=status`；网络异常同样可见，未加载脚本时仍走步骤 2 的原生表单。完成检查：浏览器点击能得到可访问反馈，禁用脚本的提交能呈现成功页。

## 契约与所有权

- `createApp(services)` 拥有请求路由、报价缓存和 HTTP 错误呈现；缓存值是原始平台报价，仅服务器可见。
  `loadQuote(sku, session)` 的结果只在当前用户/租户/sku 且 `validUntil > services.now()` 时复用。
- `renderProductPage({ quote, locale, canPurchase, status })` 只接收已筛选展示模型；它使用
  `services.descriptionHtml`，不直接信任描述字符串。
- `POST /api/buy` 调用 `services.purchase('sku1', session)` 的唯一条件是有效会话和
  `services.canBuy(session)`；成功后删除该会话的缓存键。浏览器字段不影响授权或 sku。
- 客户端 `enhancePurchase(form)` 只拥有交互中的按钮状态和状态文字；它不持有报价、权限或授权决定。

## 技术架构

```text
浏览器（无脚本表单 / app.mjs）
          | GET /products/sku1, POST /api/buy
          v
server/app.mjs: createApp
  |-- loadQuote -> 按身份报价缓存 -> platform.getQuote
  |-- renderProductPage -> HTML + 安全展示模型
  `-- authorizePurchase -> platform.canBuy / platform.purchase
                                      |
                                      v
                              server/platform.mjs（会话、报价、购买）
```

## 数据流

```text
session cookie -> readSession -> session
session + sku -> loadQuote -> [有效缓存 | getQuote] -> 公开展示字段
公开字段 -> locale 货币格式化 + descriptionHtml -> 商品 HTML -> 用户可见报价

购买按钮 -> POST /api/buy -> readSession -> canBuy
  -> 拒绝: 401/403 + 通用状态
  -> 允许: purchase -> 删除身份缓存 -> JSON 状态（增强）或重新渲染成功商品页（原生）
  -> 上游失败: 502 + 不含私有错误的状态
```

## 验证与演进

使用现有 Node 服务测试覆盖身份/过期缓存、权限、购买失效、私密字段与上游失败；用 Playwright
验证无脚本原生购买、危险描述不执行及增强反馈。后续若加入另一 sku，只需将受支持 sku 的产品目录
和展示模型放在同一服务端边界；缓存键与购买授权不需要复制到客户端。

实际检查结果：`node --test test/server.test.mjs` 通过 4 项服务端契约检查；`npm run check`
通过 3 项 Playwright 运行时检查（含禁用脚本的原生购买、访客拒绝与增强反馈）。
