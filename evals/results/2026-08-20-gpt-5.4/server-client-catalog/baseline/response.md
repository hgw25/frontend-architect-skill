我检查了当前 workspace：仓库只有 `.git`，`HEAD` 在提交 `93a12d0`，没有 `app/`、`src/`、`components/` 或任何 Next.js 代码可供核对。所以我不能基于现有实现给出“文件级”改造建议，只能基于你描述的当前商品页形态，给出不扩散到无关页面的渐进式重构方案。

**结论**
不要把整站改成 Server Components。只重构商品详情路由这一条链路，把“首屏可索引数据”移到服务端，把“用户态价格”和“交互式购买”保留在客户端边界内。

**建议的目标拆分**
- `app/products/[handle]/page.tsx`
  作为 Server Component。负责读取公开商品详情、生成 SEO 所需首屏内容、组织 Suspense 边界。
- `ProductHeroServer`
  Server Component。渲染标题、描述、图片、基础价格占位、结构化数据。
- `RecommendedProductsServer`
  Server Component。服务端取推荐商品，可单独 Suspense。
- `ProductPurchaseClient`
  Client Component。负责规格选择、数量、加入购物车、用户货币价格刷新。
- `CurrencyPriceClient`
  Client Component。只接收 `productId`、`selectedVariantId`、`basePrice` 之类的可序列化字段，按用户货币二次请求价格。
- `AddToCartForm`
  Client Component。提交到 server action 或 route handler，不暴露 Shopify 私有凭据。

**渐进式重构顺序**
1. 先只改商品详情页路由，保留其他页面现状不动。  
2. 把当前 `useEffect` 里的“商品详情”和“推荐商品”请求迁到服务端数据层。  
3. 页面本身去掉整页 `use client`，仅把规格选择、价格本地刷新、加入购物车拆到客户端子组件。  
4. 加入 Suspense：
   - 商品主信息不要 suspense 到空白页，优先直接在 page 里 `await`，保证 SEO HTML 完整。
   - 推荐商品单独 `<Suspense fallback={...}>`，避免拖慢首屏。
   - 用户货币价格单独 Suspense 或 skeleton，不阻塞商品正文。
5. 最后再补缓存、失效、错误边界和验证。

**服务端 / 客户端边界**
服务端做：
- Shopify 私有 API 调用
- SEO 元数据 `generateMetadata`
- 商品公开详情获取
- 推荐商品获取
- 结构化数据 JSON-LD 生成
- 基于默认市场/默认币种的首屏价格渲染

客户端做：
- 规格选择状态
- 变体切换
- 基于用户货币的价格刷新
- 加入购物车交互
- 乐观更新、按钮 loading、局部错误提示

不要跨边界传：
- `Date`
- `Map/Set`
- 类实例
- Shopify SDK 返回的整对象
- 任何私有 token / shop domain secret / admin access token

只传最小可序列化 DTO：
- `product: { id, handle, title, descriptionHtml, images, options, variants[{id,title,availableForSale,sku}] }`
- `pricing: { amount, currencyCode }`
- `recommendations: Array<{ id, handle, title, featuredImage, priceRange }>`
- `selectedVariantId`

**价格策略**
SEO 与缓存稳定性决定了首屏不能依赖“用户浏览器币种”。
建议分两层：
- 首屏服务端输出站点默认市场价格，保证可索引和可缓存。
- 客户端 hydration 后，根据 cookie / user profile / Geo / explicit currency selector 请求 `/api/prices?variant=...&currency=...` 或调用 server action，局部替换价格。

这样做的原因：
- `headers()` / Geo / cookie` 会让整页更动态，降低缓存收益。
- 用户货币本身不是 SEO 关键内容，适合客户端局部更新。

**Suspense 设计**
- `page.tsx`：直接等待商品详情，避免标题和正文首屏缺失。
- `RecommendedProductsServer`：放进 `<Suspense>`，可流式返回。
- `CurrencyPriceClient`：组件内部可用 React cache / SWR / React Query 任一现有方案，但只包价格区域。
- 如果规格切换会触发价格刷新，用 `useTransition`，不要让整个购买区卡住。

**缓存作用域与失效**
商品详情：
- 使用服务端 `fetch`，按商品路由缓存。
- 若库存/价格经常变化，使用 `revalidate: 60~300` 这类短时 ISR。
- 打 tag，例如 `tags: ['product:'+handle]`。

推荐商品：
- 单独缓存，tag 如 `recommendations:'+productId`。
- 失效频率可比商品详情更长。

用户货币价格：
- 不进页面级静态缓存。
- 走动态 route handler / server action，缓存粒度按 `variantId + currency`。
- 可以短 TTL，或 `no-store`，取决于价格变动频率和市场规则。

购物车：
- `no-store`。
- 与商品详情缓存隔离，避免购物车操作导致商品页整体失效。

失效策略：
- Shopify webhook 到站内 API，调用 `revalidateTag('product:'+handle)`、`revalidateTag('recommendations:'+productId)`。
- 购物车变更不触发商品详情 revalidate。
- 市场价格规则变更时，只失效价格接口缓存，不动商品正文缓存。

**错误恢复**
- 路由级 `error.tsx`：商品详情服务端请求失败时展示可恢复页，并提供 retry。
- 路由级 `not-found.tsx`：商品不存在或下架。
- 推荐商品区域本地容错：失败时隐藏模块或显示“暂时无法加载推荐”。
- 客户端购买区错误：
  - 规格不可售时禁用加入购物车
  - 加购失败显示 inline error，不打断页面其余部分
  - 用户货币价格失败时回退到默认币种价格，并明确标注

**验证重点**
功能验证：
- 未登录/首次访问能看到完整商品 HTML
- View Source 中包含标题、描述、图片、结构化数据
- 规格切换只更新购买区，不重新请求整页
- 加购请求只命中服务端，浏览器中无 Shopify 私有凭据
- 推荐商品延迟时，商品正文仍先渲染
- 用户切换货币后仅价格区域更新

技术验证：
- 检查首屏 HTML 是否已含商品内容，不依赖 hydration
- 检查 RSC payload 只含 DTO，不含敏感字段
- 检查缓存命中与 `revalidateTag` 生效
- 检查 `error.tsx` / `not-found.tsx` 路径
- 检查客户端网络面板，确认私有 Shopify 请求未暴露到浏览器

如果你把实际商品页文件补到 workspace，我可以下一步把这个方案落到具体目录结构、组件拆分和 `fetch`/`revalidateTag` 级别的实现建议。