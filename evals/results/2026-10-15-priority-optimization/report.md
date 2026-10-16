# 领域知识沉淀、维护归属与入口精简

日期：2026-10-15。本轮只修改开发目录中的指导、维护说明和行为案例，不更新已安装
技能，不发布版本。原工作区已有评审与评测链路修改；本轮旧版条件取修改前的实际
工作区快照，包含这些改动，不以 Git HEAD 或已发布版本替代。

## 修改与理由

- 主入口合并重复的边界、异步策略、维护流程和交付指导，专题路由改为按决策查表。
  保留行为→事实→模型→边界→实现→证据、适度前瞻、真实信任边界、按风险验证和自主执行。
  入口从 327 行、2,902 个空白分隔词变为 272 行、2,546 个词；词数减少约 12.3%，
  不是 token 测量，也不是质量分数。
- 在现有 architecture-and-code reference 中补领域知识维护：复用已有定义和决策，
  区分定义、决策和实施计划，按确认修订更新原记录；未知身份映射仍保持未知。
  不强制词汇表、ADR 目录或初始化会话，只读评审也不因新规则擅自编辑文档。
- CONTRIBUTING 增加维护归属：产品缺陷修源码；机械约束复用确定性检查；检查未执行
  修命令或 CI 接线；信息发现问题补原文档与指针；判断问题才改 Skill 和行为案例。
  删除指导按行为对照验证，不用文本长度代替结果，也不把单次失败变成普遍禁令。
- README 同步使用和维护说明；cases.yaml 新增领域记录、无文档局部修改、已有检查接线
  三个案例，共 45 个案例。没有新增独立技能、reference、评测框架或运行时依赖。

借鉴来源为 Matt Pocock 技能集固定提交 `49dd158d1076134a641b33efb035946536778336` 的
[domain-modeling](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/engineering/domain-modeling/SKILL.md)、
[retro](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/engineering/retro/SKILL.md) 和
[writing-for-agents](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/productivity/writing-for-agents/SKILL.md)。
这里只吸收知识归属、环境检查和条件性披露机制，沿用本项目的契约、格式与自主性。

## 独立前向检查

每个生成会话均为无历史桌面子代理，只提供匿名工作区、本地 Skill、原始请求和材料；
不给评分项、预期答案、其他条件结果或主代理结论。指导的精确内容保存在
`guidance/previous/` 与 `guidance/candidate/`，入口用 `SKILL.snapshot.md` 避免被发现为技能。
请求、回答及产物分别保存在下面的条件目录。

| 条件与原始产物 | 实际结果 | 指导读取 |
| --- | --- | --- |
| [领域旧版](domain-previous/response.md) | 区分资料、组织和用户；给出 supplierId 导航；在三个原文档位置保留修订和旧理由 | 入口及 architecture-and-code |
| [领域候选](domain-candidate/response.md) | 同样完成上述要求，没有猜测用户映射、另建词汇表或等待审批 | 入口及 architecture-and-code |
| [表单候选](field-candidate/response.md) | 实际修改 processForm；父代理复跑 7 项验收全过，保护文件逐字相同 | 仅入口 |
| [局部文案候选](local-edit-candidate/response.md) | 给出完整组件，只有文案变化；未建文档、测试环境或确认步骤 | 仅入口 |
| [维护候选](maintenance-candidate/response.md) | 提供可应用补丁，将 check-package 接入既有 check；保留失败传播，不增加每轮 types 禁令 | 入口、CONTRIBUTING、infrastructure、verification |

领域案例提供的是 inline 原始文档材料，代理在对应位置写入可采用的内容，不是实际
生产仓库的文件迁移。父代理查看原始回答和文档，确认新旧记录关系、身份与导航一致。
维护案例检查的是补丁、执行链与验证方案，未执行真实 TypeScript 构建、包验收或 CI。
文案案例只有源码复核，没有浏览器证据。以上均不冒充真实应用验证。

表单原始夹具由父代理独立复跑为 2/7 通过；候选为 7/7 通过。日志分别见
[原始失败](field-initial.log) 与 [候选验收](field-candidate.log)，只读文件摘要见
[protected-files.json](protected-files.json)。这证明精简后的入口在该局部实现中仍能
保护有效字段、异步错误及特殊键等公共契约，不能代表全部工程场景。

另一个新的无历史审查者比较修改前快照与当前指导，未阅读评分项或生成代理输出。
[独立文本契约审查](guidance-review.md) 未发现阻塞问题、重要工程判断丢失或新增普遍
审批门槛。该审查是静态文本证据，不是运行行为保证。

## 确定性检查与复现

[verification.log](verification.log) 保存实际命令和输出：

- 仓库校验通过，45 个行为案例结构有效。
- 官方 Skill quick_validate 通过。
- 完整确定性脚本测试 64 项通过。
- git diff --check 通过。

使用临时 Python 虚拟环境及 requirements-dev.txt，没有修改全局依赖。表单验收使用
Node v22.22.2。[source.diff](source.diff) 只比较本轮五个修改文件的工作区前后版本，
与原有未提交改动分开；[run-metadata.json](run-metadata.json) 记录源码摘要、检查结果、
生成条件和限制。新增案例可由现有 run_behavior_evals.py 与 score_behavior_evals.py
按仓库协议重新采集和独立评分，不把本次桌面检查合并成 CLI benchmark。

## 结论与限制

针对性结果符合本轮目标，未观察到局部自主性或表单实现退化。领域旧版也完成了记录，
不支持新版相对旧版的效果提升；增加领域指导的收益目前是明确维护契约和归属。

每条件只有一次生成，未取得精确模型构建版本；子代理继承同一宿主模型和推理配置。
未进行独立数值盲评分、重复采样、跨模型验证或全部 45 个真实模型用例。reference
读取依据代理记录，未保留 CLI JSONL 阅读审计，不能证明文件访问隔离。也没有验证
浏览器、设备、生产性能、包发布或更新回滚。本轮证据用于开发验收，不构成发布门槛
已满足或稳定质量提升的证明。

后续完整 45 例 CLI 对照、12 组成对复测、原始失败与限制记录见
[完整回归报告](../2026-10-15-full-suite/report.md)。
