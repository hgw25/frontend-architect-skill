已完成局部修复，未加入每 30 秒全量轮询。

- 根因：`receive()` 已将增量事件与持久化消息合并为 `stored`，但更新请求账本时仍读取原始 `snapshot.replyTo`。终态事件不带 `replyTo` 时，既无法释放原请求，还会用 `undefined` 覆盖已有关联。
- 修复：[src/ledger.mjs:22](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-root-cause-before-recovery-executable-candidate-l2jy4bf_/src/ledger.mjs:22) 现在使用合并后的消息身份更新账本。
- 保持不变：无关联完成事件不会猜测请求；其他请求和 scope 继续等待；重复终态保持幂等；显式历史恢复能力仍保留。
- 验证：修复前 7 项测试中 4 项失败；修复后 `node --test test/*.test.mjs` 全部 7 项通过，`git diff --check` 通过。评估测试文件未修改。

仍无法从此仓库确定生产环境是否还存在真实事件丢失、跨进程持久化或传输问题，因为 fixture 不包含后端、数据库和 transport。现有恢复入口适合处理真正漏信号；但“手动恢复有效”本身不能证明需要新增周期性全量轮询。