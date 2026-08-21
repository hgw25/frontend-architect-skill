# Contributing

感谢改进 Frontend Architect。这个项目的目标是提高 AI 的前端工程决策质量，而不是
收集尽可能多的编码规则。

## 什么内容值得加入

一条新规则至少应满足以下条件之一：

- 能改变一个常见且重要的架构或实现决策；
- 能防止有现实影响的正确性、可维护性、无障碍或性能问题；
- 能说明某种著名方法的适用条件和停止条件；
- 能让代理更准确地适配不同框架、规模或产品环境。

不要加入：

- 仅表达个人审美的语法偏好；
- 已由格式化器或项目规范稳定解决的规则；
- 没有适用边界的“永远”或“绝不”；
- 只针对一个案例、但被写成全局要求的修补；
- 大段复制的教程或第三方文档。

## 修改流程

1. 明确要改善的真实请求或失败行为。
2. 判断内容属于核心入口还是按需加载的专题参考。
3. 用决策条件、适用边界和反例表达规则。
4. 优先链接原始作者、标准或官方文档。
5. 在 `evals/cases.yaml` 增加或更新可复现的真实场景。
6. 运行 `python3 scripts/validate_skill.py`。
7. 根据 `evals/cases.md` 的协议和 `evals/rubric.md` 做独立前向评测。

## 内容组织

- `SKILL.md`：触发范围、核心原则、工作流和专题路由。
- `references/`：只有相关任务才需要加载的详细决策指导。
- `evals/cases.yaml`：行为用例的单一数据源，包含完整输入与适用评分维度。
- `evals/cases.md`：baseline/candidate 前向评测流程。
- `evals/rubric.md`：支持不适用维度归一化的评分标准。
- `scripts/`：重复且确定性的本地检查，不放业务知识。

保持信息单一来源。如果一项规则已在参考文件完整表达，`SKILL.md` 只保留必要的
决策门槛或路由。

## 提交建议

提交信息建议使用 Conventional Commits，例如：

```text
feat(modules): add dependency-boundary guidance
fix(motion): clarify interrupted FLIP transitions
test(evals): cover premature feature slicing
docs(readme): explain global installation
```

提交说明应包含：改变了什么决策、为什么现有规则不足、如何验证行为，以及是否扩大
了 Skill 的自动触发范围。

## 发布检查

发布 tag 前应确认：

1. 仓库校验和官方 Skill 校验均通过；
2. 受影响用例没有可复现的实质退化；单次下降已经复查，边界或高方差结果已按相同
   配置重复运行，并且目标规则改善了对应行为或消除了复现失败；
3. 评测记录包含模型版本、日期、原始输出、分数和失败项；
4. README 安装命令指向不可变 tag；
5. 公开仓库已经选择并加入明确许可证。
