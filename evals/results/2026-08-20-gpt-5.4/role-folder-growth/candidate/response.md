结论：不要一次性把 `components/hooks/services/stores/types/utils` 全部改成 feature-first。先在现有结构上为“结算”建立一个可迁移的模块边界，把新增代码优先收口到 `checkout`，再逐步把旧的散落实现吸进去。这样能先解决“新增结算功能要跨 6 个目录改动”的问题，同时不给整个项目引入一次性重写风险。

我检查到当前工作区里没有业务源码，只有任务说明和 `.frontend-architect` 参考文件，所以方案只能基于你描述的现状来设计，不会假设仓库里已经存在某些页面、框架约束或测试设施。

**建议的目标结构**
先引入“上层按业务模块、模块内再按职责细分”的混合结构，而不是立刻清理所有旧目录。

```text
src/
  app/                      # 路由、全局 provider、页面装配
  modules/
    checkout/
      api/
        index.ts
        place-order.ts
        fetch-checkout.ts
      model/
        index.ts
        checkout-store.ts
        selectors.ts
        commands.ts
      ui/
        index.ts
        CheckoutPage.tsx
        CheckoutSummary.tsx
        PaymentMethodForm.tsx
      types/
        index.ts
        checkout.ts
      tests/
        checkout-flow.test.ts
      index.ts
  shared/
    ui/
    http/
    lib/
```

这里的关键决策是：
- `checkout` 拥有结算的业务行为、状态、接口适配、业务类型和测试。
- 旧的 `components/hooks/services/stores/types/utils` 不立刻删除，继续作为存量区。
- 新代码默认进 `modules/checkout`，旧代码只在“碰到就迁”的节奏下逐步移动。

**模块边界**
`checkout` 应该只拥有和“结算流程”强相关的内容：

- 归 `checkout`：
  - 结算页状态
  - 地址选择、支付方式、优惠券、订单确认这类结算规则
  - 结算接口调用
  - 结算专属类型
  - 结算流程测试

- 不归 `checkout`：
  - 通用按钮、弹窗、输入框
  - 通用 HTTP client
  - 全站用户信息 store
  - 商品实体的全局定义
  - 纯通用工具函数

判断标准很简单：如果这个代码的主要变化原因是“结算业务变了”，就放 `checkout`；如果它的变化原因和多个业务都相关，就留在 `shared` 或现有公共层。

**公开 API**
每个业务模块只暴露一个明确入口 `modules/checkout/index.ts`，不要让外部直接深链到内部文件。

建议对外只公开三类东西：

```ts
// modules/checkout/index.ts
export { CheckoutPage, CheckoutSummary } from './ui'
export { useCheckoutStore, submitOrder, loadCheckout } from './model'
export type {
  CheckoutState,
  CheckoutDraft,
  PlaceOrderPayload,
  PlaceOrderResult,
} from './types'
```

不要公开：
- 内部 selector 实现细节
- 内部请求函数的拼装细节
- 内部子组件目录路径
- 临时兼容适配器

这样做的目的，是以后你可以在模块内部继续拆分，而不影响调用方。

**依赖方向**
依赖方向必须单向，否则迁移一半就会重新缠回去。

建议固定为：

```text
app -> modules/checkout -> shared
```

细化一下：

```text
ui -> model -> api -> shared/http
ui -> shared/ui
model -> types
api -> types
tests -> checkout public API
```

约束：
- `shared` 不能反向 import `checkout`
- 其他业务模块不能 import `checkout` 的内部文件，只能 import `modules/checkout`
- `ui` 不直接调散落在全局 `services` 的函数，统一经 `checkout/api`
- `ui` 不直接读写全局散落 store，统一经 `checkout/model`

这比“所有地方都能调 services/store/utils”更重要，因为真正降低修改成本的是依赖方向，不是目录名本身。

**渐进式重构步骤**
按这个顺序做，风险最低：

1. 新建 `modules/checkout`
   - 只为新增结算功能建立新边界。
   - 不动其他业务目录。

2. 先做“模块门面”
   - 在 `checkout/index.ts` 暴露公开 API。
   - 页面和路由层以后只认这个入口。

3. 把新增结算代码优先写进模块内
   - 新的 UI、状态、API、类型、测试都放 `checkout`。
   - 旧全局目录暂时继续存在。

4. 对旧代码做“适配而不是硬迁”
   - 如果现有 `services` 里已有下单接口，先在 `checkout/api` 里包一层调用。
   - 如果现有 `stores` 里已有部分结算状态，先在 `checkout/model` 里做桥接。
   - 先收口调用点，再收口实现。

5. 碰到结算相关改动时再逐步搬迁
   - `components` 里的结算专属组件移到 `checkout/ui`
   - `hooks` 里的结算专属 hook 移到 `checkout/model` 或 `ui`
   - `types` 里的结算类型移到 `checkout/types`
   - `services` 里的结算 API 移到 `checkout/api`

6. 迁完一个领域就切断旧入口
   - 旧文件保留短期 re-export 或兼容层
   - 调用方改完后删除兼容层
   - 不要同时迁多个业务域

**对现有顶层目录的处理建议**
不是所有旧目录都要消失，建议分三类处理：

- 保留并收缩为 `shared`：
  - `components` 里真正通用的 UI primitive
  - `utils` 里真正通用的无业务工具
  - `services` 里真正基础设施层，如 `httpClient`

- 逐步下沉进业务模块：
  - 结算专属组件
  - 结算专属 hooks
  - 结算专属 store
  - 结算专属类型
  - 结算专属 API

- 禁止继续扩张：
  - 全局 `types`
  - 全局 `utils`
  - 全局 `stores`
  
这几个最容易继续变成 dumping ground。可以先从团队约定做起：新增业务代码不得再进入这些全局目录。

**测试边界**
测试也跟着模块走，不要继续散在全局。

建议至少分三层：
- `checkout/model` 的状态与命令测试
- `checkout/api` 的接口契约测试
- `checkout/tests` 的结算流程集成测试

重点不是测试数量，而是让“改结算只看 checkout 模块里的测试”成为可能。

**落地时的治理动作**
不需要先上重工具，但至少要做两件事：

- 代码评审规则：
  - 新增结算逻辑不得落到全局 `services/stores/types/utils`
- 导入约束：
  - 先靠约定和 review
  - 等模块数量上来后，再补 lint import rule，禁止跨模块内部路径引用

**什么时候算迁移成功**
不是“目录变好看了”，而是这几个信号出现了：

- 新增一个结算需求，主要只改 `modules/checkout`
- 结算开发不再同时改 `components/hooks/services/stores/types/utils`
- 外部调用只依赖 `modules/checkout` 的公开入口
- 结算内部重构时，影响面局限在模块内

如果你愿意，我下一步可以把这个方案进一步落成一份更具体的目录迁移清单，包括：
1. 每个现有顶层目录里哪些内容该迁入 `checkout`
2. `index.ts` 公开 API 的精简规则
3. 一个可执行的 PR 分批计划。