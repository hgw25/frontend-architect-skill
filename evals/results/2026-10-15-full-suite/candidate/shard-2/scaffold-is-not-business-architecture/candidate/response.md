结论：把 `App.tsx` 收缩为应用装配层，将工单状态、编辑会话和 `localStorage` 格式分别交给明确的 owner。新增编辑本身不应自动改变存储格式；只有新增持久化字段或调整数据结构时才做版本迁移。

仓库当前没有应用源码、`package.json` 或已跟踪文件，因此以下是基于题述行为的目标方案，文件名需在实际项目中与现有命名对齐。

## 文件调整

建议采用浅层 feature 结构，不引入全局 `services/`、`types/` 等空泛目录：

```text
src/
  App.tsx
  tickets/
    TicketsPage.tsx
    ticketModel.ts
    ticketStorage.ts
    useTicketStore.ts
    TicketCreateForm.tsx
    TicketList.tsx
    TicketEditForm.tsx
```

各文件职责：

- `App.tsx`
  - 保留应用顶栏和页面装配。
  - 渲染 `TicketsPage`。
  - 不再持有创建草稿、编辑草稿、筛选或存储解析逻辑。

- `TicketsPage.tsx`
  - 组合创建表单、编辑表单和列表。
  - 持有列表筛选、是否显示归档项，以及当前编辑会话。
  - 从 `useTicketStore` 获取工单及命令。
  - 可见列表由工单和筛选条件即时派生，不另存一份状态。

- `ticketModel.ts`
  - 定义现有 `Ticket`、可编辑字段组成的 `TicketDraft`。
  - 提供纯状态转换：创建、更新、归档切换、删除。
  - 提供筛选 selector 和创建、编辑共同使用的校验规则。
  - 编辑应更新原工单，不改变 `id`、创建时间和列表身份。

- `ticketStorage.ts`
  - 唯一负责存储 key、原始 JSON 解析、运行时校验、迁移和序列化。
  - UI、reducer 不直接调用 `JSON.parse` 或理解存储版本。

- `useTicketStore.ts`
  - 初始化时通过 `ticketStorage` 加载数据。
  - 持有唯一的工单集合，并暴露窄命令：
    `createTicket`、`updateTicket`、`setArchived`、`removeTicket`。
  - 工单成功变化后统一持久化。
  - 不接管筛选、焦点或表单草稿。

- `TicketCreateForm.tsx`
  - 继续独立持有创建草稿和创建输入框焦点。
  - 创建成功才清空草稿并恢复焦点。
  - 开始或取消编辑不应丢失创建草稿。

- `TicketEditForm.tsx`
  - 负责编辑输入、提交、取消、校验和进入编辑时的焦点。
  - 接收编辑快照，不直接修改工单对象。
  - 保存成功或取消后，把焦点恢复到触发编辑的按钮。

- `TicketList.tsx`
  - 展示派生后的工单列表。
  - 发出编辑、归档、删除等意图，不持有持久化副本。
  - 编辑中的工单暂不显示归档、删除等冲突操作，避免同一项出现竞争转换。

列表项较简单时可继续留在 `TicketList.tsx`，不必仅因 JSX 较长再拆一个文件。

## 状态设计

编辑使用一个有明确状态的会话，而不是 `editingId`、`isEditing`、`editDraft` 三个可能互相矛盾的变量：

```ts
type EditSession =
  | { kind: 'closed' }
  | {
      kind: 'editing'
      ticketId: Ticket['id']
      draft: TicketDraft
    }
```

状态归属如下：

| 状态 | Owner | 是否持久化 |
|---|---|---:|
| 工单集合 | `useTicketStore` | 是 |
| 创建草稿 | `TicketCreateForm` | 否 |
| 编辑会话及编辑草稿 | `TicketsPage` / `TicketEditForm` | 否 |
| 文本筛选、归档显示开关 | `TicketsPage` | 否 |
| 可见工单、数量等 | selector 派生 | 否 |

编辑转换应固定为：

1. 点击编辑，从当前工单复制可编辑字段到 `draft`。
2. 输入只修改编辑草稿。
3. 保存时复用创建表单的字段规则，调用 `updateTicket(ticketId, draft)`。
4. 更新成功后关闭编辑会话。
5. 取消只丢弃编辑草稿，不产生存储写入。
6. 更新保留工单身份，因此 React 列表的 `key` 仍使用原 `id`。

不要用 effect 持续把工单内容同步进编辑草稿，否则后台状态变化或归档操作可能覆盖用户正在输入的内容。进入编辑时取一次稳定快照即可。

## 依赖方向

```text
App
  -> TicketsPage
       -> TicketCreateForm
       -> TicketList
       -> TicketEditForm
       -> useTicketStore
            -> ticketModel
            -> ticketStorage
                 -> ticketModel 的数据契约
```

`ticketModel` 不依赖 React、DOM 或 `localStorage`。`ticketStorage` 不依赖 UI。表单只依赖领域类型和回调。

这个变更不需要新增 npm 依赖：React state/reducer、ref 和浏览器存储 API 已足够。只有项目本来已经使用运行时 schema 库时，存储解析才应复用它；不要仅为这一种结构新增表单库或状态库。

## 编辑功能的影响范围

新增编辑会影响：

- `ticketModel.ts`：新增更新转换及可编辑字段契约。
- `useTicketStore.ts`：暴露 `updateTicket`，更新后走既有持久化路径。
- `TicketsPage.tsx`：维护当前编辑会话并协调列表与表单。
- `TicketList.tsx`：增加编辑入口及编辑态操作策略。
- `TicketEditForm.tsx`：新增编辑交互和焦点管理。
- 测试：保存、取消、校验、身份保持、焦点恢复，以及创建草稿不受编辑影响。

它不应直接影响应用顶栏、存储解析规则或筛选算法。保存后的字段变化自然会重新参与现有筛选；如果当前筛选导致工单保存后消失，这是筛选结果变化，而不是额外删除。

## 存储格式变化的影响范围

如果编辑的只是工单已有字段，推荐保持原有存储格式和存储 key，不做版本升级。更新后的工单通过原序列化路径写回即可。

只有以下情况才算存储格式变化：

- 新增持久化字段，例如确有产品用途的 `updatedAt`。
- 字段重命名或类型变化。
- 从工单数组改成带元数据的对象。
- 改变归档状态的表示方法。

需要变更时，将影响限制在：

- `ticketModel.ts`：新的内部领域字段。
- `ticketStorage.ts`：格式版本、旧格式识别、迁移和新格式序列化。
- `useTicketStore.ts`：只消费迁移后的统一结果，通常无需了解版本细节。
- 存储测试与已有 fixture。
- UI：仅当新增字段需要显示或编辑时才受影响。

可采用版本化信封：

```ts
type StoredTicketsV2 = {
  version: 2
  tickets: Ticket[]
}
```

解析器应同时接受当前格式和明确支持的旧格式，将其归一化成同一个 `Ticket[]`。未知版本或损坏数据不能悄悄解释为空数组并立即覆盖，否则会造成不可恢复的数据丢失。也不要为了迁移凭空生成有业务含义的时间戳；如果新增字段无法从旧数据可靠推导，应明确其可选性或产品默认语义。

## 关键验证

实现时至少覆盖：

- 编辑保存后原 `id`、归档状态和非编辑字段不变。
- 取消编辑不修改内存数据，也不触发存储写入。
- 创建与编辑使用相同字段约束。
- 编辑期间创建草稿不会丢失。
- 筛选结果在保存后根据最新数据重新派生。
- 刷新页面后编辑结果仍存在。
- 旧存储格式能迁移，新格式可往返解析。
- 损坏或未知版本的数据不会被自动覆盖。
- 进入编辑、保存和取消后的焦点位置正确。

本次仅提供设计方案；由于仓库中没有应用源码或测试配置，没有修改文件，也无法执行项目级构建与测试。