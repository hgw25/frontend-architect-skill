建议保留一个很薄的 `send` 编排函数，不再引入通用 Operation、Owner、Candidate、状态机或额外请求队列。真正需要的只有：提交快照、队列账号隔离、按草稿身份和 revision 条件清理。

```ts
async function send() {
  const submitted = {
    accountId: store.accountId,
    activityId: store.activeId,
    revision: editor.revision,
    text: editor.text,
    mode: store.mode,
    files: [...editor.files],
  };

  const attachments = await upload(submitted.files, {
    accountId: submitted.accountId,
  });

  await enqueue({
    accountId: submitted.accountId,
    activityId: submitted.activityId,
    text: submitted.text,
    mode: submitted.mode,
    attachments,
  });

  drafts.clearIfUnchanged({
    accountId: submitted.accountId,
    activityId: submitted.activityId,
    revision: submitted.revision,
  });
}
```

其中 `upload` 第二个参数应替换为项目现有账号失效检查的实际接口；关键是传入提交时捕获的账号上下文，不能在上传完成后重新读取当前账号。

`clearIfUnchanged` 是唯一值得保留的小型抽象，其契约应当是：

- 通过项目现有草稿键定位原草稿；没有独立草稿 ID 时使用 `accountId + activityId`。
- 仅当当前 revision 仍等于提交时的 revision 才清空。
- 比较与清空由草稿所有者在一个同步操作中完成。
- 清空后按现有规则推进 revision。
- 不通过“当前编辑器”间接定位草稿。

这样切到其他活动后，可以清理已成功发送且未继续编辑的原草稿，同时绝不会清空新活动的草稿。只比较 revision 不够，因为不同活动的 revision 可能相同。

还应确认 `enqueue` 的中心契约：持久化记录中的 `accountId` 和 `activityId` 不可被执行时的当前账号或当前活动覆盖。队列消费者如果发现当前凭证不属于记录账号，应按现有策略延后或拒绝，绝不能改投新账号。由于其他发送入口也经过 `enqueue`，这条规则应集中在那里，不在各入口重复实现。客户端 `accountId` 只用于身份绑定和路由，不能代替服务端授权。

不建议：

- 因切活动取消上传；这会违反“已提交命令继续发往原活动”。
- 使用 latest-wins；发送命令不是搜索结果。
- 增加本地队列或重试层；`enqueue` 已负责持久化和幂等。
- 在 `finally` 中清草稿；上传或入队失败时必须保留草稿。
- 为这一条执行链拆出多层转发 helper。

验证安排：

1. 延迟上传，提交活动 A 后切到同账号活动 B；上传完成后断言入队仍为 A，B 草稿不变。
2. 延迟上传，提交后继续编辑 A；完成后断言发送的是提交快照，新 revision 的草稿保留。
3. 延迟上传，然后切账号；触发现有失效检查，断言旧操作不以新账号入队。
4. 命令已经入队后切账号；断言队列记录和实际投递仍绑定原账号、原活动，绝不重写为当前账号。
5. 上传失败或 `enqueue` 失败；断言不清草稿，错误沿用现有处理路径。
6. 普通成功且草稿未变化；断言只入队一次，并清除对应原草稿。
7. 对其他发送入口补一项 `enqueue` 契约回归，确保它们共同获得账号隔离，而不是分别实现检查。

异步测试使用可控 Promise 精确制造顺序，不使用定时等待。当前工作区没有项目源码或测试配置，只有评估 Skill，因此未修改文件、未运行项目测试；工作区保持干净。