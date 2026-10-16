结论：采用“服务端页面 + 小型客户端交互岛”的渐进迁移。商品主体、SEO、货币解析和 Shopify 请求归服务端；只有规格选择、货币切换触发和加入购物车反馈留在客户端。范围限定在商品路由及其直接数据边界，不改根布局、其他页面或全局状态架构。

当前工作区没有应用源码、`package.json` 或测试配置，只有 `.frontend-architect` 指南，因此以下是可执行的目标方案，但具体目录名、缓存 API 和测试命令需按项目实际 Next.js 版本与既有约定落地。

## 目标边界

建议结构；若项目已有 Shopify/data/action 目录，沿用现有位置：

```text
app/products/[handle]/
  page.tsx                 Server Component
  loading.tsx              路由导航占位，可选
  error.tsx                商品主体错误恢复
  not-found.tsx
  ProductPurchasePanel.tsx Client Component
  Recommendations.tsx      async Server Component

lib/shopify/
  server.ts                server-only；凭据和 Shopify 调用
  product-view.ts          外部数据到可序列化 DTO 的映射

app/actions/
  cart.ts                  Server Action，或复用现有 Route Handler
  currency.ts              校验货币并写 cookie
```

职责如下：

| 能力 | 所有者 |
|---|---|
| 商品抓取、市场上下文、Shopify 凭据 | 服务端 Shopify adapter |
| 标题、描述、图片、结构化数据、推荐商品卡片 | Server Components |
| 规格选择、当前 variant 推导、提交中状态 | `ProductPurchasePanel` |
| 加入购物车的权威校验与写入 | Server Action/既有服务端接口 |
| 货币偏好 | 服务端 cookie；客户端只发起切换 |
| 商品与推荐缓存 | 服务端数据层 |
| 购物车状态 | 当前用户/会话，不进入公共缓存 |

`server.ts` 应显式 `import 'server-only'`；凭据只能来自非 `NEXT_PUBLIC_*` 环境变量。客户端模块不得导入 Shopify SDK、服务端 adapter 或环境配置。

## 渐进迁移顺序

1. 固化当前契约  
   记录现有 URL、默认规格、货币来源、缺货行为、加购响应和 SEO 基线。先确认 Next.js 版本及项目已有缓存、Server Action、错误处理约定。

2. 建立服务端 Shopify 边界  
   将查询和响应映射集中到服务端模块。先不重新设计 UI，也不抽象通用 commerce 框架。

3. 把现有整页客户端组件变成迁移缝  
   `page.tsx` 改为 Server Component，在服务端取得商品 DTO，再把 DTO 传给现有客户端页面。删除其商品 `useEffect` 和加载状态，但暂时保留现有交互代码。  
   这一阶段已经消除首屏客户端请求瀑布，并能输出可索引 HTML。

4. 缩小客户端边界  
   把标题、描述、媒体、静态价格说明等移回 Server Components。客户端只保留规格选择、可售状态推导、数量和加购按钮。不要顺手迁移其他页面或重构全局 provider。

5. 独立推荐商品  
   推荐作为异步 Server Component，放在单独的 `Suspense` 中。商品主体不等待推荐，推荐失败也不应令整页不可用。

6. 收口货币与加购  
   货币选择写入服务端 cookie 后刷新当前 RSC；加购通过 Server Action或现有服务端接口完成。确认新路径稳定后删除旧客户端 fetch、重复 cache 和遗留 loading/error 状态。

每一步都能独立回滚；无需为这个单路由引入全站 Server Component 迁移或新的全局数据框架。

## 数据与序列化契约

传给客户端的不是 Shopify 原始对象，而是窄 DTO，例如：

```ts
type MoneyView = {
  amount: string;
  currencyCode: string;
};

type ProductPurchaseView = {
  id: string;
  handle: string;
  pricingContextKey: string;
  options: Array<{
    id: string;
    name: string;
    values: string[];
  }>;
  variants: Array<{
    id: string;
    selectedOptions: Array<{ name: string; value: string }>;
    availableForSale: boolean;
    price: MoneyView;
  }>;
};
```

约束：

- 金额保留 Shopify 返回的十进制字符串和实际 `currencyCode`，不要穿过边界传 `Decimal`、`BigInt` 或自行浮点换算。
- 日期转 ISO 字符串；不传 `Map`、`Set`、类实例、函数、SDK response 或 Error 对象。
- 只选取浏览器真正需要的字段，不传成本价、后台字段、请求头或凭据。
- 商品 HTML 描述属于外部输入：优先转换为受控结构；必须使用 HTML 时，在服务端按项目既有方案净化。
- variant ID 是不可信客户端输入。加购时服务端重新确认它属于当前商品、仍可售且数量合法，不能信任客户端价格。
- 若 variant 数量实际导致 RSC payload 过大，再把“按选择查询 variant”作为后续优化；没有测量前不引入额外请求机制。

客户端只保存不可派生状态，如所选 option 和提交状态；价格、可售性和 variant 从最新 DTO 推导。用 `productId + pricingContextKey` 作为交互岛的 `key`，避免切换商品或市场后保留旧货币状态。

## SEO 与用户货币

服务端按以下优先级解析定价上下文：

1. 已校验、受支持的货币/市场 cookie；
2. 项目已有地区或市场判定；
3. 店铺默认市场。

货币必须映射到 Shopify 支持的市场上下文，以 Shopify 返回的真实币种为准，不接受客户端传入的任意汇率或价格。

读取 cookie 意味着该商品页面通常是请求时动态渲染；这并不妨碍 SEO。核心商品 HTML、`generateMetadata` 和 JSON-LD 仍在服务端生成。搜索爬虫无用户偏好时看到稳定的默认市场版本，canonical 保持为商品 URL，不为 cookie 货币制造重复 URL。

`generateMetadata` 与页面商品读取应使用项目版本支持的请求级去重，避免同一请求重复访问 Shopify。JSON-LD 中使用该次服务端请求的实际价格和币种，并安全序列化。

## Suspense 和错误恢复

- 商品主体是 SEO 和购买的关键内容：服务端等待商品后再决定渲染、`notFound()` 或抛给路由 `error.tsx`。
- `loading.tsx` 可用于客户端导航时的整页骨架，但不能替代最终的可索引商品 HTML。
- 推荐商品是非关键内容：独立 `Suspense`，fallback 保留稳定高度，避免布局跳动。
- Shopify 返回“商品不存在”时进入 `not-found.tsx`；网络或上游故障不能伪装成 404。
- 推荐请求的已知上游失败可映射为明确的“暂时无法加载推荐”状态和重试按钮；程序错误继续抛出，不吞成空数组。
- `error.tsx` 提供 `reset()` 重试，并保留返回目录或搜索的路径。
- 加购业务拒绝返回有类型的表单状态；焦点保留在购买区域，并通过 `aria-live` 宣告结果。
- 提交期间禁用重复加购。若请求超时而结果未知，应重新读取权威购物车后对账；不能把超时直接视为未加购并盲目重试。
- 日志可记录操作、商品/variant 标识和错误类别，但不得记录凭据、完整 cookie 或敏感请求体。

## 缓存作用域与失效

| 数据 | 范围和 key | 策略 | 失效 |
|---|---|---|---|
| 公共商品详情 | 店铺 + handle/ID + country/market + currency + language | 服务端跨请求缓存；TTL 由业务新鲜度确定 | Shopify webhook、后台商品更新；保留 TTL 兜底 |
| 通用推荐 | 商品 ID + 完整市场上下文 | 独立缓存，可与商品使用不同 TTL | 商品/推荐关系变化或 webhook |
| 个性化推荐 | 用户或会话 | `no-store`，除非已有安全的用户级缓存 | 会话变化 |
| 货币偏好 | 当前请求/cookie | 不进入公共数据缓存 | 用户切换 |
| 购物车 | 用户/会话 | `no-store` 或项目既有会话缓存 | 每次购物车 mutation 后刷新权威状态 |

两个缓存层必须区分：

- 请求级去重：供 `generateMetadata` 和页面在同一次渲染中复用。
- 跨请求数据缓存：只缓存明确属于公共范围的 Shopify 结果。

如果价格受客户身份、B2B 合同或登录状态影响，则不得仅按币种缓存，应改为会话级或 `no-store`。添加购物车通常不代表库存已经变化，不应无条件清掉整个商品目录缓存。

失效由实际修改数据的一方负责。Shopify webhook 应验证签名后，根据 handle/ID 失效商品和推荐 tag；初期无法可靠映射 ID 与 handle 时，可以失效店铺级 catalog tag，之后再基于实际压力细化。具体采用 `revalidateTag`、`updateTag`、`unstable_cache` 或 `use cache`，需以仓库锁定的 Next.js 版本为准，不能混用不同版本语义。

## 验证清单

落地后至少验证：

- 类型检查、lint、生产构建通过，客户端 bundle 中不存在 Shopify SDK、私有环境变量或服务端模块。
- 禁用 JavaScript 查看响应源码，仍包含商品标题、描述、主价格及有效 metadata/JSON-LD。
- 服务端 DTO 单测覆盖金额精度、缺失图片、不可售 variant、多规格和敏感字段剔除。
- 浏览器测试覆盖规格选择、价格/库存同步、键盘操作、快速重复加购及失败后保留选择。
- 使用两种货币请求同一商品，确认不会串价、无 hydration mismatch，canonical 保持稳定。
- 通过 Shopify mock 的调用次数验证请求内去重、市场缓存隔离、TTL/webhook 失效，而不是只检查配置代码。
- 模拟推荐慢响应：商品主体应先可见、可操作；推荐失败只影响推荐区域。
- 模拟商品 404、上游 5xx、加购业务拒绝和超时未知结果，分别验证恢复路径。
- 在浏览器 Network、构建产物和 source map 中搜索凭据标识，确认秘密未下发。
- 上线后观察商品请求错误率、Shopify 延迟、推荐降级率和加购失败率，不记录敏感载荷。

现实的后续变化检查也较清楚：增加新币种或 Shopify Market 只修改服务端 `resolvePricingContext` 和查询上下文；增加第四个规格维度主要修改 DTO/通用 option 渲染，不需要重新改页面取数、SEO 或购物车安全边界。

本次仅给出方案；由于工作区没有应用源码，未修改文件，也无法实际执行构建或测试。