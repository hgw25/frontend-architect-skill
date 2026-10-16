建议保留一条直线执行链：提交时一次性快照，上传后始终使用快照入队，最后按“草稿身份 + revision”条件清理。不要再引入发送管理器、请求状态机、取消控制器或新的幂等层。

```ts
async function send() {
  // 必须全部发生在第一个 await 之前
  const submitted = {
    accountId: store.accountId,
    activityId: store.activeId,
    mode: store.mode,
    revision: editor.revision,
    text: editor.text,
    files: [...editor.files],
  }

  // 这里的第二参数表示接入 upload 已有的账号失效检查；
  // 应替换成项目现有接口，不新增另一套检查机制。
  const attachments = await upload(submitted.files, {
    accountId: submitted.accountId,
  })

  await enqueue({
    accountId: submitted.accountId,
    activityId: submitted.activityId,
    text: submitted.text,
    mode: submitted.mode,
    attachments,
  })

  drafts.clearIfRevision(
    {
      accountId: submitted.accountId,
      activityId: submitted.activityId,
    },
    submitted.revision,
  )
}
```

`clearIfRevision` 应由现有草稿所有者提供，语义是：

- 精确定位原账号、原活动的草稿；
- 仅当其 revision 仍等于提交时的 revision 才清空；
- 比较与清空同步完成，清空本身也推进 revision；
- 草稿不存在或已经变化时直接不处理。

如果当前草稿系统只能操作活动草稿，可以暂时在 `send` 末尾直接判断 `accountId + activityId + revision` 后调用 `editor.clear()`；但这会让用户切走后原活动的已发送草稿继续保留。支持按草稿键执行条件清理，是唯一值得增加的小边界。

关键取舍：

- `activityId`、`accountId`、文本、模式和文件列表都不能在 `await` 后重新读取。
- 账号切换不能把命令重新绑定到当前账号。原账号仍有效时继续发往原账号/原活动；若现有上传失效检查判定原账号已失效，则上传失败，不调用 `enqueue`，也不清草稿。
- `enqueue` 已负责持久化和幂等，不重复建设队列、操作 ID 或重试层。
- 不采用 latest-wins 或因切活动而取消：发送是必须保留的命令，不是只关心最新结果的查询。
- `files` 至少复制数组，避免后续增删附件改变本次提交；无需盲目深拷贝文件对象。
- 上传或入队失败均保留草稿，并沿用项目现有错误呈现。

验证安排应使用可控 Promise，不使用延时等待：

1. 正常发送：确认上传和 `enqueue` 收到提交瞬间的数据，成功后原草稿被清空。
2. 上传期间切活动：解析上传后仍入队到原活动，新活动草稿不变。
3. 上传期间继续编辑：入队旧快照；revision 已变化，新内容不被清空。
4. 文本经历 A→B→A：即使文本重新相等，也因 revision 不同而不清空。
5. 上传期间切账号：
   - 原账号仍有效时，最多入队到原账号，绝不能使用新账号；
   - 原账号失效时，上传拒绝，`enqueue` 不调用，两个账号的草稿都不清。
6. `enqueue` 拒绝：草稿保留，不执行条件清理。
7. 两次发送逆序完成：每次只影响自身账号、活动和 revision 对应的草稿。

工作区中没有应用源码、测试配置或包清单，只有任务指定的 Skill 文件，因此本次没有可安全落地的代码文件或可执行测试；以上接口名中只有题目给出的 `upload`、`enqueue`、`editor`、`store` 属于已知事实。