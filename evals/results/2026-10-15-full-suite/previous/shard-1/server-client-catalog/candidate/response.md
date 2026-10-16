结论：把商品路由改为 Server Component 编排层，只将“规格选择、数量、货币切换、加入购物车”保留为 Client Components。商品详情、推荐、SEO 和 Shopify 调用全部留在服务端；按数据身份分别缓存，不缓存个性化整页。

当前工作区除 `.frontend-architect` 外是空仓库，`HEAD` 也是空树，没有 `package.json`、Next.js 版本或现有路由可检查。因此以下是可执行的迁移设计，但文件路径仅为建议，缓存 API 必须在实际项目中按已安装版本落地。本次未修改任何文件。

## 目标结构

建议只调整商品路由附近的模块，例如：

```text
app/products/[handle]/
  page.tsx                         # Server Component，页面编排与 SEO 内容
  loading.tsx                      # 路由导航骨架
  error.tsx                        # 主商品加载失败与重试
  actions.ts                       # 加购、切换货币等 Server Actions
  _components/
    product-configurator.client.tsx
    currency-picker.client.tsx
    recommendations.tsx            # async Server Component
    recommendations-error.client.tsx
lib/catalog/
  product.server.ts                # 商品查询、缓存、DTO 映射
  recommendations.server.ts
  contracts.ts                     # 可传给浏览器的纯数据类型
lib/shopify/
  client.server.ts                 # 私有 Shopify 客户端
```

这只是商品页的局部边界，不移动布局、购物车或其他页面，也不为采用 Server Components 重构无关代码。

| 单元 | 运行位置 | 职责 |
|---|---|---|
| `page.tsx` | Server | 解析 handle 和用户市场、加载主商品、输出正文和 JSON-LD、处理 404 |
| `generateMetadata` | Server | 标题、描述、canonical、OG；复用同一商品读取函数 |
| 商品正文 | Server | 标题、图片、描述、首屏价格和库存语义 |
| `ProductConfigurator` | Client | 规格/数量状态、派生当前 variant、提交加购 |
| `CurrencyPicker` | Client + Server Action | 提交货币偏好，由服务端写 cookie/session 并重渲染 |
| `Recommendations` | Server | 独立加载、流式输出、局部失败 |
| Shopify gateway | Server only | 凭据、GraphQL、外部响应校验和 DTO 映射 |

`page.tsx` 删除 `"use client"`；Client 边界放在交互叶子上，因为 `"use client"` 会把其导入子图纳入客户端，而跨边界 props 必须可序列化。[Next.js Server/Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

## 数据与序列化契约

不要把 Shopify SDK 对象、GraphQL 原始响应、错误对象、凭据或任意附加字段传给客户端。建立显式 DTO：

```ts
type MoneyDTO = {
  amount: string;       // 保留 Shopify 十进制定点字符串
  currencyCode: string;
};

type VariantDTO = {
  id: string;
  selectedOptions: Record<string, string>;
  price: MoneyDTO;
  compareAtPrice: MoneyDTO | null;
  availableForSale: boolean;
};

type ProductConfiguratorDTO = {
  productId: string;
  options: Array<{ name: string; values: string[] }>;
  variants: VariantDTO[];
  initialVariantId: string;
};
```

客户端只保存 `selectedOptions`、`quantity` 和提交状态；当前 variant、价格和是否可购买都由 DTO 派生，避免第二份价格状态。金额使用服务端返回的 `amount + currencyCode`，展示时使用 `Intl.NumberFormat`，不在浏览器自行换汇。

若真实商品存在数千个 variants，应先测量 RSC payload；确有体积问题时再将规格矩阵和按选择查询拆成窄接口，不预先建设通用选品引擎。

Shopify 模块首行加入 `import "server-only"`，并确保凭据没有 `NEXT_PUBLIC_` 前缀。这样客户端误导入会在构建时报错。[Next.js 防止环境污染](https://nextjs.org/docs/app/getting-started/server-and-client-components#preventing-environment-poisoning)

## 货币与价格

服务端解析一个明确的 `PricingContext`，例如：

```ts
type PricingContext = {
  market: string;
  countryCode: string;
  currencyCode: string;
};
```

建议优先级为：

1. 已登录用户的服务端偏好；
2. 服务端写入、白名单校验过的货币 cookie；
3. 商店默认市场。

通过 Shopify Markets/contextual pricing 请求权威价格。浏览器提交的货币、variant ID、数量和价格全部是不可信输入；加购 Action 必须重新确认 variant、有效数量、市场和可售状态，绝不能采用客户端提交的金额。

货币切换由 Server Action 写入 cookie，然后让当前树重新渲染；Next.js 会在 Server Action 修改 cookie 后重渲染当前页面。[Next.js Updating Data](https://nextjs.org/docs/app/getting-started/updating-data#cookies) 不要以 `router.refresh()` 代替服务端缓存失效，因为它只刷新当前路由客户端缓存，不会使服务端数据缓存失效。[useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router)

## SEO 与 Suspense

主商品是首屏、索引和购买的共同依赖，因此在 `page.tsx` 中直接 `await`：

```tsx
const product = await getProduct(handle, pricingContext);

return (
  <>
    <ProductContent product={product} />
    <ProductConfigurator initialData={toConfiguratorDTO(product)} />

    <Suspense fallback={<RecommendationsSkeleton />}>
      <Recommendations
        productId={product.id}
        pricingContext={pricingContext}
      />
    </Suspense>
  </>
);
```

具体原则：

- 主商品不存在时调用 `notFound()`，不是渲染空页面。
- 主商品不放进推荐商品的 Suspense 边界，避免核心内容被次要请求拖住。
- 推荐失败不能使商品正文消失；骨架尺寸应稳定，减少布局跳动。
- 不用 `Promise.all(product, recommendations)`，否则推荐失败会升级为整页失败，也失去独立流式输出。
- `loading.tsx` 负责路由导航等待；推荐列表自己的 Suspense 负责局部等待，两者用途不同。

`generateMetadata` 只存在于 Server Component，并调用与页面相同的商品 accessor，以框架 memoization或请求级 memoization避免重复 Shopify 请求。[generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)

服务端正文输出 Product JSON-LD；内容来自 Shopify，写入 `<script>` 前至少将 `<` 转义为 `\u003c`，避免把 JSON 序列化误当成脚本上下文安全处理。[Next.js JSON-LD 指南](https://nextjs.org/docs/app/guides/json-ld)

canonical 指向稳定商品 URL。规格切换默认不创建新的可索引 URL；无 cookie 的爬虫看到商店默认市场及与页面一致的结构化价格。

## 缓存作用域和失效

| 数据 | 缓存范围与 key | 失效 |
|---|---|---|
| 商品标题、描述、媒体 | 公共；`productId/handle + locale` | Shopify 商品 webhook + TTL 后备 |
| 上下文价格、可售状态 | 仅相同 `product + market/country/currency` 共享 | 价格表、市场、商品或库存事件；短 TTL |
| 通用推荐 | `seedProduct + market + locale` | 商品/推荐源变化 + TTL |
| 个性化推荐 | 用户或请求级，禁止公共共享 | 会话变化；通常 `no-store` |
| 用户货币偏好 | 请求/session | 用户切换时立即生效 |
| 购物车 | 用户/session，通常 `no-store` | 每次购物车 mutation 后读取权威结果 |

关键约束：

- 读取 cookie 后整页属于请求相关输出，不缓存为跨用户共享 HTML；缓存底层可共享商品片段。
- 价格缓存 key 必须包含完整市场上下文。若存在会员价或客户分组价，还必须包含相应授权身份，或者直接不做跨请求缓存。
- 加购不能依赖可能陈旧的商品缓存，Action 应向 Shopify 做权威校验。
- 商品 webhook 使用细粒度 tag，例如 `product:{id}`、`pricing:{id}:{market}`；商品目录允许短暂陈旧时使用 SWR 式 `revalidateTag`。
- 购物车要求 read-your-own-write；若当前版本支持且项目已有缓存，可使用 `updateTag`，否则直接返回 mutation 后的购物车并刷新既有购物车 owner。
- 自托管多实例时，必须确认 tag 失效能在实例间同步。

当前 Next.js 的 Cache Components 模型使用 `use cache`、`cacheTag`、`cacheLife`；`revalidateTag` 是后台 SWR，而 `updateTag` 用于立即过期。[Next.js Revalidating](https://nextjs.org/docs/app/getting-started/revalidating) 但由于仓库没有版本信息，实施时应先检查版本和 `cacheComponents` 配置：旧版本沿用项目已有的 `fetch(..., { next: { revalidate, tags } })` 或缓存封装，不混搭两代模型。

## 错误与恢复

- 商品不存在：`notFound()`，返回真正 404。
- Shopify 主请求暂时失败：交给该商品 route segment 的 `error.tsx`；提供“重试”并保留关联 ID，服务端日志不得包含 token 或完整用户数据。
- 推荐失败：显示“推荐暂时不可用”和局部重试；真实空结果显示空态，两者不能混同。
- 规格不可售：保留选择并禁用加购，用可感知文本说明原因。
- 加购业务拒绝：Server Action 返回带类型的字段错误，保留规格和数量。
- 加购超时、结果未知：不要自动重复 mutation，以免重复加购；先刷新/读取权威购物车再决定是否允许重试。
- 连续点击：客户端 pending 时禁用按钮；这只是体验保障，服务端仍需处理重复或未知结果。
- Shopify 返回的实际币种与请求不一致：展示实际 `currencyCode` 并记录可诊断错误，不能把它静默标成用户选择的币种。

## 渐进迁移顺序

1. 先记录当前商品 URL、默认规格、价格、推荐、加购和错误状态，补最小行为测试。
2. 提取 `*.server.ts` Shopify gateway 和 DTO mapper；旧页面可暂时继续消费原接口，先封住凭据边界。
3. 将商品 `page.tsx` 改为 Server Component，服务端渲染商品正文；只嵌入规格 Client Component。保持 URL 和现有视觉结构不变。
4. 加入 `generateMetadata`、canonical、JSON-LD 和 404。
5. 将推荐迁到 async Server Component，并加独立 Suspense/错误恢复。
6. 将货币切换与加购迁到 Server Actions或现有安全 route handler，接回项目已有购物车状态 owner。
7. 最后移除商品页旧 `useEffect`、重复 loading/error state，以及确认无其他消费者后才删除旧浏览器商品接口。
8. 再启用细粒度缓存、webhook 失效和指标观察；每一步都可独立回滚，不触碰其他页面。

一个现实的后续变化是增加新 Shopify Market。上述设计只需扩展 `PricingContext` 解析、Shopify 查询上下文和缓存 key；规格交互组件仍只消费 `MoneyDTO`，不需要重写。

## 验证清单

实施后至少验证：

- 类型检查、lint、生产构建通过，且没有 server-only 导入进入 Client Component。
- 直接请求商品 URL 的首个 HTML 已包含标题、描述、首屏价格和有效 metadata，不依赖 `useEffect`。
- 禁用 JavaScript后仍能读取商品信息和价格；规格和加购可明确保持为需 JS 的交互增强。
- 两个不同货币 cookie/session 并发访问，不出现缓存串价。
- 切换货币后价格、币种标签、JSON-LD 和加购服务端上下文一致。
- 推荐慢或失败时，主商品仍正常显示；空结果与失败状态不同。
- 规格选择、键盘操作、不可售状态、快速重复点击和加购失败均有可见反馈。
- 伪造价格、variant、数量或货币不能改变服务端权威结果。
- `.next/static`、浏览器网络请求、source map 和日志中不存在 Shopify 私有凭据。
- webhook 后目标商品/市场缓存失效，而其他商品缓存不被整站清空。
- 比较迁移前后首屏客户端 JavaScript和请求瀑布，确认商品与推荐不再发生 hydration 后串行请求。

方案遵循本地 Skill 强调的运行时所有权、明确序列化契约、细粒度信任边界和可证伪验证；由于仓库为空，未声称执行任何项目构建或浏览器测试。