我检查了工作区：当前目录里只有 `.git`，没有可读的业务代码或目录结构可供落地到具体文件，所以以下方案只能基于你描述的现状 `components / hooks / services / stores / types / utils` 来设计，不绑定仓库里的不存在文件。

**建议方向**

不要继续按“技术类型”扩目录，结算这类强业务功能应该先做“局部模块化”，再逐步把高频业务域迁过去。目标不是一次性改成 feature-sliced，而是先让新增结算功能只在一个主目录下演进，避免每次同时改 5 到 6 个顶层目录。

推荐先引入：

```txt
src/
  modules/
    checkout/
      api/
      model/
      ui/
      lib/
      index.ts
```

**模块边界**

`modules/checkout` 内部建议按职责分层，但只服务于 checkout 这个业务域：

- `ui/`
  - 结算页组件、地址表单、支付方式选择、价格摘要
  - 只依赖 `model/` 暴露的 hooks/selectors/types
- `model/`
  - checkout 状态、actions、selectors、domain hooks
  - 例如 `useCheckout`, `submitOrder`, `selectPriceSummary`
  - 不直接渲染 UI
- `api/`
  - 结算相关请求：获取结算数据、计算运费、提交订单、拉取优惠信息
  - 只做接口适配，不持有页面状态
- `lib/`
  - checkout 私有工具，如金额格式转换、表单映射、错误码翻译
  - 不放通用 `utils`，避免“私有逻辑被全局化”

顶层旧目录先保留，但角色收紧：

- `components/` 只放真正跨域复用的通用组件
- `hooks/` 只放跨域复用 hooks
- `services/` 只放跨域基础设施，如 HTTP client、auth header、request retry
- `stores/` 只放全局 app 级状态，如用户会话、主题、购物车角标
- `types/` 只放跨域共享类型
- `utils/` 只放跨域通用纯函数

**公开 API**

每个业务模块只通过 `index.ts` 暴露外部可用能力，外部禁止深层引用 `modules/checkout/*`。

示例：

```ts
// modules/checkout/index.ts
export { CheckoutPage } from './ui/CheckoutPage';
export { useCheckout } from './model/useCheckout';
export { submitOrder } from './model/submitOrder';
export type {
  CheckoutState,
  CheckoutPayload,
  OrderPreview,
} from './model/types';
```

这样外部使用固定为：

```ts
import { CheckoutPage, useCheckout, type CheckoutPayload } from '@/modules/checkout';
```

不要暴露：

- `api` 内部 DTO
- `lib` 内部工具
- `ui` 子组件
- store 的原始实现细节

判断标准很简单：如果模块外不应该知道它的存在，就不要从 `index.ts` 导出。

**依赖方向**

建议固定为单向依赖：

```txt
app/page/router
  -> modules/checkout/ui
  -> modules/checkout/model
  -> modules/checkout/api
  -> shared infrastructure
```

更细一点：

- `ui -> model`
- `model -> api`
- `model -> lib`
- `api -> shared/services`
- `api -> shared/types`（仅基础协议类型时）
- `shared` 不能反向依赖 `modules`

禁止关系：

- `ui -> services`
- `ui -> stores`（绕过 model）
- `api -> ui`
- `module A -> module B` 直接读对方内部文件
- `checkout` 直接依赖顶层 `utils` 里混杂的业务函数

**渐进式改造顺序**

1. 先只为 `checkout` 建模块，不动其他域  
   新增结算需求全部进入 `modules/checkout`，不要再往 `components/hooks/services/stores/types/utils` 分散写新代码。

2. 为旧能力做薄封装，不强迁  
   如果现在已有 `services/order.ts`、`stores/cart.ts`、`types/order.ts`，先在 `modules/checkout` 内做 adapter 调用它们，而不是一开始大搬家。

3. 新代码只走模块出口  
   页面、路由、容器组件改为只 import `@/modules/checkout`。这一步先建立边界，比迁文件更重要。

4. 按变更频率回收旧代码  
   每次结算需求迭代时，顺手把相关旧代码迁一小块进 `checkout/api` 或 `checkout/model`。只迁“这次会改”的部分，不做纯整理式重构。

5. 补测试时一起模块化  
   结算测试与实现共址：
   - `model/*.test.ts`
   - `api/*.test.ts`
   - `ui/*.test.tsx`
   避免测试还散落到全局 `__tests__` 里继续失去边界。

**落地判断标准**

当 checkout 模块完成第一阶段后，新增一个结算需求理想上只会改：

- `modules/checkout/ui`
- `modules/checkout/model`
- `modules/checkout/api`
- 少量共享基础设施（如果真有必要）

而不是再跨改 6 个顶层目录。

**建议的组织终局，但不要一步到位**

后续可以逐步形成：

```txt
src/
  modules/
    checkout/
    cart/
    product/
  shared/
    ui/
    services/
    hooks/
    utils/
    types/
```

但现阶段不要先做全局目录迁移。先把 `checkout` 作为样板模块跑通，验证边界、导出规则和依赖约束，再复制到 `cart`、`order`、`profile` 这类高频业务域。

如果你需要，我下一步可以直接给出一版更具体的目录模板和 `index.ts`/store/api/test 的示例骨架。