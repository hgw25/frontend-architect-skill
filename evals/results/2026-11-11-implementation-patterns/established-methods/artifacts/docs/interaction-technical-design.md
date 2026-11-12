# 搜索与草稿保存技术设计

交付状态：设计完成，未开始实现。本文依据用户提供的事实与接口编写；工作目录没有应用源码、包清单、测试配置或已有文档。下文的模块路径、类型和函数均为拟议契约，实施时应归入项目已有功能目录，不能视作已经存在的符号。原始方法来源核对日期为 2026-11-11。

## 1. 已知事实、边界与实施前核对项

- 使用 React、TypeScript 与已安装的 RxJS 7，复用 `searchUsers(query): Observable<User[]>` 和 `saveDraft(snapshot): Observable<Receipt>`。
- 搜索只展示最近一次输入对应的结果；请求可能乱序，相邻的相同查询可能重复触发。
- 自动保存必须按提交顺序执行每份已提交快照，不合并或丢弃中间快照。
- 保存按钮在一次操作尚未结束时忽略重复点击；结束后允许再次点击。
- 页面离开时释放页面拥有的输入、搜索和 UI 观察订阅。停止观察不能证明服务端写入已撤销。
- `selection` 是人数的来源；不再存储 `selectedCount`，不使用 effect 同步人数。
- 不更换传输接口，不引入数据层、状态机引擎或新运行时。本次只有设计文档，不添加应用代码或测试骨架。

实施前应在真实项目核对以下事实，不能从 `Observable<T>` 的类型自行推断：

| 核对项 | 本设计采用的契约及影响 |
| --- | --- |
| Observable 的启动与结束 | 在订阅时启动请求；保存会在有限时间内返回一份确认回执并完成，或以错误结束。`concatMap` 和 `exhaustMap` 都以内部流结束为放行条件，单次 `next` 不等于结束。若现有接口是长期多播流，先沿用其既有单次操作适配方式，不能擅用 `take(1)` 掩盖未结束的写入。 |
| 回执与错误 | `Receipt` 表示服务端确认保存。若错误能区分明确拒绝与未知结果，沿用已有错误类型；仅凭网络错误不能认定“未写入”。无确认回执时显示“未确认”，不自动重试写入。 |
| 快照与身份 | 沿用项目的草稿快照类型和目标身份。提交时取得独立、之后不会随编辑变化的快照；不能把可变表单对象引用留到队列执行时再读取。一个保存协调器绑定一个草稿目标及其现有 `saveDraft` 能力，目标切换不能重绑定旧队列。 |
| 搜索语义 | 默认按原始字符串相等判定重复，不擅自 trim、改大小写或加入防抖。空字符串仍按既有 `searchUsers('')` 契约处理；若产品明确要求空值清空且不请求，只替换搜索内部流的空值分支，仍须切换掉旧查询。 |

### 生命周期的明确解释

为同时满足“不丢已提交保存”与“页面离开释放订阅”，保存队列由页面路由之外的**草稿会话所有者**持有。页面离开立即释放页面的订阅；已接纳写入由会话继续顺序排空，不再向卸载的页面发布状态。会话结束时关闭入口，排空后释放自己的写执行订阅。这里只延长一个功能内 RxJS 队列的所有权，不新增持久化数据层或运行时。

这是本设计对生命周期的明确选择。若“离开释放订阅”还要求立即取消写执行订阅，那么尚未启动的队列项会被丢弃，无法同时保证每份已提交草稿都执行，必须先调整这两个要求之一。不能把 `takeUntil` 放在保存链末端后，仍声称已提交队列会排空。

保证范围是同一运行中的应用、同一草稿会话内的本地有序执行。关闭标签页、进程退出、断网后的必达、多标签页与服务端提交顺序，不由这两个接口和内存队列保证。实施不增加导航阻拦或“离开前一定保存成功”的承诺。

## 2. 并发策略与状态所有权

| 行为 | 采用的方法与具体过程 | 保持的不变量 | 消费者可见结果 |
| --- | --- | --- | --- |
| 最新搜索 | 输入流先 `distinctUntilChanged()`，再 `switchMap` 到现有搜索 Observable；加载、结果、错误都从该内部流发出 | 只有当前内部流能发布搜索状态；旧请求的成功、错误与清理均不能覆盖新查询 | 新查询立即进入 loading 并隐藏上次列表；返回后显示对应列表、空结果或错误 |
| 每份自动保存 | 每次提交生成独立快照与本地提交编号，加入共同写队列；`concatMap` 在上一项结束后才调用并订阅下一次 `saveDraft` | 不合并、不去重、不以新快照替换旧快照；同一队列最多一个写执行 | 保留等待中、执行中及未确认反馈，回执对应具体提交 |
| 手动保存防重入 | 手动点击入口用 `exhaustMap`；接受后加入共同写队列，内部流直到这一提交结束才完成 | 从接纳、等待排队到执行结束都忽略后续手动点击；自动提交不受此门控影响 | 按钮等待/保存期间禁用，操作结束后恢复；禁用只是反馈，真正门控在流中 |
| 页面清理 | React effect setup 取得订阅，cleanup 释放相同页面实例取得的订阅 | 旧页面不发布状态、不销毁另一个页面或草稿会话的资源 | 页面离开后没有页面状态更新；已接纳写队列继续由会话管理 |
| 已选人数 | 渲染时从 `selection` 求值，例如已有唯一 ID 集合的 `.size` | `selection` 是唯一可写来源 | 同一次渲染中选择列表与人数一致 |

搜索与写入使用不同策略：切换搜索不需要保留旧结果，而保存明确要求保留每次提交。手动和自动保存如果各自直接调用同一个草稿的传输接口，仍可能交叉覆盖，因此共享一个串行写队列。手动 `exhaustMap` 是队列入口策略，不是另开一个写通道。

### 最小状态

- 页面持有原有可编辑 `draft`、输入 `query` 和 `selection`；每次修改沿用原有更新方式。提交事件传入当时快照，不等到请求开始再读当前草稿，也不通过监听草稿 state 的 effect 重复制造“提交”。
- 搜索能力持有请求视图 `SearchView`，其中的 `query` 是该请求的输入快照，用来标识结果所属请求。页面的可编辑输入与请求快照语义不同。
- 保存协调器持有等待/执行中的提交元信息、最近一次确认与未确认记录。快照留在队列内部；UI 元信息不复制整份草稿。已确认历史不持续累积，只保留最近确认。
- `selectedCount`、`manualPending`、`pendingCount` 从各自来源计算，不再设置对应可写 state。若 `selection` 不是 Set，沿用其现有结构计数；不因人数需求重建选择模型。
- 不新增通用请求引擎、全局 store、基类、缓存或服务端幂等机制。搜索用局部 Hook；队列用一个有明确生命周期的闭包协调器，其 identity 来自真实的草稿会话。

## 3. 拟议模块与代码契约

路径仅说明职责，不要求迁移项目现有目录。`DraftSnapshot`、`User`、`Receipt` 都应使用项目已有类型；不在本次设计中虚构字段。

| 拟议所有者 | 重要操作/契约 | 调用者、依赖及责任 |
| --- | --- | --- |
| `UserDraftPage.tsx` | 输入事件同时更新 `query` 并调用 `changeQuery(query)`；提交事件生成 `DraftSnapshot` 后调用对应保存入口 | 组合搜索、编辑、选择、按钮和反馈；渲染中直接计算人数。既不订阅传输，也不维护第二份保存状态 |
| `useUserSearch.ts` | `useUserSearch(searchUsers): { view: SearchView; changeQuery(query: string): void; retryQuery(query: string): void }` | 页面调用；搜索输入与显式重试共用一个 `switchMap`。页面生命周期拥有唯一执行订阅，内部捕获单次搜索错误 |
| `draftSaveCoordinator.ts` | `createDraftSaveCoordinator(saveDraft): DraftSaveCoordinator` | 草稿会话创建一次并注入页面。内部拥有自动提交入口、手动门控和唯一写执行订阅；保持各快照、顺序与反馈对应关系 |
| `useDraftSaveView.ts` | `useDraftSaveView(coordinator): SaveView` | 只订阅协调器的状态快照并桥接到 React；cleanup 只取消本页面的观察，不取消队列 |
| 页面路由之外的草稿会话宿主 | 创建、持有协调器，结束时调用 `closeAndDrain()` | 将同一草稿的消费者指向同一协调器。按草稿真实身份分隔实例；不能把不同草稿塞入隐式全局单例 |
| 已有传输模块 | `searchUsers(query): Observable<User[]>`；`saveDraft(snapshot): Observable<Receipt>` | 继续负责已有请求、授权与服务端协议；不更换签名，不假装有撤销、冲突版本或查询回执接口 |

下列类型是设计接口草图，不是已实现声明：

```ts
type SearchView =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'ready'; query: string; users: User[] }
  | { status: 'error'; query: string; error: unknown };

type SubmissionId = number; // 会话内编号，不是服务端幂等键
type SaveOrigin = 'auto' | 'manual';
type PendingSave = {
  id: SubmissionId;
  origin: SaveOrigin;
  phase: 'queued' | 'saving';
};
type SaveView = {
  pending: readonly PendingSave[];
  lastConfirmed?: { id: SubmissionId; receipt: Receipt };
  unconfirmed: readonly {
    id: SubmissionId;
    origin: SaveOrigin;
    error: unknown;
  }[];
};
interface DraftSaveCoordinator {
  readonly view$: Observable<SaveView>;
  commitAuto(snapshot: DraftSnapshot): void;
  requestManual(snapshot: DraftSnapshot): void;
  closeAndDrain(): Observable<void>;
}
```

`commitAuto` 和 `requestManual` 是事件入口，调用一次即提交一次；观察 `view$` 不会重新执行写入。`closeAndDrain()` 同步关闭新提交入口，返回共享的排空完成通知，调用或观察它都不得重启写入；重复关闭安全。关闭后的提交属于调用方生命周期错误，不静默接纳或丢弃。UI 文案根据项目已有错误分类区分拒绝与未知；`unconfirmed` 是缺少确认的视图类别，并不宣称服务端写入失败。

### 3.1 搜索的关键执行过程

下面是管线设计草图。`queryChanges$` 是普通输入事件，`retryQueries$` 由错误反馈中的显式重试产生；重试传入当时的查询快照，绕过相邻输入去重，之后仍遵守最新请求策略。

```ts
merge(
  queryChanges$.pipe(distinctUntilChanged()),
  retryQueries$
).pipe(
  switchMap(query =>
    defer(() => searchUsers(query)).pipe(
      map(users => ({ status: 'ready', query, users } as const)),
      catchError(error => of({ status: 'error', query, error } as const)),
      startWith({ status: 'loading', query } as const)
    )
  ),
  takeUntil(pageEnd$)
);
```

`catchError` 放在 `switchMap` 的内部，当前请求失败后新输入仍能工作；不以 `[]` 冒充成功。`defer` 把实际调用放到订阅时，也让同步抛错走相同错误通道。没有另一个在旧请求 `finalize` 中写 `loading=false` 的副作用；卸载只做资源清理，不写成功或错误状态。`takeUntil` 位于展开操作之后，页面结束时会连当前内部搜索订阅一起释放；`pageEnd$` 必须发出值，仅 `.complete()` 不会触发 `takeUntil`。

去重范围是本页面输入流中的相邻同值：`A,A,B,A` 发起 `A,B,A`，不会建立全历史缓存，也不共享跨页面请求。显式重试可重新请求相同字符串。一次管线只保留一个执行订阅；不要给 loading、列表、错误各订阅一次冷搜索链，造成多个请求。需要多个 UI 消费者时共享已产生的 `SearchView`。

### 3.2 共同写队列与手动入口

队列按事件被接纳的先后排序。自动入口每次直接接纳，手动入口只有通过 `exhaustMap` 才能接纳。提交编号仅在接纳时分配；重复点击不产生队列项。

```text
commitAuto(snapshot) -------> accept('auto', snapshot) ------+
                                                          |
requestManual(snapshot) -> manualRequests$                 |
  -> exhaustMap(snapshot => accept('manual', snapshot).done$)
                               |                          |
                               +--------------------------+
                                                          v
                                                     commands$
                                                          |
                      concatMap(command => defer(() => saveDraft(command.snapshot))
                        + 本项回执/错误记录
                        + 本项结束时完成 command.done$)
                                                          |
                                                          v
                                            更新协调器的 SaveView
```

以上 `accept`、`done$`、`commands$` 均是协调器私有机制，不是新平台 API。具体过程如下：

1. `accept` 保留不可变提交快照、分配编号，向 `SaveView.pending` 加入 queued 元信息，再送入 `commands$`。`commands$` 只有一个写执行订阅。
2. `concatMap` 轮到该项时才调用 `saveDraft`，把该元信息改为 saving。请求创建不能提前放在入队前，不能在投影里另行 `.subscribe()` 后立即返回 `EMPTY`，否则没有真正等待写操作。
3. 收到确认回执后，记录 `{id, receipt}`。等待传输内部流完成后才结束这一项并放行下一项。不能用回执到达之前的本地点击状态宣称成功。
4. 单项错误在 `concatMap` 的**内部**捕获，记录对应编号的未确认结果，使该项正常结束，再处理下一项。不能让一项错误终止外部命令流而丢掉后续自动保存，也不能吞错后显示“全部已保存”。已有明确拒绝可照常显示；未知结果不自动重试，不宣称已回滚。
5. `done$` 可由现有 RxJS `AsyncSubject` 承载，仅在该项结束时给手动入口完成信号；即使同步传输已完成、监听稍晚，也能收到末值与完成。`done$` 的取消观察只移除这位观察者，不取消已接纳命令。自动入口无需观察 `done$`。
6. `exhaustMap` 的内部流必须包含排队等待和完整写执行；若接纳后立即完成，第二次点击就会再次入队。手动入口本身也属于会话，页面重新挂载不能绕过仍在等待/执行的手动提交。
7. 一份保存确认不会重置编辑中的草稿、选择或搜索；新编辑可以继续提交后续快照。`lastConfirmed` 只表明某编号已确认；队列仍有项或存在未确认项时，不把它显示成“当前所有修改已保存”。不凭内容相等推断版本相等。

后续提交失败时，保留此前提交的确认回执，并把失败归到后续提交的编号。当前设计在回执后只更新视图，没有额外刷新等后续业务步骤。单次回执后完成的传输契约仍须实施时核对；若真实接口存在确认后观察错误等不同语义，应先修订状态契约，不能直接套用未确认分支。

本地串行只保证下一次调用在上一次 Observable 结束后开始。若某次网络错误使服务器结果未知，不能据此证明其服务端执行已结束，也不能承诺跨错误的服务端提交顺序。现有接口没有版本或核对能力时应诚实显示未确认；严格的远端顺序、重试安全与最终成功需要服务端现有契约提供依据，不能由客户端操作符补出。

### 3.3 清理与会话结束

- 搜索 Hook 和保存视图 Hook 在 React effect setup 中取得订阅，cleanup 释放同一次 setup 的资源。实例放在所属生命周期中；不在 render 中订阅或发起请求。
- 输入事件通过处理器提交，不把 `draft`、`query` 的每次渲染都当作重新创建订阅的理由。已有传输函数与协调器身份稳定；真正更换传输目标时结束旧所有者，再建立新实例，不省略 effect 依赖来隐藏切换。
- React Strict Mode 的 setup → cleanup → setup 应产生一个有效的页面订阅集合；不会因为观察者重挂载重新提交已接纳快照。协调器由草稿会话创建，不由观察 Hook 的 effect 每次新建。
- 页面离开时触发搜索 `pageEnd$` 或释放其根订阅；取消 `view$` 的页面订阅及页面事件连接。写队列没有连接该 `pageEnd$`，也没有 `shareReplay({refCount:true})` 使最后一个页面离开时悄悄取消写入。
- 草稿会话真正结束调用 `closeAndDrain()`：先阻止新提交，再关闭命令与手动事件源，让已接纳项排空。源完成本身不会取消当前内部流或缓冲项；写执行订阅自然完成后，会话释放剩余观察和引用。存在未结束写入时不把 `.unsubscribe()` 当作排空。
- 应用强制退出时无法保证内存队列继续存在；已发送写入可能已经生效。没有回执就保留未知结论，不向用户展示“已取消并撤销”。

## 4. 技术架构图

本图为可直接阅读和编辑的纯文本图，不依赖未校验的图形 DSL。箭头表示调用或依赖，虚线分隔生命周期所有者。

```text
React 应用 / 草稿会话（页面路由之外，绑定既有草稿身份）
  |
  +-- 创建并持有 DraftSaveCoordinator
  |     - commitAuto / requestManual
  |     - manualRequests$ -> exhaustMap -> 共同 commands$
  |     - commands$ -> concatMap -> saveDraft(snapshot) ----> 已有传输 / 服务端
  |     - SaveView / 每项回执与未确认状态                  <---- Receipt / error
  |     - closeAndDrain：关闭入口，排空后释放写执行订阅
  |
  +-- 注入同一 coordinator
            |
  - - - - - | - - - - 页面实例的订阅与状态边界 - - - - - - - - -
            v
       UserDraftPage
         |-- query / draft / selection
         |-- selectedCount = 从 selection 计算
         |
         |-- useUserSearch(searchUsers)
         |     changeQuery / retryQuery
         |       -> distinctUntilChanged（仅普通输入）
         |       -> switchMap -> searchUsers(query) --------> 已有传输 / 服务端
         |                    <------------------------------ User[] / error
         |     SearchView -> 页面列表、加载与错误
         |
         +-- useDraftSaveView(coordinator)
               view$ 观察 -> 按钮、排队/保存与确认反馈

页面 cleanup ---> 释放搜索、输入连接与 view$ 页面观察
草稿会话结束 --> closeAndDrain（与页面 cleanup 分开）
```

页面仅组合能力；搜索能力不依赖保存队列，保存队列不依赖 React 或页面 setter，传输模块不反向依赖它们。这里无需类继承或通用任务调度框架。

## 5. 数据流图

此图跟踪具体输入及其成功、失败、过期和离开分支，数据名称与上文契约一致。

```text
搜索
输入 A -> 页面更新 query -> changeQuery(A) -> 去重 -> switchMap 订阅 searchUsers(A)
输入 B -> 页面更新 query -> changeQuery(B) -> 去重 -> 退订 A，订阅 searchUsers(B)
                                                    |
                                                    +-> loading(B) -> 页面隐藏 A 的列表
                                                    +-> User[] -> ready(B, users) -> 页面列表
                                                    +-> error  -> error(B) -> 页面错误 / retryQuery(B)
A 晚到的成功/错误 ------------------------------------X 不能再发布 SearchView
连续再次输入 B -> 去重 -------------------------------X 不再启动请求
离开页面 -> 搜索根订阅释放 ---------------------------X 不再向页面发布

保存（同一草稿会话）
自动提交快照 S1 -> commitAuto(S1) -> 接纳 id=1 -> queued(1)
自动提交快照 S2 -> commitAuto(S2) -> 接纳 id=2 -> queued(2)
手动点击快照 M  -> requestManual(M) -> exhaustMap 接纳 id=3 -> queued(3)
再次手动点击 ----------------------------------------X 忽略，不入队
                                                       |
                                                       v
                 concatMap：saveDraft(S1) 开始，S2/M 仅等待
                   |-- Receipt R1 -> lastConfirmed(1,R1) -> 页面确认
                   |-- error -> unconfirmed(1,error) -----> 页面未确认反馈
                   +-- 本项结束 -> 移除 pending(1)，完成 done$(1)
                                                       |
                                                       v
                 saveDraft(S2) -> 回执/错误 -> 结束 -> saveDraft(M)
                                                       |
                 M 结束 -> done$(3) 完成 -> exhaustMap 可再次接受点击

排队期间离开页面 -> 释放页面输入/搜索/SaveView 订阅
                 -> 协调器仍按 S1、S2、M 的接纳顺序完成尝试
                 -> 结果只更新会话 SaveView，不调用旧页面 setter
会话 closeAndDrain -> 停止新接纳 -> 最后已接纳项结束 -> 释放会话写订阅
强制退出/取消观察 -> 无法推导服务端回滚；未确认结果保持未知

选择
选择事件 -> 更新唯一 selection -> 本次 render 计算人数 -> 页面显示
```

错误分支结束的是对应尝试，不能把 `unconfirmed` 抹掉后声称全部保存成功。接纳顺序与确认成功是两个不同事实。

## 6. 依赖有序的实施步骤（共 4 步）

以下全部为后续实施计划，本次未执行任何应用改动。

| 步骤 | 功能、前置条件与涉及所有者 | 支撑操作与完成验收 |
| --- | --- | --- |
| 1. 确定状态来源与提交边界 | 核对第 1 节接口前提、现有草稿身份/快照类型/文档目录；在页面保留 `selection`、编辑草稿与输入的唯一所有者 | 删除拟议 `selectedCount` state/effect，渲染派生人数；确定自动保存“已提交”的事件入口和独立快照。验收为选择与人数同次更新、排队快照不随后续编辑改变 |
| 2. 接入最新搜索 | 依赖步骤 1 的页面输入入口；实现 `useUserSearch`，复用现有 `searchUsers` | 连续同值去重，`switchMap` 内统一 loading/ready/error，单项错误可恢复，页面 cleanup 退订内部请求。以矩阵 T1–T3 验收 |
| 3. 接入共同保存队列与按钮门控 | 依赖步骤 1 的快照与草稿目标；草稿会话宿主创建 `createDraftSaveCoordinator`，页面接入 `useDraftSaveView` | 自动入口接纳每项；手动入口 `exhaustMap`；同一 `concatMap` 执行传输，错误局部隔离，回执按编号归属。以 T4–T7、T9 验收 |
| 4. 完成离开与会话排空流程 | 依赖步骤 2、3；连接页面清理与会话结束，补齐真实页面反馈 | `closeAndDrain` 与页面退订分开；页面只观察、不会重放写入。以 T8、T10 及真实 React 页面重挂载验收，核对两张图与最终符号、调用者一致 |

## 7. 计划验收矩阵

优先使用项目现有测试运行器与 RxJS 7 `TestScheduler` 或可控 Subject 模拟传输，精确控制 next/error/complete，不用真实网络延时制造竞态。测试应观察最终 `SearchView`/`SaveView` 与传输调用参数、次序；再用真实 React 页面验证事件连接、离开清理和反馈。下列测试均是建议执行，尚未运行。

| 编号 | 可控场景 | 必须观察到的结果 |
| --- | --- | --- |
| T1 | 搜索 A 后输入 B；分别让 A 在 B pending 时成功/失败，以及 B 成功后 A 晚到 | 页面不会回到 A、不会显示 A 错误、不会被旧清理关闭 B 的 loading；最终只有 B 的状态 |
| T2 | 普通输入 `A,A,B,A`；另对失败的 A 显式重试 | 普通输入只调用 `A,B,A`；重试允许再调用 A，不把去重当缓存 |
| T3 | 当前搜索报错后输入新查询；搜索中离开页面 | 错误视图真实可见且新输入可恢复；离开后内部订阅释放，没有旧页面更新 |
| T4 | 连续提交 S1、S2、S3；让 S1 先 next 回执但不 complete | 只调用 S1；S1 complete 后才调用 S2，S2 结束后才调用 S3；参数保持三份独立原始快照，没有跳项 |
| T5 | 手动点击 M1、M2；M1 尚在排队或执行；M1 结束后再点击 M3 | 只接纳 M1、M3；M2 从未调用传输；成功与单项错误结束后均可再次点击 |
| T6 | 自动 S1、手动 M、自动 S2 混合提交；期间再手动点击 | 同一时刻只有一个写执行，实际调用顺序为 S1、M、S2；重复手动项不存在，自动项不被门控丢弃 |
| T7 | S1 尚未执行时继续编辑；S1 失败后 S2 成功 | S1 使用提交时快照；S1 的未确认反馈保留且 S2 仍执行；不重试 S1、不显示全部已保存，也不回滚当前编辑 |
| T8 | S1 执行、S2 等待时卸载页面；然后使两个写入结束；最后关闭会话 | 页面订阅归零、没有页面状态更新；S2 仍执行；排空通知完成后写订阅释放。强制取消观察不能被呈现为服务端撤销 |
| T9 | S1 已确认，随后排队的 S2 失败 | `lastConfirmed` 保留 S1 回执，S2 的未确认记录使用 S2 编号；页面既展示确认历史又展示当前问题，不重放 S1 或声称当前全部保存成功 |
| T10 | Strict Mode setup/cleanup/setup、普通 rerender、同一会话页面重挂载；快速增删选择 | 只有一个有效页面观察集合，不重放提交、不绕过未结束的手动门控；人数与 selection 同次渲染一致，无人数同步 effect |

## 8. 方法依据与本项目适用边界

采用的是框架/库的公开机制，不是新的模式名称或一套通用架构规范。下列原始来源与实际过程一一对应：

| 原始来源 | 方法过程与本地适配 |
| --- | --- |
| RxJS 7 维护者的 [switchMap 源码与说明](https://github.com/ReactiveX/rxjs/blob/7.x/src/internal/operators/switchMap.ts) | 新外部值到来时退订旧内部流，仅发布当前内部流。用于搜索的全部状态通道；不用于必须逐项执行的写队列。 |
| RxJS 7 的 [distinctUntilChanged](https://github.com/ReactiveX/rxjs/blob/7.x/src/internal/operators/distinctUntilChanged.ts) | 首值通过，后续与上一次已发出的值比较。这里按字符串默认相等消除相邻重复输入，显式重试在去重后合流；没有全局缓存。 |
| RxJS 7 的 [concatMap](https://github.com/ReactiveX/rxjs/blob/7.x/src/internal/operators/concatMap.ts) | 缓冲后续项，等待上一内部流完成后依次订阅；这里用于共同写队列。源持续快于保存会积压，不能为降压丢弃已接纳项。若真实负载出现积压，先检查提交频率和反馈；新增接纳策略须发生在“已提交”边界之前并有产品依据。 |
| RxJS 7 的 [exhaustMap](https://github.com/ReactiveX/rxjs/blob/7.x/src/internal/operators/exhaustMap.ts) | 当前内部流未结束时忽略新激活，结束后恢复接纳。这里的内部流是手动提交从排队到结束的通知，手动与自动写入仍走共同队列。 |
| RxJS 7 的 [catchError](https://github.com/ReactiveX/rxjs/blob/7.x/src/internal/operators/catchError.ts)、[defer](https://github.com/ReactiveX/rxjs/blob/7.x/src/internal/observable/defer.ts)、[AsyncSubject](https://github.com/ReactiveX/rxjs/blob/7.x/src/internal/AsyncSubject.ts) | 单项错误转换为明确失败反馈；延迟创建请求；完成通知能覆盖同步完成与稍晚订阅。这里只是功能内部适配，不向全项目推广新的 Result 类型。 |
| React 的 [useEffect 生命周期](https://react.dev/reference/react/useEffect) 与 RxJS 7 的 [takeUntil](https://github.com/ReactiveX/rxjs/blob/7.x/src/internal/operators/takeUntil.ts)、[Subscription](https://github.com/ReactiveX/rxjs/blob/7.x/src/internal/Subscription.ts) | setup/cleanup 成对，依赖变更先清理旧实例；页面拥有的订阅可以组合释放。将页面观察和会话写执行拆开，是根据本项目“不丢保存”做的所有权选择；库本身不保证服务端回滚或跨退出必达。 |
| React 的 [Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure) 和 [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) | 找到最小状态并删除可计算的冗余项，渲染时求派生值。这里直接从 selection 计算人数，effect 只用于外部订阅同步。 |

来源已核对 RxJS `7.x` 的维护者实现；真实项目没有提供精确小版本、React 版本或传输实现，因此没有声称锁定版本兼容性已经运行验证。实施不依赖较新 React 专用 API。

## 9. 后续变化检查与本次实际验证

现实变化场景是“搜索增加部门筛选”。届时将请求身份从字符串改为 `{ query, departmentId }`，在去重比较中纳入完整身份，并把同一快照传入搜索适配；加载/错误/结果仍由同一 `switchMap` 内部流发布。修改集中在页面输入与搜索能力，保存队列和 selection 计数不需跟随变动。本次没有预建通用 query-key 系统。若实际项目要更换服务签名，应在已有传输能力边界适配，而非悄悄忽略新筛选维度。

本次实际完成的核对：

- 读取完整输入接口与提供的技能相关章节，确认工作目录没有应用文件或既有文档可复用。
- 查阅上表 React、RxJS 7 官方文档及维护者源码，核对切换、串行、忽略激活、相邻去重、错误隔离和清理语义。
- 对照需求逐项检查拟议契约、步骤、两张纯文本图与验收矩阵，检查了重复输入、旧请求错误、队列误取消、手动绕过队列、确认被覆盖和派生人数等边界。
- 对 Markdown 文件进行静态结构检查，包括代码围栏成对、链接格式与交付文件范围；没有引入图形 DSL 或额外绘图工具链。

未执行 TypeScript 编译、RxJS 管线测试、React 集成测试、浏览器导航或真实服务调用；没有应用实现可以运行。第 7 节是后续验收计划，不能当作已通过的运行证据。当前可交接成果是这份设计与其明确的接口前提，下一步从第 6 节步骤 1 开始。
