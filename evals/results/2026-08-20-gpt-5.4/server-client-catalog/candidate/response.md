基于当前工作区，我只发现了 `.frontend-architect` 和 `.git`，没有实际 Next.js 商品页代码可核对，所以不能声称“按仓库现状已验证某个文件结构”。下面是按你给定约束制定的渐进式重构方案，范围只落在商品详情路由及其直属依赖，不扩散到无关页面。

核心决策是：把“首屏可索引的商品内容”和“需要浏览器交互的购买面板”拆开，而不是整页继续 `use client`。商品页路由改成 Server Component `page.tsx`，负责服务端取商品详情、生成 SEO 元数据、决定当前用户货币上下文；规格选择和加入购物车保留为一个小的 Client Component 岛。这样能拿回 SEO、避免首屏 `useEffect` 瀑布流，同时不把整个站点迁移成 RSC-first。

建议按 4 个阶段做，保证每一步都可回滚：

1. 先抽服务端数据边界，不改无关页面  
   新建 `server-only` 的 Shopify 访问层，例如 `lib/shopify/server/*`，把私有凭据和 Shopify 调用都锁在这里。  
   只暴露给页面一个序列化后的 DTO，例如：
   - `ProductPageData`: `id`, `handle`, `title`, `description`, `media`, `options`, `variants`, `seo`, `availability`
   - `MoneyView`: `amount`, `currencyCode`, `formatted`
   不要把原始 Shopify 对象、凭据、Admin/GraphQL 响应整包传给客户端。  
   这里顺手做运行时校验，缺字段或结构异常时在服务端拦截，不把脏数据传进 React 树。

2. 再把商品页改成“Server Shell + Client Island”  
   `app/products/[handle]/page.tsx` 负责：
   - 服务端获取商品核心数据
   - `generateMetadata` 生成标题、描述、OG，SEO 不再依赖客户端请求
   - 渲染商品媒体、文案、结构化内容
   - 把购买所需最小数据传给 `ProductPurchasePanel.client.tsx`
   
   `ProductPurchasePanel` 只负责：
   - 规格选择
   - 数量选择
   - 加入购物车按钮
   - 乐观交互和按钮态
   
   客户端状态只保留“用户当前选中的规格/数量/提交状态”，不要复制一份完整商品详情到客户端 store。

3. 把价格和推荐拆成独立异步边界，用 `Suspense` 控制首屏  
   不建议让推荐商品继续阻塞商品详情首屏。拆成：
   - `ProductCore`：主商品信息，首屏必须有
   - `ProductPriceServer`：按用户货币解析价格，可作为嵌套 Server Component
   - `RecommendedProductsServer`：推荐商品，放在单独 `Suspense`
   
   推荐结构：
   - 页面主内容先返回，推荐区用 skeleton fallback
   - 如果“按用户货币”需要读 cookie / session / header，那么只让价格子树变成 request-time dynamic，别把整个页面都变成客户端渲染
   - 推荐失败不应拖垮整页，降级成“暂时无法加载推荐”

4. 最后把加入购物车改成 Server Action 或 Route Handler  
   `addToCart` 必须在服务端执行，因为它依赖私有凭据/受信任购物车逻辑。客户端只提交：
   - `productId`
   - `variantId`
   - `quantity`
   
   服务端再次校验：
   - variant 是否属于该商品
   - quantity 是否在允许范围
   - 当前价格/库存是否仍有效  
   返回一个窄结果给客户端：成功、购物车摘要、或可展示错误文案。不要信任客户端传来的价格、币种、库存状态。

**Server / Client 边界**
- Server Component：
  - `page.tsx`
  - `generateMetadata`
  - `ProductPriceServer`
  - `RecommendedProductsServer`
  - Shopify data layer
  - `addToCart` action / route
- Client Component：
  - `ProductPurchasePanel`
  - `VariantPicker`
  - `AddToCartButton`
  - 必要时的局部错误重试按钮

**序列化约束**
- 只跨边界传 plain JSON 可序列化数据
- `Date` 转 ISO string
- 金额传 `amount + currencyCode + formatted`，避免客户端自己猜
- 不传 Shopify SDK 实例、GraphQL client、Error class、自定义类实例
- 不把“用户货币”做成全局可变真相；服务端决定首屏货币，客户端只消费结果或显式触发刷新

**缓存作用域与失效**
- 商品核心详情：公共缓存  
  键建议按 `product:{handle}` 或 `product:{id}`，用 tag 失效；Shopify 商品更新时由 webhook 触发 `revalidateTag`
- 推荐商品：公共缓存，但 TTL 更短，或独立 tag `recommendations:{productId}`
- 用户货币解析：请求级，不进公共缓存  
  如果价格真的是“用户专属”或依赖 cookie/session，不要进 shared cache
- 按货币展示的价格：
  - 如果只是公开市场价，可按 `product:{id}:currency:{code}` 缓存
  - 如果含客户组/会员价，不共享缓存，按请求现算
- 购物车：用户/会话级缓存，mutation 后由 `revalidateTag('cart:'+cartId)` 或 `revalidatePath` 驱动失效

**错误恢复**
- 商品不存在：服务端 `notFound()`
- 商品主数据失败：商品路由级 `error.tsx`，提供返回列表/重试
- 推荐失败：局部降级，不影响购买主流程
- 加入购物车失败：在购买面板内显示可恢复错误，保留已选规格和数量
- 重试策略：
  - 首屏主商品不做浏览器端自动重试
  - 推荐可手动 `router.refresh()`
  - 加购失败只重试 mutation，不重新拉整页

**验证方案**
- 运行时校验：
  - Shopify 响应 schema 校验
  - Server Action 入参校验
- 集成验证：
  - 商品页 HTML 首响应包含标题、描述、价格文案，不依赖 hydration 才可见
  - 查看客户端 bundle，确认 Shopify 私有凭据和 server-only 模块未进入浏览器图谱
  - 规格切换只更新购买面板，不触发整页重取
  - 加购后购物车状态正确失效并刷新
- 回归重点：
  - crawler 拿到 metadata 和主商品内容
  - 货币切换/识别不会把 A 用户价格缓存给 B 用户
  - 推荐区失败不影响下单
  - hydration 前后价格字符串一致，避免 mismatch

不建议做的事也很明确：
- 不要为了一个规格选择器把整页保留成 `use client`
- 不要把 Shopify 私有凭据移到浏览器或公开 env
- 不要在客户端复制一份“商品详情缓存”去和服务端真相长期对账
- 不要因为引入 Server Components 去重写其他非商品页路由

如果你接下来给出实际仓库里的商品页文件，我可以把这套方案收敛成具体到文件级的迁移步骤和组件切分图。  
参考：Next.js `generateMetadata`（2026-03-25 更新）https://nextjs.org/docs/app/api-reference/functions/generate-metadata ，Next.js App Router 缓存与失效（2026-03-03 更新）https://nextjs.org/docs/app/guides/caching-without-cache-components 。