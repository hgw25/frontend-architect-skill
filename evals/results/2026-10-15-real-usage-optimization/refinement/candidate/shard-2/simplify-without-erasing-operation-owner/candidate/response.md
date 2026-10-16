建议收敛为“提交时快照 + 成功后按归属和 revision 条件清理”。不需要再建 `SendManager`、状态机、请求序号或第二套队列。

```js
async function send() {
  const submission = {
    accountId: store.accountId,
    activityId: store.activeId,
    mode: store.mode,
    text: editor.text,
    files: [...editor.files],
    draftRevision: editor.revision,
  };

  const attachments = await upload(submission.files);

  await enqueue({
    accountId: submission.accountId,
    activityId: submission.activityId,
    mode: submission.mode,
    text: submission.text,
    attachments,
  });

  if (
    store.accountId === submission.accountId &&
    store.activeId === submission.activityId &&
    editor.revision === submission.draftRevision
  ) {
    editor.clear();
  }
}
```

关键判断：

- 所有发送数据必须在第一个 `await` 前快照。活动、账号、模式、文本和文件数组都不能完成上传后再从当前界面读取。
- 活动切换不应取消发送；`enqueue` 始终收到原 `activityId`。
- 账号切换继续复用 `upload` 已有的账号失效机制，不额外建设取消体系。即使上传已经完成，传给 `enqueue` 的仍是原 `accountId`，不能替换成当前账号。
- 不在 `catch` 或 `finally` 清草稿。只有上传和入队都成功，且当前仍是同一账号、活动、revision 时才能清空。
- `editor.clear()` 必须推进 revision；否则并发发送的旧回调仍可能误判。
- 不把这些规则塞进 `enqueue`：它继续只负责持久化和幂等，所有发送入口都能共享该保障。

如果项目的草稿按账号和活动持久化，建议只增加一个真正有所有权价值的小接口：

```js
editor.clearIfRevision(
  {
    accountId: submission.accountId,
    activityId: submission.activityId,
  },
  submission.draftRevision,
);
```

它应原子地定位原草稿并比较 revision。这样切到别的活动后仍可清理已成功发送的原草稿，同时绝不会清理当前新草稿；比在每个发送入口重复条件判断更易接手。若 `editor` 仅表示当前草稿，则保留前面的内联判断即可，不必为单个调用抽象。

验证安排使用可控 Promise，不用延时：

1. 上传未完成时从活动 A 切到 B：入队内容仍指向 A，B 草稿不变。
2. 上传期间继续编辑同一草稿：入队使用提交时文本和文件，新 revision 草稿不被清空。
3. 上传期间切账号：现有失效检查拒绝旧上传，`enqueue` 不调用，新账号草稿不变。
4. 已调用 `enqueue` 后切活动或账号：命令仍以原账号、原活动完成；回调不清当前草稿。
5. 未切换且未编辑：成功后恰好清空一次，并推进 revision。
6. 上传失败或 `enqueue` 失败：保留草稿；上传失败时不调用 `enqueue`。
7. 做一次 `A → B → A` 且修改后恢复相同文本的测试，确认依赖 revision 而非文本相等判断。

当前工作区没有业务源码或测试工程，只有题面片段和指定 Skill，因此没有可安全落盘或实际执行的项目测试；以上是基于现有契约的具体替换方案与验证清单。