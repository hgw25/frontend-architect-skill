已将完整替换内容写入 [docs/dialog-verification.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-readiness-claims-match-exercised-evidence-candidate-105ehlqw/docs/dialog-verification.md)。

核心判断调整为：**当前未达到发布就绪**。

记录现已明确区分：

- 已证明：类型检查、构建、包导入、两个服务端渲染用例、部分浏览器交互。
- 已发现问题：outside-pointer 关闭后触发器未恢复焦点，属于发布阻断项。
- 仍待验证：受控/非受控行为、嵌套焦点恢复、`hydrateRoot` 水合、effect 后 Portal 挂载的首轮行为。
- 后续入口：保留 `npm run test:browser`，并列出需要实际选中的验收场景。
- 证据限制：现有摘要未绑定提交、环境版本或完整原始日志。

本轮仅维护该文档，未修改组件或搭建、运行浏览器环境。