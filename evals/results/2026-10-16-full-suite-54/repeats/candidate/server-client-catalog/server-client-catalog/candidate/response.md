建议采用“先把取数移到服务端，再逐步缩小客户端边界”的迁移方式。只改商品路由及其共置模块，不重写布局、导航或其他页面。

当前工作区只有 `.frontend-architect` 和 `.git`，没有 Next.js 源码、`package.json` 或测试配置，因此以下是可执行的重构蓝图，不能据此断言项目使用了某个具体 Next.js 版本或缓存模式。

## 目标结构

以下文件名仅示意，落地时沿用项目现有目录约定：

```text
app/products/[handle]/
├── page.tsx                    # Server Component，页面编排和关键取数
├── loading.tsx                 # 首次访问/路由切换的关键内容骨架
├── error.tsx                   # Client Component，路由级错误恢复
├── not-found.tsx
└── _components/
    ├── product-content.tsx     # Server Component，标题、图片、描述
    ├── purchase-panel.tsx      # Client Component，规格、数量、加购状态
    ├── recommendations.tsx     # Server Component，独立流式加载
    └── recommendations-error.tsx

lib/catalog/
├── product-query.server.ts     # Shopify 查询、缓存策略
├── product-dto.ts              # 外部响应到页面 DTO 的映射与校验
└── market.server.ts            # 服务端解析市场/货币

app/actions/cart.ts              # Server Action，或复用现有服务端购物车接口
lib/shopify/client.server.ts     # import 'server-only'，持有私有凭据
```

`page.tsx` 恢复为默认 Server Component；只有真正需要状态、事件和浏览器 API 的规格选择与购物车交互保留 `"use client"`。这是 App Router 官方推荐的边界方式，且传给 Client Component 的 props 必须可序列化。[Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

## 分阶段迁移

### 1. 建立服务端数据边界，不立即拆掉旧 UI

先把 Shopify 请求抽到 `*.server.ts`：

- 文件首部使用 `import 'server-only'`。
- 凭据只读非 `NEXT_PUBLIC_` 环境变量。
- 禁止客户端模块、RSC payload、日志和异常信息携带 token。
- 在网络边界验证 Shopify 响应并映射成内部 DTO。
- 区分“商品不存在”“上游暂时失败”“响应结构无效”。

然后把原来的客户端页面内容移动为 `ProductPageClient`，由新的 Server `page.tsx` 取数后传入：

```tsx
export default async function ProductPage({ params }: PageProps) {
  const { handle } = await params
  const market = await resolveMarket()
  const product = await getProduct(handle, market)

  if (!product) notFound()

  return <ProductPageClient initialProduct={product} market={market} />
}
```

此阶段先删除商品详情的 `useEffect` 请求，保留原交互实现。这样一次改动就能获得服务端首屏和可靠的数据边界，同时保持回滚简单。

### 2. 补齐 SEO

在 Server `page.tsx` 导出 `generateMetadata`：

- title、description、canonical、Open Graph 图片来自商品数据。
- 商品不存在时与页面走同一套 `notFound()` 语义。
- 页面 HTML 中直接包含商品标题、描述、主图和可展示价格。
- 如输出 Product JSON-LD，只包含公开 DTO；序列化时转义 `<`，不要直接拼接未经处理的 Shopify HTML。

`generateMetadata` 只能从 Server Component 导出；相同 `fetch` 会由 Next.js 自动 memoize，非 `fetch` Shopify SDK 可用 React `cache()` 做单次请求内去重。[Next.js generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)

这里需要区分两类数据：

- SEO 核心信息：名称、描述、图片等公开且跨用户共享。
- 用户价格：由市场、国家、币种，甚至客户身份决定。

不要为了让 metadata 使用用户 cookie 而让所有 SEO 信息个性化。若站点已有市场化 URL，例如 `/zh-cn/products/x`，应以 URL 市场作为可索引价格上下文；个人货币偏好可以覆盖页面展示，但 canonical 保持稳定。

### 3. 缩小客户端组件

确认第一阶段稳定后，把 `ProductPageClient` 拆开：

- Server：标题、媒体、描述、面包屑、静态属性、推荐商品卡片。
- Client：规格选择、数量、可售状态派生、加购按钮及反馈。
- 不建立一份长期镜像商品状态；客户端只保存用户选择和 mutation 状态。
- 选中变体、展示价格和库存状态从同一份 variant DTO 派生，避免多个 `useState` 相互漂移。

传给客户端的 DTO 应是显式最小集合，例如：

```ts
type ProductPurchaseDTO = {
  productId: string
  options: Array<{
    id: string
    name: string
    values: Array<{ id: string; label: string }>
  }>
  variants: Array<{
    id: string
    optionValueIds: string[]
    availableForSale: boolean
    price: {
      amount: string
      currencyCode: string
    }
  }>
}
```

采用十进制字符串保存金额，展示时使用明确 locale/currency 的格式化器。不要跨 RSC 边界传 Shopify SDK 对象、GraphQL Response、类实例、函数、错误对象或包含多余字段的原始记录。

### 4. 货币与加入购物车收口到服务端

货币上下文由服务端从现有 URL、cookie、session 或市场配置解析，标准化为受支持的 `MarketContext`。货币切换通过 Server Action/现有服务端接口更新偏好，再 `router.refresh()` 获取新的服务端价格，不能只在浏览器里自行换算。

加入购物车使用 Server Action或已有 Route Handler：

- 客户端只提交 `variantId`、数量和必要的选项标识。
- 服务端重新校验 session、市场、商品状态和可售性。
- 服务端价格为权威结果；绝不信任客户端传来的金额、币种或库存。
- 重复点击在客户端进入 pending 并禁用按钮；服务端仍需遵守既有幂等/购物车语义。
- 对缺货、数量无效等预期失败返回类型化结果；网络或程序错误交给错误边界。
- 成功后刷新服务端购物车视图；失败时保留用户的规格选择并给出可重试反馈。

私有 Shopify 凭据不得进入浏览器 bundle、公开环境变量、RSC payload、日志或 source map。

## Suspense 决策

商品核心内容是首屏和 SEO 所需，`page.tsx` 应先等待它；路由级 `loading.tsx` 负责这一阶段。

推荐商品是非关键内容，放入独立 Suspense：

```tsx
<ProductContent product={product} />
<PurchasePanel product={product.purchase} />

<Suspense fallback={<RecommendationsSkeleton />}>
  <Recommendations productId={product.id} market={market} />
</Suspense>
```

注意：

- Suspense 只解决等待，不处理错误。
- “确实没有推荐”与“推荐服务失败”必须是不同状态，不能都转成空数组。
- 推荐失败应由该能力自行呈现“暂时无法加载”和重试入口，不应让整个商品页白屏。
- 不要给每个小请求创建 Suspense；边界对应“关键商品内容”和“可独立失败的推荐内容”两个用户结果即可。

## 缓存作用域与失效

先检查项目 Next.js 版本和现有缓存模式，不应为了单个商品页开启全局 `cacheComponents`。

| 数据 | 缓存作用域 | 建议键 | 失效 |
|---|---|---|---|
| 商品公开内容 | 跨请求共享 | shop + product ID/handle | Shopify 商品 webhook + TTL |
| 公共市场价格 | 按市场共享 | product + market/country/currency | 商品、价格、库存 webhook + TTL |
| 客户专属/B2B 价格 | 请求或用户私有 | user/session + market + product | 不进入公共缓存 |
| 推荐商品 | 产品与市场级共享 | product + market +算法版本 | 商品/推荐配置变更 + 较短 TTL |
| 购物车 | 用户/session 私有 | cart/session ID | 每次 mutation 后更新；不公共缓存 |

币种不是完整身份：如果 Shopify 定价还受国家、市场、客户等级或折扣影响，缓存键必须包含这些维度，或者直接使用 request/private/no-store。

版本策略：

- 若项目已使用 Next.js 16 Cache Components：在数据函数内使用 `use cache`、`cacheLife`、`cacheTag`；由通过 HMAC 校验的 Shopify webhook 调用 `revalidateTag(tag, 'max')`。这套能力需要 `cacheComponents` 配置，不能无意中全局开启。[Next.js Cache Components](https://nextjs.org/docs/app/getting-started/partial-prerendering)
- 若仍使用旧缓存模型：沿用 `fetch(..., { next: { revalidate, tags } })`；Shopify SDK 非 `fetch` 调用则使用项目现有的服务端缓存封装。
- React `cache()` 只承担一次渲染内的请求去重，不能代替跨请求的新鲜度与 webhook 失效。
- 所有市场缓存项同时挂通用 `product:<id>` tag，使一次商品 webhook 能失效全部市场变体，而无需枚举键。
- 加购遇到旧库存时，以 Shopify 的权威拒绝为准，刷新商品状态；不要因此全局清空商品缓存。

## 错误恢复

- 商品不存在：`notFound()`，返回正确 404。
- 商品关键请求暂时失败：路由 `error.tsx` 显示重试按钮，调用 `reset()`；保留返回商城入口。
- 推荐失败：局部降级，不影响商品和购买面板。
- 加购预期失败：面板内反馈，保持规格和数量；缺货时刷新权威商品状态。
- 加购结果未知，例如超时：不要直接承诺失败或盲目重复写入；先按现有购物车契约查询/协调结果。
- Shopify 响应无效：记录商品标识、请求类型和 trace ID，但不记录 token、完整 payload 或用户敏感信息。

Next.js 的 `error.tsx` 是客户端错误边界，可通过 `reset()` 重试对应路由段；`notFound()` 用于终止当前段并返回 404 UI。[Next.js Error Handling](https://nextjs.org/docs/app/getting-started/error-handling)

## 验证与发布门槛

至少覆盖以下结果：

1. 服务端和契约测试

   - Shopify 响应到 DTO 的正常、缺字段、商品不存在和非法金额用例。
   - 缓存键包含所有市场维度。
   - 商品 webhook HMAC 无效时不得触发失效。
   - 加购服务端拒绝篡改价格、非法数量和无效 variant。

2. SSR/SEO 集成测试

   - 禁用 JavaScript仍能在原始 HTML 中看到标题、描述、图片替代文本和服务端价格。
   - metadata、canonical、Open Graph、JSON-LD 正确。
   - HTML、RSC payload、浏览器请求和构建产物中不存在 Shopify 私有凭据。

3. 浏览器交互测试

   - 不同规格映射到正确 variant、价格和库存。
   - 切换货币后服务端刷新，两个用户/市场之间不存在缓存串价。
   - 加购 pending、成功、缺货、网络失败和重试均有明确反馈。
   - 键盘可操作，状态反馈使用合适的 `aria-live`，焦点不会在错误后丢失。
   - 推荐延迟或失败时，商品购买主流程仍然可用。

4. 回归与性能

   - 对比重构前后的浏览器商品请求瀑布、首屏 HTML、LCP 和该路由客户端 JavaScript 体积。
   - 冷缓存、热缓存和 webhook 失效后各检查一次。
   - 只运行并报告项目已有的 lint、类型检查、测试和构建命令；当前工作区没有这些配置，所以这里不能声称已经执行。

发布顺序应对应上述四个阶段，每一步都可独立回滚。若项目已有 feature flag，可只对商品路由逐步放量；没有现成机制时，不值得为了这次局部迁移新建一套开关系统。

这个边界也能承受一个现实后续变化：未来增加 B2B 客户价时，只需把定价查询从公共 `MarketContext` 切换为用户私有缓存或不缓存，而商品内容、SEO、规格交互和推荐组件无需重写。