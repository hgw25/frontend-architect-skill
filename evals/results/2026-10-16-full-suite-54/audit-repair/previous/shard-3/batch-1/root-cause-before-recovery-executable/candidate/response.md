已完成局部修复。

根因是 `receive()` 虽然把增量事件与已保存消息合并为 `stored`，但更新请求 ledger 时仍读取原始 `snapshot`。终态事件未重复携带 `replyTo` 时，完成事实无法关联原请求，导致一直显示等待。

修复位于 [src/ledger.mjs:20](</private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-root-cause-before-recovery-executable-candidate-4gl5og9b/src/ledger.mjs:20>)：请求进度统一使用合并后的 `stored` 消息事实。

实际验证：

- 修复前：7 项测试中 4 项失败，稳定复现保存关联后 `done/error` 无法释放请求。
- 修复后：`node --test test/*.test.mjs`，7/7 通过。
- 其他请求、其他作用域、未知关联、重复终态均未受影响。
- 显式历史恢复仍通过，已有恢复能力保留。
- `git diff --check` 通过；仅修改 `src/ledger.mjs`，未改测试 harness 或 `.frontend-architect`。
- 未增加每 30 秒全量轮询；本地 Skill 的主路径/恢复路径分离原则帮助确认轮询只会掩盖本次确定性关联错误。

仍无法从该 fixture 确定：历史生产事件中是否还存在真实丢包、漏投或其他原因，因为工作区没有生产日志、传输层或持久化数据。因此不能断言所有历史等待都由此问题引起，但已捕获的 `accept → stream → completed` 路径机制已被直接复现并修复。