## 结论

采用“页面级上传管理器 + 每文件可恢复会话 + 全局双槽调度”的架构：

- 同时最多运行两个文件任务；暂停、失败、完成和取消的任务不占槽位。
- 每个文件同一时间只上传一个分片，降低暂停、重试和确认状态的竞态复杂度。
- 进度以服务端已确认字节数为准；现有 `putPart` 没有字节级进度回调，因此进度按分片确认推进。
- 继续或重试前先 `inspect(uploadId)`，服务端已确认的分片绝不重传。
- `complete` 失败一律视为结果未知，先用 `status` 对账，不能直接报告失败或成功。
- 复用 `appApi` 的认证、取消和标准错误；不建立新的请求层。
- 不使用 IndexedDB、Service Worker 或后台上传；页面生命周期结束时释放 `File`、分片引用、监听器和 `AbortController`。

当前工作区没有实际的 `src/uploads/upload.ts` 和 `docs/uploads.md` 文件，只有题目提供的内容，因此以下是实现级设计，没有修改或虚构仓库文件。

## 边界与模块

建议保持 `src/uploads/upload.ts` 为现有调用者可发现的公共入口，内部按真实职责拆分：

```text
src/uploads/
  upload.ts           公共导出、appApi 生产环境装配、旧入口迁移
  uploadModel.ts      状态联合类型、事件、纯 reducer、进度选择器
  uploadManager.ts    双槽调度、单文件工作流、竞态和资源生命周期
  useUploads.ts       React 创建/订阅/销毁 UploadManager
  UploadList.tsx      文件选择、列表、进度及操作按钮
```

不增加 `uploadApi.ts` 转发层。`UploadManager` 接受一个仅包含 `create/putPart/inspect/complete/status/abort` 的窄类型依赖，生产环境直接传入 `appApi`，测试传入可控实现。这一接口承担异步测试边界，不复制认证或错误处理。

现有 `uploadFile(file, signal)` 是否保留，必须在实现时先搜索真实调用者：

- 有调用者：先保留并标记迁移，完成页面迁移后再删除。
- 无调用者：由新的上传入口替换。
- 不让旧单文件接口偷偷绕过新队列，否则无法保证全局最多两个活动文件。

## 状态模型

使用纯 reducer 表达合法转换，不引入状态机库。

```ts
type UploadTaskId = string;

type UploadPhase =
  | 'queued'
  | 'creating'
  | 'reconciling'
  | 'uploading'
  | 'pausing'
  | 'paused'
  | 'completing'
  | 'cancelling'
  | 'failed'
  | 'cancelled'
  | 'completed';

type UploadSession = {
  uploadId: string;
  partSize: number;
  confirmedIndices: ReadonlySet<number>;
};

type UploadFailure = {
  stage: 'create' | 'inspect' | 'putPart' | 'complete' | 'status' | 'abort';
  error: /* 项目已有的 appApi 标准错误类型 */;
};

type UploadItemSnapshot = {
  id: UploadTaskId;
  name: string;
  size: number;
  phase: UploadPhase;
  confirmedBytes: number;
  fileId?: string;
  failure?: UploadFailure;
};
```

内部任务还持有：

- `File`：仅可恢复状态持有；完成或取消后立即释放。
- 可选的 `UploadSession`。
- 单调递增的 `runId`：阻止暂停、取消或销毁前启动的异步结果污染新状态。
- 当前请求的 `AbortController`。
- 用户意图：继续运行、暂停或取消。

`confirmedBytes` 不单独存储，而是由 `confirmedIndices`、`partSize` 和文件大小推导，最后一个分片按实际剩余字节计算。服务端 `inspect` 结果替换本地确认集合，而不是盲目合并。

后端契约还需在编码前确认一项：`index` 从 0 还是 1 开始。该事实影响切片范围和进度计算，设计不应猜测。

## 公开契约

```ts
type UploadQueueSnapshot = {
  items: readonly UploadItemSnapshot[];
  activeCount: number;
};

interface UploadQueueCommands {
  add(files: Iterable<File>): readonly UploadTaskId[];
  pause(id: UploadTaskId): void;
  resume(id: UploadTaskId): void;
  retry(id: UploadTaskId): void;
  cancel(id: UploadTaskId): void;
}

function useUploads(): UploadQueueSnapshot & UploadQueueCommands;
```

命令同步记录用户意图，最终状态通过 snapshot 发布。异步异常由对应文件任务拥有，不从事件处理器产生无人处理的 Promise rejection。

## 调度和恢复规则

1. 添加文件后进入 FIFO 队列；相同名称或内容仍是两个独立任务，不做未约定的去重。
2. 调度器仅在 `activeRuns.size < 2` 时启动任务。创建会话、对账、上传和完成确认都占用该文件的一个活动槽。
3. 单个文件按索引顺序上传缺失分片，同时最多一个 `putPart` 在途。
4. 暂停时先进入 `pausing` 并中止当前请求。请求可能已经被服务端确认，因此继续时必须先 `inspect`，不能根据 `AbortError` 推断分片未成功。
5. 失败重试：
   - 尚无 `uploadId`：重新执行 `create`。
   - 已有 `uploadId`：先 `inspect`，再从第一个缺失分片继续。
6. `complete` 返回 `fileId` 后才能完成。若它抛错：
   - 立即调用一次 `status(uploadId)`。
   - `completed`：使用返回的 `fileId` 发布成功。
   - `uploading`：进入可重试的完成失败状态；重试仍先查 `status`，再调用 `complete`。
   - `status` 也失败：保留“结果未知”的失败状态，不能显示上传失败后可安全重建会话。
7. 取消：
   - 排队且没有会话：直接取消并释放 `File`。
   - 已有会话：进入 `cancelling`，中止在途请求并调用 `abort(uploadId)`；只有服务端确认后进入 `cancelled`。
   - `abort` 失败：显示取消失败，并提供“重试取消”，不能伪装为已终止。
8. 零字节文件在 `create` 后不发送分片，直接进入完成确认。

## 技术架构图

```text
UploadList.tsx
  ├─ 原生 <input type="file" multiple>
  ├─ 文件行、<progress>、暂停/继续/取消/重试
  └─ 调用 useUploads()
                 │ commands / immutable snapshot
                 ▼
useUploads.ts ── React 生命周期与 useSyncExternalStore 适配
                 │ create / subscribe / dispose
                 ▼
UploadManager
  ├─ 双槽 FIFO 调度器
  ├─ 每文件 runId、AbortController 和 File 所有权
  ├─ create → inspect/putPart → complete/status 工作流
  └─ 通过事件更新
                 ▼
uploadModel.ts
  ├─ 纯 reducer
  ├─ 合法状态转换
  └─ confirmedBytes 等派生值

UploadManager ── focused Upload API contract ──► 现有 appApi
                                                    │
                                                    ▼
                                               分片上传服务
```

依赖方向保持为 UI → React 适配 → 工作流 → 状态模型/`appApi`；状态模型不依赖 React、浏览器 API 或网络。

## 数据流图

```text
用户选择 File[]
  │
  ▼
add(files) ──► 创建本地任务 ──► queued ──► 双槽调度
                                        │
                                        ▼
                               create(name, size)
                                        │
                              uploadId + partSize
                                        ▼
                       选择首个未确认分片并 file.slice()
                                        │
                                        ▼
                         putPart(uploadId, index, blob)
                           │                    │
                    服务端确认              失败/被中止
                           │                    │
                           ▼                    ├─ 暂停意图 ─► paused
                reducer 记录 confirmed         └─ 其他 ─────► failed
                           │
                    仍有缺失分片？
                      │          │
                     是          否
                      │          ▼
                      └──── complete(uploadId)
                                  │
                      ┌───────────┴────────────┐
                      ▼                        ▼
                  返回 fileId               响应丢失/失败
                      │                        │
                      ▼                        ▼
                  completed             status(uploadId)
                                          │          │
                                  completed + id   uploading/失败
                                          │          │
                                          ▼          ▼
                                      completed   可重试失败

resume/retry ─► inspect(uploadId) ─► 用服务端 confirmedIndices 替换本地集合
                                      └─► 只发送缺失分片
```

所有 await 返回后都必须同时检查：

- 管理器尚未销毁；
- 当前任务仍存在；
- 返回结果的 `runId` 仍是当前运行；
- 当前意图没有变为取消。

`AbortSignal` 用来节省工作，`runId` 才负责阻止过期结果发布。

## React 与界面契约

- 使用原生文件输入和原生按钮，支持键盘及辅助技术。
- 每行提供文件名、明确文本状态和 `<progress max={size} value={confirmedBytes}>`。
- 进度表示“服务端已确认”，不会展示无法由当前 API 证明的字节级上传进度。
- 按状态只展示合法操作：
  - `uploading`：暂停、取消；
  - `paused`：继续、取消；
  - 可恢复 `failed`：重试、取消；
  - 取消失败：重试取消；
  - `completed/cancelled`：无上传控制。
- 状态变化用克制的 `aria-live="polite"` 区域通知；错误可使用 `role="alert"`。不要为每个分片重复播报百分比。
- “继续”进入队列，并不绕过其他已排队文件抢占第三个活动槽。

## 生命周期

`useUploads` 每次页面挂载创建一个管理器实例，并在卸载时调用 `dispose()`：

1. 标记 disposed 并递增/作废所有 `runId`；
2. 中止所有在途请求；
3. 清除订阅者；
4. 丢弃 `File`、切片和控制器引用；
5. 禁止之后到达的 Promise 发布状态。

不使用 `beforeunload + sendBeacon` 绕过 `appApi`，也不声称浏览器关闭时能够可靠等待服务端 `abort`。显式取消必须正常调用 `abort`；页面销毁只承诺题目要求的本地资源释放。若后端要求回收异常关闭留下的会话，应由服务端 TTL 保证，而不是在前端伪造可靠性。

## 六个依赖有序的实现增量

1. **确定 API 与兼容边界**  
   核对 `appApi` 的真实方法类型、分片索引起点及旧 `uploadFile` 调用者。完成标准：生产装配不自行构造认证头，旧调用者有明确迁移结果。

2. **建立状态模型**  
   实现联合状态、事件、reducer 和进度选择器。完成标准：非法状态无法由公共事件产生，末片和零字节进度测试通过。

3. **实现双槽调度器**  
   实现 FIFO、活动槽、`runId` 和稳定 snapshot。完成标准：可控 Promise 测试证明任意时刻最多两个文件运行，释放槽位后只启动下一个任务。

4. **接通可恢复分片工作流**  
   实现 create、inspect、逐片上传、complete/status、暂停、重试和取消。完成标准：确认分片不重传，暂停竞态和 complete 响应丢失均得到正确对账。

5. **接入 React 和可访问界面**  
   实现 hook、文件列表、进度及状态对应操作。完成标准：从选择三个文件到前两个运行、第三个排队的页面行为测试通过；键盘可完成全部操作。

6. **补齐销毁与迁移验证**  
   实现 dispose，迁移真实页面消费者，并按调用情况移除或暂留旧入口。完成标准：卸载会中止请求、释放文件引用，迟到结果不能更新 UI。

## 计划验证

需要覆盖的决定性测试包括：

- 三个文件加入时最多两个进入网络流程。
- 暂停时 `putPart` 已被服务端确认但客户端收到取消，继续后 `inspect` 阻止重传。
- 上传失败后重试只发送缺失索引。
- `complete` 抛错但 `status` 返回 completed 时仍正确成功。
- 旧运行的 success、error 和 finally 均不能覆盖新的运行状态。
- 取消排队任务不调用服务端；取消已有会话必须等待 `abort`。
- 组件卸载后所有 signal 被中止且没有状态发布。
- 浏览器中验证文件输入、按钮键盘操作、进度语义和动态状态通知。

这些都是拟议检查；本次是设计交付，未执行实现或运行测试。

一个现实的后续变化是“单文件允许并行多个分片”。它只需替换 `UploadManager` 内部的分片选择与每文件并发策略；全局双文件槽、状态模型、React API、服务端对账和 UI 进度语义都无需改变，因此当前边界能够承接该变化而不预建通用任务框架。