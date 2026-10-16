结论：把“工单编辑会话”和“本地存储格式”拆成两个独立边界；`App.tsx` 只负责应用壳与功能组装，不继续承载草稿、焦点、解析和所有工单操作。

当前 workspace 的 Git `HEAD` 是空树，没有 `App.tsx`、`package.json` 或测试文件。因此下面是基于请求描述的落地方案，无法对应到现有函数名或确认当前存储结构。

### 文件调整

| 文件 | 职责 |
|---|---|
| `src/App.tsx` | 顶栏和 `TicketBoard` 组装；不拆只有展示作用的顶栏 |
| `src/tickets/TicketBoard.tsx` | 筛选条件、归档显示开关、单一编辑会话；组合创建表单和列表 |
| `src/tickets/CreateTicketForm.tsx` | 创建草稿、提交后清空及恢复焦点 |
| `src/tickets/TicketList.tsx` | 列表与行内编辑 UI；简单时保留 `TicketRow` 在同文件 |
| `src/tickets/model.ts` | `Ticket`、`TicketDraft`、草稿规范化/校验以及纯更新操作 |
| `src/tickets/storage.ts` | `localStorage` key、解析、迁移和序列化 |
| `src/tickets/useTickets.ts` | 工单集合及唯一持久化入口，提供窄操作 API |

`useTickets` 建议只暴露：

```ts
{
  tickets,
  addTicket,
  updateTicket,
  toggleArchived,
  removeTicket,
  storageError
}
```

组件不应直接调用 `setTickets`，也不应了解存储版本。

### 状态归属

```ts
type TicketDraft = {
  title: string
  // 仅放用户可编辑字段
}

type EditSession = {
  ticketId: string
  draft: TicketDraft
} | null
```

- `tickets`：由 `useTickets` 持有，是内存中的权威工单集合。
- `query`、`showArchived`：由 `TicketBoard` 持有。
- `visibleTickets`：从上述状态派生，不另建 state。
- `createDraft`：留在 `CreateTicketForm`。
- `editSession`：由 `TicketBoard` 持有，以保证同一时间只有一个编辑器。
- `dirty`：比较 draft 与当前工单得出，不单独存储。
- 焦点：使用组件内 ref；开始编辑时聚焦输入框，保存或取消后回到原“编辑”按钮。若该行因筛选消失，则回到列表标题或筛选控件，不增加 `focusedTicketId` 状态。

切换筛选时保留尚未保存的 `editSession`，即使对应行暂时不可见；恢复筛选后可以继续编辑。删除正在编辑的工单时显式清除该会话。

### 编辑流程影响

1. `startEdit(ticket)` 将可编辑字段复制为草稿，不能直接编辑 `Ticket` 对象。
2. `saveEdit()` 先调用 `model.ts` 中与创建共用的规范化和校验规则，再执行 `updateTicket(id, draft)`。
3. 更新必须保留 `id`、`createdAt` 等非编辑字段；成功后退出编辑并恢复焦点。
4. `cancelEdit()` 只丢弃草稿，不修改工单。
5. 归档、删除、创建和编辑都通过 `useTickets` 的命令入口，避免各组件分别实现数组更新和存储写入。

创建表单和编辑器可以共享 `TicketDraft` 与校验函数，但暂不必强行共享一个高度可配置的表单组件；两者的提交文案、焦点和取消行为并不相同。

### 存储格式影响

仅编辑已有字段时，存储内容会变化，但格式不必变化，也不应为了“支持编辑”主动升级版本。

只有新增 `updatedAt`、描述、优先级或改变外层结构时，才需要格式迁移：

- 保留当前解析器实际接受的形状为旧版本契约。
- 新格式使用明确版本，例如 `{ version: 2, tickets: [...] }`。
- `storage.ts` 同时读取旧格式和新格式，迁移为统一的内存 `Ticket[]`。
- 序列化器只写新格式，并保持原有 storage key，除非确实需要换 key。
- 解析结果应区分“有效数据”和“格式损坏”，避免启动时把解析失败误当空列表并立即覆盖原数据。

影响范围可按下面判断：

| 变化 | 需要调整 |
|---|---|
| 新增编辑交互，但字段不变 | `TicketBoard`、列表/编辑 UI、`updateTicket`、交互测试 |
| 新增可编辑字段 | `TicketDraft`、创建与编辑 UI、校验、存储契约 |
| 新增只读元数据，如 `updatedAt` | `Ticket`、更新操作、迁移/序列化；仅在展示时影响 UI |
| 改变存储外层结构 | 解析器、迁移器、序列化器、加载流程及存储测试 |
| 改变过滤或排序语义 | 派生列表逻辑及对应交互测试 |

不需要新增 Redux、Zustand、表单库或 schema 依赖；React 状态、纯函数和一个明确的存储边界足够。实际项目若已经使用运行时校验库，应复用现有方案。验证重点是编辑保存/取消与焦点、编辑后刷新恢复、旧格式迁移，以及损坏存储不会被静默覆盖。