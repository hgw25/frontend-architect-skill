# 评测验收及统一维护复核

2026-10-19。本轮修复四项评测与维护缺口；源码未发布。技术设计及实际函数、架构和数据路径见
[工程设计](../../../docs/engineering/evaluation-and-maintenance.md)。

## 四项修复与检查

| 原问题 | 通用修复 | 决定性验证 |
| --- | --- | --- |
| 实现评分缺少原始契约及未改调用方 | 冻结原始项目和每轮最终项目；两阶段读取完整定义与调用，保留原始检查顺序及修改前指标 | 快照摘要、遗漏/改写快照、未改动调用方、早期 `sed` 和成本事件回归 |
| 必要成果遗漏可被均分抵消 | 产品契约审查与按任务适用的共享验收 profile 分开；不满足或证据不足直接阻止 target，保留质量分及定位 | 看板 16/16 仍因不存在的文档符号被拒绝；缺基线/仅计划文档与真实对齐文档正反控制 |
| 插件打包只看导入和 hook 形状 | 安装真实 tarball 的独立消费者运行公开类型、生产值、source map 秘密隔离、开发重载和错误契约 | 健康包通过，空 hook 与空公开声明均失败；两个 fixture 使用相同消费者 |
| README 与独立维护技能两套安装路径 | 官方安装器暂存；独立维护技能调用同一事务处理首次安装、更新和回滚；主安装归一化移除嵌套 companion | 同目录不同备份位置共用锁；本地变更、并发变化、激活/后置核对故障、恢复失败及回滚回归 |

`python -m unittest discover -s scripts -p 'test_*.py'`：**118/118 通过**。
仓库结构校验、两项官方 quick_validate 和 `git diff --check` 见
[最终检查原始输出](execution/final-checks.json)。源码、评测配置及执行器冻结在
[工具身份记录](execution/final-tools/manifest.json)，供后续复核。

## 只给需求、项目与技能的实际生成

CLI 输入除简短需求外，仅含技能读取、项目操作及受保护检查的通用协议；未给设计方法、诊断、
预期答案或独立 oracle。独立检查只在生成结束后注入副本，不能覆盖交付文件。没有宿主提示修复轮。
F1、F2 指导字节分别保存在 [首次计划](plan.json) 和 [最终计划](final-plan.json)；
F2 在交互专题增加原生编辑状态连续性的一般判断，不指定本案例函数、结构或修法。

CLI 0.145.0，macOS 26.7.1 arm64，`danger-full-access`，Node 22.22.2；浏览器检查使用
Playwright 1.62.1 与 Chromium 151。主批次 `gpt-5.6-terra / medium`；独立替代批次
`gpt-5.6-sol / medium` 不与主批次平均。

| 批次 | 对象 | 原始执行与判定 |
| --- | --- | --- |
| F1 fresh | 看板 | 生成完成，公开 6/6、随后独立键盘 2/2 通过。修改前布局 655 / 样式 679，最终 23 / 56；墙钟 222.74→245.07ms，不能声称响应延迟改善 |
| F1 fresh | 插件 | 生成完成，公开完整检查及新打包消费者通过；原始/最终源码和事件均保留 |
| F1 fresh | 邀请页 | 公开 6/6 通过；独立检查 3/4。发送完成后 textarea 光标由 7 移至 16，继续编辑被破坏；不能记为全部正确 |
| F1 repeat | 看板 | 模型容量错误，中断；invalid，不是行为成功或确定的质量失败 |
| F2 final | 看板 | 公开 6/6、独立键盘 2/2 通过；盲评 16/16，但文档将不存在的 `requestSave` 写为实现契约及架构路径，第二阶段判 fail |
| F2 final | 插件 | 生成完成，类型、构建、开发更新、诊断和打包消费通过；15.2/16。文档与实现出现在同一修改事件，不能独立证明先行设计；第二阶段 insufficient_evidence，最终 fail |
| F2 final | 邀请页 | 模型容量错误中断，另有不符合读取审计协议的链式命令；invalid，不计为通过 |
| F2 final-sol | 邀请页 | 替代模型容量错误中断；invalid |

完整采集分别保存在 `fresh/`、`repeat/`、`final/` 和 `final-sol/`；最终两项
[scores 看板](final/autonomous-live-board/blind-scores/scores.json)、
[scores 插件](final/autonomous-live-flags/blind-scores/scores.json)保留产品契约、必要成果和质量分。
没有修改生成项目来把失败改成通过。插件判定指出的是顺序证据不足，未据此断言“没有设计”。
F2 看板修改前 655 次布局/679 次样式重算，最终焦点修正后 23/48；固定 Chromium、80 卡、
1100×760、8 次操作及 reduced-motion 条件。中间版本的 15 次布局不作为最终结果。

CLI 连续出现容量中断后，按 skill-creator 独立前向验证补做一项
[原生代理复测](native-invites/plan.json)。该代理不继承本对话，只收到邀请页短需求、项目路径和
冻结技能，没有诊断提示或后续指导。生成方 13/13 浏览器检查通过，主持方原样复跑 13/13；
再于隔离副本运行冻结原始检查 3/3 和未见过的独立交互检查 4/4，均通过，详见
[原始检查结果](native-invites/host-results.json)。核对最终表单、列表、统计模块与装配调用，
三步技术文档及两类图示未发现不一致。

原生代理扩充并加强了原测试文件，未收到 CLI 的只读测试协议；因此不把它冒充受保护 CLI
采集，也不声称具有同样的原始读取/时间顺序事件审计。原始检查由主持方单独重跑，避免只凭
自改测试验收。该补测证明此次交付的实际行为，不能据一次通过推断自主完成率已稳定。

## 验收器正反控制及校准记录

以下是维护者构造的控制样本，不是新的自主生成成功。使用相同原始 fixture、保存的交付与
原始记录，明确保留控制来源；没有将历史采集重标为新协议有效。

- [missing-evidence-v3](acceptance-controls/missing-evidence-v3/autonomous-live-board/candidate/accepted-failures.json)：识别缺原始性能基线，以及原技术文档仅列计划、没有实际结果。回答或日志有结果不能替代文档所有者回填。
- [aligned-positive-v3](acceptance-controls/aligned-positive-v3/autonomous-live-invites/candidate/accepted-failures.json)：实际契约、图示、完成范围和真实检查结果一致的文档通过，不强制时间戳、逐步打勾或字段配额。
- [document-drift-v3](acceptance-controls/document-drift-v3/autonomous-live-invites/candidate/accepted-failures.json)：植入不存在的必填 `idempotencyKey` 后，能从原始 transport 及真实调用方识别矛盾，即使仍记录真实通过结果也拒绝一致性声明。
- [打包反例](execution/package-probes-online/results.json)：健康实现 exit 0；仅空 hook、删除公开函数类型的变体均 exit 1。输入产物及摘要保存于 `execution/package-probes-source.snapshot.json` 和 `package-probes-source.json`，可用 `package-probes.py` 重新安装依赖回放。

初版控制曾把聊天结果误当文档回填；V2 又过度要求逐步状态和额外元数据。两者都保留，
没有将误判当正确标准。V3 明确事实属于哪个工件、最终快照优先及按语义判断，消除格式配额。
`fresh/*/grading-v2` 与旧 `blind-scores` 保留当时评分，不作为新版验收的通过率。
首次打包反例离线执行因 npm 缓存缺元数据而失败，记录在 `package-probes/`；在线对照才是
上述功能结论的依据。控制 V2 的容量中断也未算成功。

## 安装与后续维护

主技能与独立维护技能均使用本轮审查及回归通过的共同执行器；本机候选为未发布预览。
官方安装器继续负责远端不可变版本暂存，本轮没有发布 tag，也没有以本地检查证明远端发布。

安装的最终版本、全文件摘要、备份与后置核对由
[独立安装回执](/Users/heguangwei/.codex/skill-backups/frontend-architect-preview-20261019.json)
保存。回执在技能发现目录与候选内容之外，避免安装记录与候选摘要相互引用。
先核对现有本机预览的已知运行文件；所有出站文件均保留在可恢复备份，不覆盖其他技能。
主安装不保留嵌套维护技能，独立 companion 使用相同事务及各自回执。

本轮没有运行全部 71 项模型行为场景；浏览器证据限 Chromium 和测试 HTTP 替身。
包的开发检查证明 Vite SSR 重载，不证明浏览器 HMR 页面应用、全部 Vite 版本或所有操作系统。
安装验证覆盖本地事务和注入故障，未做新的远端发布/网络故障实测。当前可以证明验收会拒绝
这些遗漏和失效实现，仍不能宣称每次生成都会自动无遗漏；最终 F2 CLI 两项也没有被授予 target。
