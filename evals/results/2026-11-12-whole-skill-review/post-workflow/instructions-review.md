# Frontend Architect 冻结指导独立只读复审

审查日期：2026-11-12。

冻结输入根目录：`/Users/heguangwei/project/skills/frontend-architect-skill/evals/results/2026-11-12-workflow-boundaries/final-guidance/`。下文文件名与行号均以此目录为准。

完整阅读 `SKILL.snapshot.md`、`CONTRIBUTING.snapshot.md` 和全部 18 个 `references/*.md`，共 4,411 行。将快照名称映射回 manifest 的原文件名后，20 项 SHA-256 全部匹配。没有读取相邻评测、评分、历史报告或其他代理输出，没有修改技能文件或派生子代理。

## 确定问题

**未发现证据充分、需要修改当前指导的实质正确性、工作流、授权边界、维护或可执行性问题。**

这里的结论限于冻结指导的内容与内部契约审查，不等于已经通过实际代理任务验收。没有用文档长度、模式数量、缺少阶段叙述或个人架构偏好制造问题。

## 合理取舍与审查依据

| 范围与精确位置 | 判断及具体适用后果 |
| --- | --- |
| `SKILL.snapshot.md:35-69,157-178,206-214`；`references/architecture-and-code.md:151-174,279-301,328-336` | 全流程义务与准备深度有清楚区分。局部规则可以在既有机制内直接完成，不强迫独立文档；非平凡所有权、并发、跨消费者契约或迁移要求先保存设计。调查、复现和基线检查允许先行，也不增加文档审批。这是可执行的准备边界，没有发现“所有改动先写大设计”或“轻量意味着不验证”的冲突。 |
| `SKILL.snapshot.md:19-31,64-69,291-304`；`references/verification-and-review.md:179-228,367-389` | 设计、实现、只读审查和发布授权分别明确。审查涵盖需求与工程质量，同时允许无问题并报告抽样限制；本地验证或发布计划不构成发布授权。没有把用户请求的结果误当成已达成状态。 |
| `references/architecture-and-code.md:47-71,73-109,338-401,403-505,507-665` | 从业务行为、真实调用者与已知契约选择实现，并明确区分标识、草稿、确认值、显示投影和运行时验证。示例注明本地资格判断不产生服务端原子性或授权。没有发现示例把类型、字段名或新测试当成领域语义来源。 |
| `references/module-boundaries.md:30-66,122-174,176-217,219-333,378-406` | 混合组织、内部职责和依赖方向均受项目及框架约束；示例树不是模板配额。独立状态、资源和错误所有权可以拆分，真正原子的转换仍须聚合。公共入口、局部直接导入和条件性工具约束相互兼容，不要求为每个文件增加目录与接口。 |
| `references/design-principles.md:16-64,66-126`；`references/collaboration-patterns.md:20-130`；`references/implementation-patterns.md:29-55,57-146` | SOLID、DRY/YAGNI、信息隐藏及协作模式用于解决实际属性；没有从名词直接推导全局架构。文档区分正式标准、作者方法、框架机制及项目适配，并给出停止条件。普通工厂、GoF Factory Method、管线与职责链、事件日志与 Event Sourcing 等没有被混为一谈。 |
| `references/programming-paradigms.md:8-64,66-148,150-208`；`references/dependency-composition.md:18-34,36-84,86-165` | 表示法、依赖方向、控制权、组装与生命周期分别判断。函数、类、闭包、reducer 都可接收依赖；框架注入不被机械判成 Service Locator，手工 DI 与容器也均有适用边界。多编辑器或 SSR 请求的状态隔离和资源释放有具体检查，没有仅靠容器名称宣称隔离。 |
| `references/domain-and-data-flow.md:15-64,66-109`；`references/async-and-lifecycles.md:8-45,47-119,121-173` | 领域一致性与本地状态更新、读写模型与事件历史、请求执行与结果发布、写入确认与后续刷新失败被明确区分。队列不保证其他客户端的顺序，版本号不自动具备可排序含义，超时不证明写入失败。现有数据层优先，避免为正确性原则再造请求引擎。 |
| `references/runtime-and-delivery.md:11-74,76-145`；`references/frontend-infrastructure.md:11-62,64-157` | 运行环境、缓存作用域、公共产物、消费者类型、版本兼容及恢复流程相互衔接。共享基础能力承担公共契约与真实宿主验证，不只验证源码能打包。迁移明确避免重复破坏性写入，回滚也不被误认为能够撤回外部已提交效果。 |
| `references/security-and-trust.md:7-76,78-116`；`references/frontend-infrastructure.md:109-126` | 防护围绕真实来源、输出上下文、授权和秘密边界展开，已验证内部契约无需重复解析。服务端授权要求同时明确“不扩大为未授权后端工作”。插件产物、日志和 source map 也纳入秘密保护，没有依赖客户端守卫或 CSP 替代授权、输出安全。 |
| `references/interface-and-motion.md:23-96,98-138,140-225,227-263`；`references/implementation-patterns.md:245-285` | 语义、布局、国际化、焦点和编辑连续性具有可观察的验收条件。动效机制按需要选择；FLIP 只是需要几何映射时的选项，有中断、清理和 reduced-motion 要求。没有把 DOM 身份或一次回调成功当成持续可操作性的证据。 |
| `references/rendering-and-performance.md:24-85,98-150,155-199`；`references/rendering-web.md:7-35`；`references/rendering-app.md:8-45`；`references/rendering-mini-program.md:8-37` | 共性模型明确不是所有平台的固定管线；浏览器、原生、跨端、小程序分别按实际版本与工具验证。没有把历史 bridge、16ms、GPU layer 或某厂商限制泛化。基线缺失允许从原始快照恢复；确实无法取得时限制结论，不伪造对照。 |
| `references/verification-and-review.md:23-86,88-158,160-177,232-365`；`SKILL.snapshot.md:262-300` | 验证关注真实消费者、关键组合失败、最终修正代码和证据身份；行为测试不替代代码质量检查，语法通过不替代视觉与运行时验证。检查有比例边界，可报告阻断而不谎称完成。没有要求为普通检查建立额外框架或独立档案。 |
| `CONTRIBUTING.snapshot.md:23-64,66-84,100-110`；`SKILL.snapshot.md:306-312` | 维护位置先分辨源码、确定性检查、检查接线、领域记录与判断指导；现有保障未运行时优先接通。规则变更要求行为证据和来源，不按文本缩短证明改进。发布与更新流程有来源，但其具体工具是否运行成功不在本轮文本审查结论内。 |

以上条款在真实任务里仍会要求判断深度，但没有发现无法依现有条件做出的关键选择。诸如保存设计、在提交成功后仍可展示确认、收集原始基线和在最终消费者检查连续交互，都会增加必要工作；现有适用条件已把它们限定在对应契约与风险内，因此不将其本身计为缺陷。

## 原作者／官方资料核对

为避免把技术语义的记忆偏差列成问题，核对了下列有具体事实内容的条款。每项只核对所列语义，没有据此宣称全部外链、全部版本或全部方法都已外部验收。

- `references/dependency-composition.md:104-108` 对 Inversify request scope 的限定与当前 [Binding 官方文档](https://inversify.io/docs/fundamentals/binding/) 相符：该 scope 属于一次 `container.get` 解析请求，不能仅凭名称推断为 HTTP 请求。
- `references/implementation-patterns.md:228-234` 对 TanStack Query mutation pending 生命周期的说明与 [Invalidations from Mutations 官方文档](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations) 相符：返回的异步 `onSuccess` 会影响 mutation 的完成时机。现有条款要求确认边界与后续读取分开，并未把库的状态字段直接当成写入是否提交的全部语义。
- `references/implementation-patterns.md:70-79` 与 `references/architecture-and-code.md:210-216` 对层语义、可选层和 App／Shared 例外的描述与 [FSD Layers 官方文档](https://feature-sliced.design/docs/reference/layers) 相符；借用 colocation 不等于完整采用 FSD。
- `references/interface-and-motion.md:189-225` 的 First／Last／Invert／Play 顺序与 [Paul Lewis 原文](https://aerotwist.com/blog/flip-your-animations/) 相符。当前指导没有把原文历史帧率与感知时间建议作为跨设备硬门槛。

## 未验证范围

1. 本轮没有运行前向评测、评分、真实代理任务或多轮维护任务，不能据此断言这些条款在所有模型和任务中都会稳定执行，或已产生整体质量提升。
2. 只读输入不含维护脚本、发布工作流、更新伴随技能或实际安装产物。本轮没有验证 validator、官方 Skill 校验、生成与恢复、版本/tag 检查、分发安装是否可运行；不能从文档中的流程描述推断其实现已正确接线。
3. 没有编译或执行 Markdown 中的 TypeScript 示例，也未运行浏览器、设备、构建、发布或性能样本。示例仅接受了静态语义审查。
4. 没有逐项访问全部外链或逐版本审计全部第三方 API。其余未产生确定疑点的引用没有被当成“全部外部核实通过”。
5. 没有把冻结快照重命名后仍引用 `SKILL.md`／`CONTRIBUTING.md` 的相对路径计为源技能缺陷；这是快照文件名与原分发文件名的区别。本轮校验的是 manifest 的内容身份，没有运行原仓库的链接检查器。

本轮没有提出修订建议。后续若出现可复现的执行失败，应按 `CONTRIBUTING.snapshot.md:38-64` 的既有维护归属定位，再判断是否确实需要修改指导。
