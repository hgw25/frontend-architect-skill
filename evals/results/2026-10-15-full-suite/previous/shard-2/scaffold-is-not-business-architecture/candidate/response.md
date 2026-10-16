结论：把工单能力从 `App.tsx` 拆成一个纵向功能模块；编辑草稿不进入持久化状态，已提交工单才写入本地存储。编辑功能本身不应迫使存储格式升级。

当前工作区的 `HEAD` 是空树，没有 `App.tsx`、`package.json` 或测试文件，因此无法确认现有字段、存储 key、解析容错和测试命令。下面是基于题述职责的具体调整方案，而不是对不存在源码的断言。

## 文件调整

```text
src/
  App.tsx
  features/
    tickets/
      TicketWorkspace.tsx
      TicketForm.tsx
      TicketList.tsx
      ticketModel.ts
      ticketStorage.ts
      useTickets.ts
      *.test.tsx / *.test.ts
```

- `App.tsx`
  - 只保留应用顶栏、页面框架和 `<TicketWorkspace />`。
  - 顶栏若只是静态 JSX，不必为了形式再拆一个组件。

- `TicketWorkspace.tsx`
  - 协调创建、筛选、归档显示、列表和当前编辑项。
  - 持有 `filter`、`showArchived`、`editingTicketId`。
  - `visibleTickets` 从工单和筛选条件派生，不另存 state。

- `TicketForm.tsx`
  - 复用创建和编辑的字段、校验及提交语义。
  - 接口采用明确的 `mode: "create" | "edit"`、`initialDraft`、`onSubmit`、`onCancel`，避免多个布尔开关组合。
  - 草稿由表单本身持有。切换编辑对象时用 `key={ticket.id}` 重新挂载并初始化，不用 effect 反复同步 props 到 state。

- `TicketList.tsx`
  - 渲染列表和单条工单操作。
  - 可先把行组件留在同文件；只有当行内编辑、焦点恢复或操作逻辑已形成独立职责时，再拆 `TicketRow.tsx`。

- `ticketModel.ts`
  - 定义 `Ticket`、`TicketDraft`、筛选类型。
  - 放置纯操作：草稿校验/规范化、按 ID 更新、筛选投影。
  - `updateTicket` 只允许修改实际可编辑字段，保留 `id`、归档状态及其他不可编辑元数据。

- `ticketStorage.ts`
  - 独占 `localStorage` key、外部数据解析、运行时校验、序列化和版本迁移。
  - UI 和 `App.tsx` 不再了解 JSON 格式。

- `useTickets.ts`
  - 作为“已提交工单集合”的单一状态所有者。
  - 暴露 `createTicket`、`updateTicket` 和现有单条操作。
  - 使用惰性初始化从存储读取；只有成功创建、编辑或现有操作导致的工单集合变化才写回存储。
  - 不要把筛选、创建草稿、编辑草稿和焦点也塞进该 hook。

依赖方向保持单向：

```text
App
  → TicketWorkspace
      → TicketForm / TicketList
      → useTickets
          → ticketModel
          → ticketStorage
      → ticketModel

ticketStorage → ticketModel 的数据契约
ticketModel   → 不依赖 React、DOM 或 localStorage
```

不需要新增表单库、状态库或存储库；现有 React state 和浏览器 `localStorage` 足够。

## 状态调整

| 状态 | 所有者 | 说明 |
|---|---|---|
| `tickets` | `useTickets` | 已提交、可持久化的唯一工单真相 |
| `filter` | `TicketWorkspace` | 列表展示条件 |
| `showArchived` | `TicketWorkspace` | 归档显示偏好；是否持久化沿用现有契约 |
| `editingTicketId` | `TicketWorkspace` | 同一时间只编辑一条；用 ID，不复制整个工单 |
| 创建草稿 | 创建用 `TicketForm` | 编辑其他工单时不应丢失 |
| 编辑草稿 | 编辑用 `TicketForm` | 从目标工单快照初始化，取消时直接丢弃 |
| `visibleTickets` | 渲染时派生 | 由 `tickets + filter + showArchived` 计算 |

不建议此时引入 reducer：这些状态的所有权不同，且关键转换仍很少。若以后增加自动保存、冲突处理、批量编辑或撤销，再重新评估工作流状态机。

## 编辑流程

1. 点击某条工单的“编辑”，设置 `editingTicketId`。
2. 编辑表单从该工单生成一次 `TicketDraft` 快照，并聚焦第一个可编辑字段。
3. 保存时执行与创建一致的规范化和校验，再通过 `updateTicket(id, draft)` 原子替换对应项。
4. 找不到该 ID 时不得静默创建新工单；保持原数据并给出可恢复反馈。
5. 取消只关闭编辑器，不修改 `tickets`，也不触发存储写入。
6. 保存或取消后，将焦点恢复到该行的编辑按钮；若工单因筛选、归档或删除而消失，则聚焦列表标题或下一个稳定控件。
7. 对正在编辑的工单执行归档等会令其离开当前列表的操作时，先结束编辑，避免留下指向不可见工单的编辑态。

创建草稿和编辑草稿应彼此独立，否则用户填写到一半再编辑旧工单会丢失创建内容。

## 编辑功能与存储格式变化的影响范围

| 变化 | 必须影响 | 通常不应影响 |
|---|---|---|
| 新增编辑交互，但字段不变 | `TicketWorkspace`、表单、列表操作、`useTickets.updateTicket`、行为测试 | JSON 格式、存储 key、迁移代码 |
| 修改已有字段值 | 工单 state 更新及随后的一次常规持久化 | 解析器版本 |
| 新增持久化字段 | `Ticket` 契约、解析器、序列化器、迁移及存储测试 | `App.tsx` |
| 仅新增编辑中的临时字段 | `TicketDraft` 和表单 | `Ticket`、本地存储 |
| 新字段参与显示、筛选或排序 | 对应 UI/选择器 | 无关组件 |
| 更换整体 JSON 结构或 key | `ticketStorage.ts` 及迁移测试 | 表单与列表，只要存储 API 不变 |

关键判断是：**“可编辑”不等于“存储格式发生变化”**。如果只是允许用户修改当前已经持久化的字段，继续使用现有格式即可。

如果确实需要加入例如更新时间等持久化信息，建议由 `ticketStorage.ts` 兼容旧格式并写入带版本的新格式，例如：

```ts
type StoredTicketsV2 = {
  version: 2
  tickets: Ticket[]
}
```

解析边界应接收 `unknown`，识别旧格式、迁移为当前 `Ticket[]`，并明确区分“有效空列表”和“数据损坏”。组件只消费已经验证的领域对象，不应散布类型断言、`try/catch` 或 `?? []`。

## 应覆盖的验证

- 点击编辑后字段正确预填，并聚焦首个字段。
- 保存只更新目标 ID，保留不可编辑字段。
- 取消不改变工单、不写入编辑草稿。
- 打开编辑不会清空未提交的创建草稿。
- 编辑后筛选和归档显示立即基于新数据重新派生。
- 保存、取消及工单离开列表后的焦点落点正确。
- 当前存储格式往返一致。
- 若升级格式：旧数据迁移、未知版本、畸形 JSON、缺字段数据分别有确定结果。

本次没有修改文件，也无法运行应用测试，因为仓库提交中没有应用源码或工具配置。