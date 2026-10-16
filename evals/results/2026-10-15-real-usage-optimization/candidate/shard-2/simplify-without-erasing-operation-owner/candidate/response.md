结论：不要继续以“减行数”为目标。这里需要保留一个清楚的发送操作所有者，但不需要新增 `SendManager`、状态机或通用请求层。最小完整方案是：首个 `await` 前冻结发送快照，共享的账号隔离留在 `enqueue`，草稿所有者提供按 revision 条件清理。

### 建议实现

```ts
async function send() {
  const target = {
    activityId: store.activeId,
    accountId: store.accountId,
  };
  const draft = {
    revision: editor.revision,
    text: editor.text,
    files: [...editor.files],
  };
  const mode = store.mode;

  // 复用 upload 现有的账号失效检查；
  // 若它需要账号或登录 generation，传入此处捕获的值，不再读取当前 store。
  const attachments = await upload(draft.files);

  await enqueue({
    ...target,
    text: draft.text,
    mode,
    attachments,
  });

  editor.clearIfRevision(target, draft.revision);
}
```

其中 `clearIfRevision` 是建议新增或复用的窄接口，语义必须是：

```ts
clearIfRevision(
  target: { accountId: AccountId; activityId: ActivityId },
  revision: DraftRevision,
): void
```

它从草稿存储中定位原账号、原活动的草稿，仅在 revision 仍相同时清空；不能操作“当前编辑器”。如果编辑器只是当前草稿视图，这个方法应落在其底层草稿 store，例如 `drafts.clearIfRevision(...)`。

这样处理各条竞态：

- 切活动：`enqueue` 仍收到提交时的 `activityId`，不能重新读取当前活动。
- 继续编辑：发送旧 revision 的快照；新 revision 不被完成回调清除。
- 切账号：上传现有失效检查可以终止旧操作；若命令已经入队，也只能保留在原账号分区，不能改绑新账号。
- 入队失败：不会执行条件清理，草稿保留。
- 文件列表也要复制，否则编辑器原地修改数组时会改变待上传内容。

`enqueue` 是所有发送入口共同经过的边界，因此账号隔离应在那里统一成立：持久化记录保留原 `accountId`，出队时按该账号取得发送能力；账号能力已经失效时进入现有失败或暂停流程，绝不能退回 `store.accountId`。服务端仍需以认证身份做最终授权。不要在各发送入口重复增加账号判断、请求序号或本地幂等层。

### 不建议增加的抽象

- 不提取仅转发参数的 `prepareSend → performSend → finishSend` 链。
- 不使用 latest-wins 或因切活动取消；消息写入不是搜索结果发布。
- 不新增全局 pending counter、发送状态机或另一套队列。
- 不复制 `enqueue` 已有的持久化和幂等能力。
- 不用普通 `editor.clear()` 加当前页面判断；它既遗漏后台原草稿，也容易误清新草稿。

未来增加 `replyToId`、定时发送等命令字段时，只需在首个 `await` 前加入发送快照，不需要改变生命周期模型。

### 验证安排

使用可控 Promise 精确安排完成顺序，不使用定时等待：

1. 上传未完成时从活动 A 切到 B：断言入队仍是 A，B 草稿不变。
2. 上传未完成时将 A 草稿从 revision 1 编辑到 revision 2：断言发送 revision 1 的内容，revision 2 保留。
3. 上传期间从账号甲切到乙并触发现有失效检查：断言不调用 `enqueue`、不清草稿，且不会产生乙账号命令。
4. 命令已经以账号甲入队后再切乙：在队列到传输边界断言它只使用甲的发送能力；甲已失效时不得改用乙。
5. `enqueue` 拒绝：断言原 revision 不被清除。
6. 未切换也未编辑且入队成功：断言只清除原活动的相同 revision。
7. 对其他发送入口运行现有回归测试，确认仍统一经过 `enqueue`；保留其既有持久化与幂等测试。

本地 Skill 的异步所有权指导直接影响了方案：稳定快照负责命令执行，带身份和 revision 的条件更新负责结果发布，两者不混成“完成后清当前编辑器”。

当前工作区没有项目源码、清单或测试，仅包含 `.frontend-architect` 和 Git 元数据，因此无法实际落代码或执行项目测试；技能目录保持未修改，工作树为干净状态。