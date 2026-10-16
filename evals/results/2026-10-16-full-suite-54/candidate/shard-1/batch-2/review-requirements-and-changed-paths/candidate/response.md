## 问题

1. **高：回前台时未刷新 `creatorDirectory`**  
   `src/lifecycle.ts:7` 的 `Promise.all` 仅调用 `feed.refresh()`，违反 `docs/community.md §4.2`。作者目录会保留旧数据。应同时调用 `creatorDirectory.refresh()`；本地 `draft` 保持不参与刷新。

2. **中：无 `activityId` 时“获取”按钮并未禁用**  
   `src/PostRow.tsx:8` 始终渲染可用按钮，只在点击回调中不执行操作。这不满足 `§4.1` 的“禁用‘获取’”，且按钮仍可聚焦、点击。应使用原生 `disabled` 状态表达该行为。

3. **低：现有自动化测试无法防止上述回归**  
   `test/architecture.test.ts` 只验证两个导出是函数，没有断言刷新资源、draft 排除规则、无 ID 按钮状态或获取回调。流程状态登记和正常数据截图不能替代这些行为断言。

## 验证范围

- 静态审查了提供的四份完整快照，并逐项对照 `docs/community.md §4.1–§4.3`。
- 确认作者名称为纯文本，旧作者详情入口未保留；标题的有 ID/无 ID 分支符合描述。
- 正常截图只覆盖 `activityId="a1"`，未覆盖无 ID 分支。
- 工作区没有 `docs/`、`src/`、`test/` 实体或 Git 跟踪文件，且没有可运行应用/浏览器环境；因此未独立复跑测试，也未验证真实 DOM 禁用状态、键盘行为、回前台调用次数及异步结果。
- 未修改任何文件。