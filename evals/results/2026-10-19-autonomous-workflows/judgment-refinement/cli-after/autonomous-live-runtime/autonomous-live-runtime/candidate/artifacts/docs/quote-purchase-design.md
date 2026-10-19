# 商品报价与购买技术设计

## 需求与已知事实

目标是在 `GET /products/sku1` 展示当前登录用户的商品报价，并在
`POST /api/buy` 完成一次购买。报价的身份边界是 SKU、租户和用户，直到
`validUntil` 前可复用；购买成功后只使该用户的报价失效。报价页在无 JavaScript
时仍须可读可提交，浏览器脚本只负责提交中的状态及结果反馈。

已检查的事实：`platform.mjs` 已提供会话、`canBuy`、报价、购买、时钟及允许
`p`、`strong`、`em` 的 `descriptionHtml`；原始 quote 还包含服务令牌和成本，不能
序列化到 HTML。价格依赖用户，现有全局缓存会跨用户泄露。平台的购买函数不自行
授权，因此 `/api/buy` 必须在服务端检查会话与买家角色，且不能信任表单 SKU。

范围内的规则：未登录返回 401；viewer 可读但没有购买入口；报价失败显示明确失败
且不伪造价格；购买失败保留可重试的表单。接受 `en-US` 和 `fr-FR` 的价格格式。

## 功能分解（4 个有依赖的步骤）

1. **报价读取与安全投影** — 在 `server/app.mjs` 新建按 `tenantId/userId/sku`
   键控的到期缓存，并将 `getQuote` 结果投影为仅供页面的 `name`、格式化价格和经
   `descriptionHtml` 处理的描述。检查：两个用户分别请求时金额独立，响应不含
   `serviceToken` 或 `internalCost`，恶意描述不会执行。
2. **页面与渐进增强基线** — 服务端生成语义化商品内容、买家原生 POST 表单和状态
   区域；增加 CSS 布局。检查：禁用脚本时内容、价格和原生购买仍可用；窄屏与长文本
   不截断；viewer 无购买操作。
3. **授权购买与缓存失效** — 只在 `POST /api/buy` 调用购买，服务端以会话角色决定
   是否允许，忽略浏览器传来的 SKU，成功时失效该身份报价。检查：viewer 或未登录
   不能购买；成功后下次报价增加；另一用户仍使用自己的缓存。
4. **浏览器反馈与验证** — `src/app.mjs` 在提交期间禁用按钮，发布一次成功或失败
   提示并重新启用失败的命令。检查：连续激活不会发出重叠购买；网络失败显示失败；
   `node --test test/server.test.mjs` 和 `npm run check` 通过。

## 合同与职责

| 所有者 | 合同 | 职责与失败语义 |
| --- | --- | --- |
| `server/app.mjs` / `createApp(services)` | `GET /products/sku1`、`POST /api/buy` | 持有每个 app 实例的 quote cache 和一次性购买确认；服务端投影私有 quote；授权购买；购买后删除该用户缓存。上游报价失败返回 502，未授权购买返回 403。 |
| `formatPrice(amount, currency, locale)`（私有） | number/string + 请求 locale → 格式化字符串 | 仅允许 `fr-FR`，其余回退 `en-US`，以避免请求头影响服务端默认区域设置。 |
| `src/app.mjs` / `enhancePurchaseForm(form)` | 原生 form → 事件处理器 | 仅拥有浏览器的 pending 与状态文本；提交使用既有 form action；成功保留确认，失败恢复可提交状态。 |
| `server/platform.mjs`（复用） | `readSession`、`canBuy`、`getQuote`、`purchase`、`now`、`descriptionHtml` | 平台仍是会话、角色、商品操作和允许富文本格式化的来源。 |

对于购买，重复激活在 pending 时应无效果：客户端禁用可避免同一页面的重复命令，
服务端授权仍是权威。没有幂等键的请求超时是未知结果，界面不能声称购买失败后
安全重试；本实现只将明确的非成功响应或网络拒绝显示为失败。实际的后续变化（支持
更多 SKU）只需将当前受控 SKU 常量替换为路由解析和授权的 SKU，不改变 cache key、
投影或购买边界。

## 技术架构

```text
[Browser]
  GET /products/sku1 ───────► [createApp]
                                  │ readSession / cache key
                                  ├──────────────► [platform.getQuote]
                                  │                    │ raw quote
                                  ◄────────────────────┘
                                  │ safe quote projection + descriptionHtml
  ◄──────── semantic HTML + form ─┘
  POST /api/buy (native or enhanced) ─► [createApp]
                                          │ readSession + canBuy
                                          ├──────────────► [platform.purchase]
                                          └── delete identity cache key
  ◄──────────── JSON / redirect ─────────┘

[src/app.mjs] depends only on the rendered native form and status region; it
does not receive quote internals, roles, or authority to purchase.
```

## 数据流

```text
request cookie + `lang=fr-FR` / Accept-Language
  → readSession → (tenantId,userId,sku) cache key
  → valid cache ? safe page projection : getQuote(sku,session)
  → cache raw server-only quote until validUntil
  → formatPrice + descriptionHtml → HTML visible to user
  → native form submit / JS fetch → POST /api/buy
  → readSession + canBuy ? purchase('sku1',session) : 403
  → success: delete only caller key → JSON confirmation 或一次性重定向确认 → live status text
  → explicit failure: HTTP error / rejected fetch → enabled form + failure status
```

## 验证与演进

实现后运行既有服务器和浏览器检查，并添加聚焦服务器合同的测试：隔离缓存、私有
字段、授权、购买失效、locale 与安全描述。用浏览器检查提交状态、失败恢复和无脚本
基线。设计中的 Mermaid 替代为自包含文本图，避免引入未验证的图表工具。
