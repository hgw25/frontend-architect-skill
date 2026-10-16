## 结论

建议只重构商品详情路由：把页面恢复为 Server Component，将规格选择和加入购物车收缩成一个 Client Component 岛。商品详情、SEO、货币上下文、Shopify 调用和缓存留在服务端；推荐商品作为独立的流式区域。无需改写其他页面。

当前工作区没有应用源码、`package.json` 或 Next.js 版本，因此以下是可执行的迁移设计，不声称对应了仓库中已有文件或 API。

## 目标边界

建议目录仅作落地示意：

```text
app/products/[handle]/
  page.tsx                       # Server Component
  loading.tsx                    # 路由导航骨架
  error.tsx                      # 核心商品失败后的重试
  not-found.tsx
  ProductPurchasePanel.client.tsx
  Recommendations.tsx           # async Server Component
  actions.ts                     # Server Actions

lib/shopify/
  server.ts                      # 私有凭据、GraphQL transport
  product.ts                     # 查询、校验、DTO、缓存策略
  cart.ts
```

Next.js 页面默认可以是 Server Component，只有使用状态、事件或浏览器 API 的叶子组件需要 `"use client"`；跨越边界的 props 必须可序列化。[Next.js Server/Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

职责划分：

| 能力 | 放置位置 | 原因 |
|---|---|---|
| 商品查询、市场价格、SEO 数据 | Server Component / server-only 数据层 | 首屏 HTML、索引、凭据保护 |
| 推荐商品查询 | 独立 async Server Component | 可延迟、可局部降级 |
| 规格选择、当前变体推导 | Client Component | 即时本地交互，不需要网络 |
| 加入购物车 | Server Action | 服务端校验和 Shopify 私有调用 |
| 购物车确认结果 | Client Component 的 action 状态 | pending、成功、失败均有明确所有者 |

`lib/shopify/server.ts` 应使用 `import 'server-only'`，私有 token 使用非 `NEXT_PUBLIC_` 环境变量。Shopify 明确要求私有 Storefront token 仅用于服务端，并通过 `Shopify-Storefront-Private-Token` 请求头发送。[Shopify Storefront API](https://shopify.dev/docs/api/storefront/latest)

## 渐进式迁移

### 1. 先建立服务端数据边界

不立即重写 JSX，先把现有商品和推荐请求移入 server-only Shopify gateway：

- 固定受支持的 Shopify API 版本。
- 统一处理 HTTP 错误、GraphQL `errors` 和响应结构校验。
- 将 Shopify edges、SDK 实例和原始响应转换为页面 DTO。
- 若请求来自买家流量且部署环境能可靠取得原始 IP，由服务端设置 Shopify buyer-IP 请求头；不能信任浏览器自行提交的该请求头。
- 保留旧客户端页面作为临时消费者时，只允许它调用现有受控服务端接口，不能直接获得私有 token。

建议 DTO：

```ts
type MoneyDTO = {
  amount: string
  currencyCode: string
}

type VariantDTO = {
  id: string
  availableForSale: boolean
  selectedOptions: Array<{ name: string; value: string }>
  price: MoneyDTO
}

type ProductPageDTO = {
  id: string
  handle: string
  title: string
  description: string
  featuredImage: { url: string; alt: string | null } | null
  options: Array<{ name: string; values: string[] }>
  variants: VariantDTO[]
}
```

不要跨边界传 Shopify client、`Response`、`Headers`、`Error`、函数、秘密、未筛选的原始记录或依赖特殊原型的对象。金额保留 Shopify 返回的十进制字符串和 `currencyCode`，不要先转成 JS 浮点数。

### 2. 将商品路由改回 Server Component

`page.tsx` 完成：

1. 解析并规范化 `handle`、国家/市场和语言。
2. 服务端取得商品。
3. 不存在时调用 `notFound()`。
4. 输出标题、描述、图片、价格、可用性等首屏内容。
5. 仅把规格交互所需 DTO 传给 `ProductPurchasePanel.client.tsx`。

`generateMetadata` 与页面复用同一个商品 loader，产生 title、description、canonical、Open Graph。它只能定义在 Server Component 中。[Next.js generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)

如需 Product JSON-LD，只从白名单 DTO 构造；不要直接注入 Shopify HTML。序列化到 `<script>` 时至少转义 `<`，商品正文优先使用纯文本字段；确需 `descriptionHtml` 时在明确的服务端边界使用成熟 allowlist sanitizer。

### 3. 收缩客户端交互岛

`ProductPurchasePanel.client.tsx` 只保存最小交互状态：

- 用户选中的 option 值；
- 加购物车 action 的 pending/result 状态。

当前 variant、价格、库存和按钮可用性都由 `variants + selection` 派生，不再通过 `useEffect` 复制或重新请求商品。

加入购物车提交 `merchandiseId` 和 quantity。服务端必须重新验证：

- variant ID 属于当前商品；
- quantity 范围合法；
- 当前会话/购物车允许修改；
- 价格、折扣和库存以 Shopify 响应为准，绝不接受客户端价格。

提交期间阻止同一按钮的重复触发；成功后用 mutation 返回的权威 cart 数据更新数量。超时属于“结果未知”，不要盲目重复非幂等 mutation，应先重新读取购物车或向用户明确提示确认。

### 4. 独立流式加载推荐商品

商品主体不应等待推荐：

```tsx
<ProductDetails product={product} />

<Suspense fallback={<RecommendationsSkeleton />}>
  <Recommendations promise={recommendationsPromise} />
</Suspense>
```

商品与推荐都可按 handle 查询，因此可以在页面开始时并行启动；页面只先等待商品，推荐在自己的边界中继续等待。

`Suspense` 只处理 pending，不处理失败。建议：

- 推荐请求的可恢复上游错误在 `Recommendations` 内记录脱敏诊断，然后渲染“暂时无法加载推荐”和重试控件。
- 核心商品的暂时性失败交给该路由的 `error.tsx`，`reset()` 重试。
- 商品确实不存在走 `not-found.tsx`，不能伪装成网络错误。
- 推荐失败不能拖垮商品主体。

## 货币与缓存

Shopify 国际价格以国家/Market 上下文查询，不应在浏览器把基础价格自行换汇。对商品和推荐查询统一使用 `@inContext(country: ...)`；Shopify 会返回该国家上下文中的价格和可售商品。[Shopify contextual queries](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/in-context)

国家来源按项目已有契约选择：

1. 已有国家/市场 URL 段时优先使用它，SEO 和缓存身份最清楚。
2. 否则读取服务端设置的偏好 cookie。
3. 再考虑可信部署平台提供的地理信息。
4. 最后回退到店铺主市场。

不要在 hydration 后根据 `navigator.language` 突然改价。货币选择器应通过 Server Action 更新国家偏好并 `refresh` 或跳转到市场 URL。购物车的 buyer identity country 必须与展示价格上下文一致。

缓存表：

| 数据 | 作用域与 key | 失效 |
|---|---|---|
| 公共商品详情 | `handle + country + language` | TTL，加 Shopify 商品/库存 webhook 精确失效 |
| 推荐商品 | `productId/handle + country + language + intent` | 独立 TTL；商品或推荐配置变化时失效 |
| SEO 商品数据 | 复用商品 loader | 与商品详情同一标签 |
| 普通买家购物车 | session/request，禁止公共共享缓存 | 每次 mutation 以后采用返回值或重新读取 |
| B2B/登录买家上下文价格 | 用户/公司作用域，通常不进公共缓存 | 身份或公司上下文改变即失效 |

私有 token 的存在不代表公开商品响应不能共享缓存；决定因素是响应是否依赖用户身份。反过来，B2B 价格即使形状相同也不能放入公共 key。

具体缓存 API必须在确认项目 Next.js 版本后选择：

- 已启用当前 Cache Components：使用 `'use cache'`、`cacheLife`、`cacheTag`。
- 旧缓存模型：使用 `fetch(..., { next: { revalidate, tags } })`。
- 不要在一次迁移中混用两套模型制造不清晰的所有权。

当前 Next.js 文档推荐目录内容用 `revalidateTag(tag, 'max')` 做 stale-while-revalidate；需要 read-your-own-writes 的 Server Action 才使用 `updateTag`。[Next.js revalidation](https://nextjs.org/docs/app/getting-started/revalidating) Shopify webhook 应先验证签名，再失效 `product:{id}` 和相关 recommendation tag。没有 webhook 时明确采用业务可接受的 TTL，而不是宣称实时。

## 验证门槛

落地后至少验证：

- 类型检查、lint、生产构建及项目既有测试通过。
- 初始 HTML 在执行客户端 JS 前包含商品名称、正文、有效市场价格和 SEO metadata。
- 两个国家返回不同价格时，缓存没有跨国家串值；货币选择后页面与购物车 buyer identity 一致。
- 页面 hydration 后不再发起商品详情请求，浏览器也从不直接请求带私有凭据的 Shopify API。
- 检查客户端 bundle、RSC payload、日志和 source map 中均不存在 token。
- 规格组合正确映射 variant；不可售组合禁用购买。
- 连续点击只产生受控提交；成功采用 Shopify 返回的 cart，失败保留用户选择并可恢复。
- 推荐延迟或失败时，商品主体仍能显示和操作。
- 商品 404、Shopify HTTP 错误、GraphQL errors、超时和 action 业务拒绝分别走正确恢复路径。
- webhook 签名无效时不失效缓存；有效商品更新只失效对应标签。
- 用真实浏览器检查 hydration warning、键盘操作、pending 状态和路由重试；迁移前后比较客户端 JS 体积及首屏请求瀑布。

推荐按“服务端 gateway → Server 页面与 SEO → 客户端交互岛 → 推荐 Suspense → cart action → 缓存与 webhook”分批提交。每一步都可独立回退，也不会要求把其他页面一并迁移。此次仅形成方案，未修改工作区文件，也没有可运行的应用验证。