结论：只改商品详情路由，把页面恢复为 Server Component，并保留一个小型交互式 Client Island。商品、SEO、推荐和 Shopify 调用归服务端；规格选择与提交状态归客户端。其他页面不迁移、不抽取全站数据层。

仓库当前只有 `.frontend-architect` 和 Git 元数据，没有 Next.js 源码、依赖清单或测试配置，因此以下是可执行迁移设计，文件名需映射到真实项目；本次没有可安全修改的应用文件。

## 目标边界

以常见的 `app/products/[handle]` 为例：

```text
app/products/[handle]/
  page.tsx                    Server：编排、首屏商品、SEO 内容
  loading.tsx                 Server：路由导航骨架
  error.tsx                   Client：核心商品失败、reset 重试
  not-found.tsx               Server：商品确实不存在
  ProductConfigurator.tsx     Client：规格、数量、提交状态
  Recommendations.tsx         Server：推荐商品
  RecommendationsFallback.tsx
  actions.ts                  Server Actions：购物车、货币偏好

lib/shopify/
  server.ts                   server-only：凭据、GraphQL transport
  products.ts                 Server：查询与缓存策略
  mappers.ts                  Shopify 响应到内部 DTO
  types.ts                    可序列化领域类型
```

这只是职责布局，不要求新建同名目录；应优先复用真实项目已有的 Shopify、购物车和货币模块。Next.js 官方也建议让 `page.tsx` 保持 Server Component，只把需要状态和事件处理的叶子标为 Client Component；跨边界 props 必须可序列化。[Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

### Server Component

`page.tsx` 负责：

- 从路由、已验证 cookie 或现有市场解析逻辑得到 `MarketContext`。
- 在服务端查询 Shopify 商品。
- 商品不存在时调用 `notFound()`；上游故障则抛给 `error.tsx`，不能伪装成 404。
- 服务端输出 `h1`、描述、图片、当前市场价格和结构化数据。
- 只把规格交互所需的 DTO 传给 `ProductConfigurator`。
- 用独立 Suspense 边界渲染推荐商品。

`generateMetadata` 与页面复用同一个商品读取函数，生成 title、description、canonical、Open Graph。Metadata API 只能用于 Server Component，且相同 `fetch` 可在 metadata 与页面间复用。[generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)

### Client Component

`ProductConfigurator` 只拥有：

- 当前选中的 option values。
- 由 options 派生出的 variant，不另存一份 competing state。
- 数量、提交中状态和最近一次购物车结果。
- 规格按钮、库存提示、价格切换、加入购物车事件。

它不请求商品详情、不持有 Shopify token、不维护第二份长期商品缓存。初始 variant 必须由服务端参数或同一套确定性规则产生，避免 hydration 后价格跳变。

购物车通过既有服务端购物车接口或 Server Action 提交。服务端重新验证 `variantId`、数量、市场和可售状态；浏览器传来的价格不可信。Server Action 引用是框架支持的特殊边界值，不应把普通闭包或 Shopify client 作为 prop 传下去。

## 货币与 Shopify 契约

不要在浏览器按汇率换算。Shopify 的国际定价以市场国家为上下文，通过 `@inContext(country: …)` 返回该市场的实际金额和币种；购物车的 `buyerIdentity.countryCode` 也必须保持一致。[Shopify 国际定价](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/markets/international-pricing)

因此应定义：

```ts
type MarketContext = {
  countryCode: string
  currencyCode: string
  locale: string
}
```

界面可以显示“货币选择”，但内部必须映射到一个明确的 Shopify 市场/国家。仅以 `EUR` 为身份不够，因为多个国家可能同为 EUR，却有不同固定价格和商品发布范围。

切换货币时：

1. Server Action 验证目标市场属于店铺允许列表。
2. 写入现有偏好 cookie。
3. `router.refresh()` 获取新市场的 Server Component payload。
4. 尽量保留仍然存在的 variant 选择；如果该市场不售该 variant，明确要求重新选择。
5. 创建或更新购物车 buyer identity，结算前以 Shopify 返回结果重新定价。

私有 token 只在带 `import 'server-only'` 的模块读取，且不进入 `NEXT_PUBLIC_*`、客户端 import graph、HTML、日志或错误对象。Shopify 明确要求私有 Storefront token 仅用于服务端请求。[Storefront API authentication](https://shopify.dev/docs/api/storefront/latest)

## 序列化契约

传给客户端的 `ProductConfiguratorDTO` 应是白名单投影，例如：

```ts
type ProductConfiguratorDTO = {
  productId: string
  options: Array<{ name: string; values: string[] }>
  variants: Array<{
    id: string
    selectedOptions: Array<{ name: string; value: string }>
    availableForSale: boolean
    price: { amount: string; currencyCode: string }
    compareAtPrice?: { amount: string; currencyCode: string }
  }>
  locale: string
}
```

边界规则：

- 金额保留 Shopify decimal string；仅在格式化时转换，不在客户端做金额运算。
- 不传 GraphQL connection、SDK class、`Date`、函数、Error、Request/Response 或凭据。
- Shopify 响应只在 mapper 边界验证和规范化一次。
- 商品描述优先使用纯文本字段。确需 `descriptionHtml` 时，在服务端用项目已有的 allowlist sanitizer 处理，不能直接信任 `dangerouslySetInnerHTML`。
- JSON-LD 只由白名单字段生成，并将 `<` 转义为 `\u003c`，避免把 JSON 序列化误当成安全 HTML 输出。

## Suspense 划分

核心商品不是可选内容：`page.tsx` 先等待它，保证首屏、SEO、价格和 404 判定一致。

推荐商品独立且非关键：

```tsx
<ProductDetails product={product} />
<ProductConfigurator data={configuratorDTO} />

<Suspense fallback={<RecommendationsFallback />}>
  <Recommendations productId={product.id} market={market} />
</Suspense>
```

这样推荐慢时不会阻塞核心商品。`loading.tsx` 负责路由导航期间的整页骨架；不要给每个小查询都套 Suspense。若推荐失败，显示“推荐暂时不可用”和重试入口，同时记录可关联但不含敏感数据的诊断信息，不能静默返回空数组。

## 缓存作用域与失效

先确认真实 Next.js 版本，再选对应 API；当前官方文档区分 Next.js 16 Cache Components 和旧缓存模型。[Caching and Revalidating](https://nextjs.org/docs/app/getting-started/revalidating)

建议策略：

| 数据 | 作用域与 key | 新鲜度 | 失效 |
|---|---|---|---|
| 普通商品/价格 | 公共市场级：shop、API version、handle、country、language | 初始 5 分钟兜底 | Shopify product webhook 精确失效 |
| 推荐 | 市场级：productId、country、language | 15 分钟兜底 | 商品或推荐源变化时失效 |
| B2B/客户专属价格 | request/session，默认不进入共享缓存 | 每请求 | 不使用公共 tag |
| 购物车 | 用户/session | 每次 mutation 后读取权威结果 | mutation 自己负责更新 |

具体约束：

- 在读取 `cookies()` 之后得到 plain `MarketContext`，再把它作为参数传给缓存函数；缓存函数内部不要读取请求 cookie。
- 商品 tag 可采用 `product:{shop}:{handle}`，推荐 tag 采用 `recommendations:{shop}:{productId}`；国家必须进入 cache key。
- Next.js 16 使用 `use cache`、`cacheLife`、`cacheTag`；旧版本使用带 `next.tags/revalidate` 的 `fetch`，非 fetch client 才考虑 `unstable_cache`。
- Webhook Route Handler 必须先验证 Shopify HMAC，再调用 tag invalidation；不得接受浏览器传入任意 tag。
- 因 cookie 使完整页面成为 request-time 响应，不要公开缓存整页 HTML；市场级商品数据仍可单独共享。
- 多实例自托管时需确认 cache handler 能同步 tag invalidation，否则一个实例失效并不代表全部实例已失效。[Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
- 不在客户端再用 SWR/Query 长期镜像同一商品事实；购物车缓存是不同资源，可以保留。

## 渐进迁移顺序

1. **锁定现状契约**  
   记录现有 URL、默认规格、货币来源、购物车形态、404 与错误表现。若当前浏览器直接携带私有 token，先立即迁到已有服务端接口；若已经通过内部 API，则直接复用，不再增加中转层。

2. **建立 server-only Shopify gateway 与 DTO**  
   UI 暂时不变，只替换数据边界。验证客户端构建产物中不存在 token 和私有 header。

3. **仅转换商品 `page.tsx`**  
   移除页面顶层 `use client` 和商品 `useEffect`，加入服务端商品查询及 `generateMetadata`。其他页面保持原状。

4. **下沉交互岛**  
   把规格和加入购物车迁入 `ProductConfigurator`；删除已无调用方的旧 loading/error/product state 和 effect。

5. **拆出推荐流式边界**  
   推荐改为 Server Component + Suspense；确认失败只影响推荐区。

6. **最后启用持久缓存与 webhook 失效**  
   先观察正确性，再启用市场级缓存。确认版本 API、部署拓扑和 webhook 后，删除临时商品 API route。

每一步都能独立回滚，不需要为了 Server Components 改写列表页、搜索页、全局 store 或现有布局。

## 验证清单

- 禁用 JavaScript或直接检查首个 HTML：包含商品标题、描述、市场价格、canonical 和 JSON-LD。
- 同一 handle、不同国家返回正确 `currencyCode`；页面价格、所选 variant 和购物车 buyer identity 一致。
- 规格切换更新价格与可售状态；无效组合不可提交；失败后保留选择并重新启用按钮。
- 加购期间阻止并发重复提交；对结果不确定的非幂等请求不自动重放，先重新读取购物车再恢复。
- 推荐慢时核心商品先显示；推荐失败不会触发整页错误。
- Shopify 404、GraphQL error、超时分别进入正确的 404 或可重试错误路径。
- 缓存测试覆盖同市场命中、跨市场隔离、B2B 不共享、合法 webhook 失效、伪造 webhook 被拒绝。
- 运行真实项目既有的 typecheck、lint、单元/组件测试、生产构建和 E2E。
- 检查构建后的客户端 chunk、HTML、source map 与日志，确认不存在私有 token、Shopify 私有 header或完整上游错误体。