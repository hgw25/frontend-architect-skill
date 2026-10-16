结论：把发送收敛为“一次提交快照 + 两个既有异步边界 + 条件清理”。不需要请求管理器、latest-wins、取消控制器或另一套队列。

建议实现如下，名称按项目现有草稿 owner API 对齐：

```ts
async function send() {
  const submission = {
    activityId: store.activeId,
    accountId: store.accountId,
    mode: store.mode,
    text: editor.text,
    files: [...editor.files],
    draftRevision: editor.revision,
  };

  const attachments = await upload(
    submission.files,
    submission.accountId, // 接入 upload 既有账号失效检查
  );

  await enqueue({
    activityId: submission.activityId,
    accountId: submission.accountId,
    mode: submission.mode,
    text: submission.text,
    attachments,
  });

  drafts.clearIfRevision(
    {
      activityId: submission.activityId,
      accountId: submission.accountId,
    },
    submission.draftRevision,
  );
}
```

这里的 `drafts` 代表项目已有的草稿所有者，不建议为此新建 service。若当前 owner 没有对应能力，只补一个语义明确的原子操作：

```ts
clearIfRevision(owner, expectedRevision): boolean
```

它应定位并清理提交时的原草稿，而不是清理“当前编辑器”：

- 活动 A 发送后切到 B：命令仍进入 A；A 草稿未变化时可以被清理，B 不受影响。
- 上传期间继续编辑 A：revision 已变化，发送旧快照，但不清理新内容。
- 切到其他账号：命令始终携带原 `accountId`；原账号仍有效则进入原账号，已失效则由既有上传检查拒绝，绝不能改写成当前账号。
- `upload` 或 `enqueue` 失败：异常按项目惯例继续上抛，草稿不清理。

需要保留的抽象只有 `enqueue` 和 `clearIfRevision`：前者已经统一持久化与幂等，后者真正拥有“只能清理同一草稿版本”的规则。不要把草稿清理塞进 `enqueue`，因为其他发送入口并不拥有编辑器生命周期；也不要在 `await` 后重新读取 `store` 或比较文本，文本经历 A→B→A 时无法证明没有新编辑。

验证使用可控 Promise，不用定时等待：

1. 延迟 `upload`，期间从活动 A 切到 B；断言 `enqueue` 收到 A、原账号和原内容，B 草稿保持不变。
2. 延迟上传并修改原草稿，使 revision 递增；断言旧内容被发送，新草稿未清理。
3. 在 `enqueue` pending 时切活动、切账号或编辑；完成后仍只能条件清理原 owner。
4. 切账号后让上传成功；断言队列记录仍属于旧账号。再让既有账号失效检查拒绝；断言没有调用 `enqueue`。
5. 分别令 `upload`、`enqueue` 失败；断言异常未被吞掉、任何草稿均未清理。
6. 不发生并发变化时，断言入队成功后原 revision 恰好清理一次。
7. 做一次 A→B→A 且最终文本相同的测试，确认依据 revision 而非文本相等判断。
8. 对 `enqueue` 补契约检查：所有入口必须显式提供 `activityId` 和 `accountId`，内部不得用当前 store 补写或覆盖它们。

当前工作区没有实现源码或测试配置，只有只读指导目录，因此未创建代码或声称运行测试；`.frontend-architect` 保持未改动。