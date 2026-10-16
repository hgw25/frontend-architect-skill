建议把发送边界固定为“一次不可变提交快照”，不要新增请求状态、第二套队列或发送 Service。活动切换不取消旧提交；账号隔离由 `enqueue` 统一保证；草稿清理由 revision 做条件更新。

```ts
async function send() {
  // 必须在第一个 await 前一次性捕获。
  const submission = {
    activityId: store.activeId,
    accountId: store.accountId,
    text: editor.text,
    mode: store.mode,
    files: [...editor.files],
    draftRevision: editor.revision,
  };

  // 继续使用 upload 已有的账号失效机制。
  const attachments = await upload(submission.files);

  await enqueue({
    activityId: submission.activityId,
    accountId: submission.accountId,
    text: submission.text,
    mode: submission.mode,
    attachments,
  });

  editor.clearIfRevision(
    {
      activityId: submission.activityId,
      accountId: submission.accountId,
    },
    submission.draftRevision,
  );
}
```

`clearIfRevision` 是这里唯一值得增加的小型抽象。它应在草稿所有者内部完成一次条件清理：

- 用 `accountId + activityId` 定位原草稿，而不是清理当前编辑器。
- 只有 revision 仍等于提交时 revision 才清空。
- 清空仍按现有规则推进 revision。
- revision 必须覆盖 `clear()` 会修改的字段，例如正文和附件；如果 `clear()` 还会重置 mode，mode 变化也必须推进 revision。

不建议把草稿清理放进 `enqueue`：队列不拥有编辑器，而且其他发送入口未必存在草稿。也不需要 latest-wins、AbortController、额外幂等键或客户端发送队列；它们分别会破坏“旧命令继续发送”或重复已有能力。

账号边界应在 `enqueue` 的持久化/派发边界统一确认，因为所有发送入口都经过它：

- 队列记录始终保留提交时的 `accountId` 和 `activityId`。
- 派发时不得从当前 `store` 补写或替换这两个字段。
- 只能使用记录所属账号的认证上下文；原账号已失效时可以暂停或失败，但绝不能改投当前新账号。
- `enqueue` 成功应表示命令已按其现有契约被可靠接收。此后无需再注册一个服务端完成回调来清草稿。

验证安排：

| 受控时序 | 必须验证 |
|---|---|
| 上传期间切活动 | `enqueue` 收到原 activityId、原文本和原附件；新活动草稿不变 |
| 上传期间继续编辑原草稿 | 发送提交时快照；revision 不匹配，完成后不清新内容 |
| 上传期间切账号 | 触发现有上传失效路径；不得以新账号调用发送；新账号草稿不变 |
| 入队后再切账号 | 持久化记录仍属于旧账号；派发器不得使用新账号认证 |
| 入队完成前切活动或账号 | `clearIfRevision` 只作用于原草稿，不清当前草稿 |
| 上传或入队失败 | 草稿保持，错误沿用现有错误处理 |
| 草稿始终未变化 | 入队成功后恰好清理原草稿一次 |

竞态测试应使用可手动 resolve/reject 的 Promise，不使用定时等待。发送编排测试覆盖快照和条件清理；账号不可串投应另在 `enqueue`/派发边界做契约测试，这样其他发送入口也同时得到保障。

当前工作区除 `.frontend-architect` 外没有应用源码或测试文件，因此未生成补丁，也没有虚构项目测试结果。