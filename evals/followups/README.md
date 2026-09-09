# 连续需求的代码演进检查

这些请求和测试只在第一轮实现冻结后提供给同一个生成会话，不能复制进第一轮 fixture。
它们用于观察后续修改是否仍遵守原有契约，以及第一轮边界能否容纳实际变化。

| 第一轮 fixture | 第二轮请求 | 第二轮验收文件 |
| --- | --- | --- |
| field-eligibility | [readOnly 字段](field-eligibility/request.md) | `field-eligibility/stage-two.test.js` |
| search-request-lifecycle | [reset 生命周期](search-request-lifecycle/request.md) | `search-request-lifecycle/stage-two.test.js` |

操作顺序：

1. 使用 cases.yaml 对应的 executable 用例完成第一轮，保存原始回答、源码 diff、运行日志
   与 Skill 版本；确认原始受保护文件未变化。
2. 将本目录对应的 stage-two.test.js 复制到该隔离工作区的 test/stage-two.test.js，
   由评测者管理并保持只读；把对应 request.md 内容作为第二轮请求。
3. 保留第一轮实现与上下文，只允许生成代理修改源码；运行 npm run check，同时执行
   原始和新增验收。不要将参考修复放进工作区。
4. 保存第二轮源码、相对第一轮的 diff、完整结果和受保护文件对比。交给看不到版本标签、
   预期评分和其他条件结果的独立审查者检查代码质量。无需改变实现即可满足新需求也是
   有效结果，不以新增代码量奖励工作。

当前 run_behavior_evals.py 自动执行第一轮；第二轮由评测者按上述步骤协调并独立记录，
不冒充脚本已支持自动多轮。无依赖逻辑测试不能证明实际框架渲染、浏览器或设备行为。
