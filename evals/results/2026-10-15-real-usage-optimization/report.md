# 真实问题驱动的 Skill 优化与本地安装

2026-10-15。指导优化、定向验证与本地安装已完成。原始失败、补强结果、安装来源及未验证范围分别保留。

## 指导改动

- **根因判断**：入口明确恢复成功不等于主链路原因得到证明；验证参考说明沿权威事件、
  身份关联、持久化和消费者转变寻找断点。受控复现机制与没有历史日志的事故原因分别表述。
  保留已确认信号丢失或结果未知时的合理恢复，并复用已有生命周期 owner。
- **完整交互验收**：从动作、等待、已接受数据到可见反馈和失败重试检查连通性；按实际风险
  选择冷加载、延迟内容、布局收敛、不同视口或连续输入。布局检查实际可用空间，公共交互检查
  支持规模下的准备工作量，不把挂载、类名或测试总数当作完整验收。
- **证据维护**：长期结论绑定受检快照、命令、实际选择的检查、条件和结果，并保存决定性原始
  样本或可获取的产物引用。原件缺失时区分历史记录与新执行；复用现有记录和存储，不为每次
  局部修改新建归档系统。

合并了验证参考中的重复覆盖说明、布局说明和界面检查清单；入口的详细原因分析与长期证据
细节留在现有专题。入口从本轮前的 272 行变为 274 行；已安装发布版为 327 行。新增关键条件
有少量文字成本，不以继续减行数牺牲判断。必要命令快照、状态历史、公共边界和自主执行规则保留。

本轮仅调整 Skill 与评测维护，没有修改真实产品仓库。此前发现的 API 生成脚本无效包装仍归属
负责源码；不通过在 Skill 中新增同义禁令代替该产品修复。

## 对应行为用例

共新增 6 例，用例总数从 45 增至 51：

| 用例 | 保护的判断 | 形式 |
| --- | --- | --- |
| root-cause-before-recovery-executable | 已到达的完成事实走主链路合并，不能用周期历史刷新掩盖 | Node，7 项保护检查 |
| settled-interaction-journey-executable | 空间回收、键盘、保存重试、在途编辑、延迟布局后可见行 | Chromium，初版 5 项，补强版 6 项 |
| evidence-retention-and-reverification | 原件缺失、并行修改、widget 结果和原生性能的证据边界 | 原记录修订方案 |
| justified-recovery-after-signal-loss | 已确认丢信号时保留有界恢复及账号/任务归属 | 方案 |
| simplify-without-erasing-operation-owner | 催促减代码时保留提交快照、草稿和身份边界 | 代码建议与验证安排 |
| incident-cause-with-missing-history | 受控机制修复不冒充真实事故完整还原 | 事故记录结论 |

另外选取 6 个已有控制场景：hover 诊断、既有检查接线、无领域文档的局部编辑、小型前瞻边界、
废弃交互清理和领域记录维护。它们检验新增指导是否引入禁止合理恢复、过度拆分、删除必要抽象、
强制文档或重复授权等退化。

## 夹具有效性与确定性检查

- 回复夹具原实现 4 项失败 / 3 项通过；在临时副本修正事实来源后 7 项通过。
- 交互夹具原实现 4 项失败 / 1 项通过；局部修正后 5 项 Chromium 检查通过。
- 两组修复对照的保护文件均逐字一致，修改差异和原始日志已保存。
- 最终仓库脚本测试 71 项通过，含夹具健康检查、读取审计正反例及生成/主机证据来源回归；仓库及官方 Skill 校验通过（51 例）。
- 安装流程在临时目录验证正常替换、备份、替换后校验失败恢复及锁释放。

证据：[fixture-health.json](fixture-health.json)、[reply-original.log](reply-original.log)、
[reply-positive.log](reply-positive.log)、[interaction-original.log](interaction-original.log)、
[interaction-positive.log](interaction-positive.log)、[reply-completion-positive.diff](reply-completion-positive.diff)、
[interaction-journey-positive.diff](interaction-journey-positive.diff)、
[deterministic-validation-final.log](deterministic-validation-final.log)、[installation-self-test.log](installation-self-test.log)。

首次浏览器健康检查因测试 worker 重新选端口而连接失败，原始尝试保留；共享父进程选定端口后，
原失败与修复对照重新执行，再冻结模型输入。调度器首次缺少结果父目录，尚未生成样本即退出；
补齐目录后重新启动。这些基础设施尝试不计作产品或 Skill 行为样本。

## 行为对照的解释边界

本轮使用固定 gpt-5.6-sol/high 和同一 bundled CLI，比对本轮修改前的 272 行源码指导与候选版；
两个条件都加载各自的本地指导，不是无技能 baseline，也不是已安装 327 行发布版对照。
12 组成对生成后分别做独立质量评分和失败项审计。所有降分先看证据；新增失败、verdict 下降或
至少 1 分的降幅按相同条件重新成对生成。原始主测与复测分开保存，不覆盖第一次结果。

输入、工具源码和夹具的 294 个冻结文件已归档在 frozen-inputs，入口命名为 SKILL.snapshot.md，
避免重复技能发现。[input-hashes.json](input-hashes.json) 保存摘要；每例另有原始事件、回答、
差异、冻结验收契约与执行日志。复核脚本使用归档的采集/评分实现和用例，不依赖以后分支里的
用例内容；本轮另外核对当前指导仍等于候选冻结输入。

执行方式和预定复测规则见 [method.md](method.md)，配置见 [run-plan.json](run-plan.json) 与
[environment.json](environment.json)。

## 主测、测量修复与真实失败

原始主测 12 组 / 24 份生成：旧版 12 项 target，新版 11 项 target、1 项 basic；原有验收命令
均通过，没有原始一票否决项。逐项结果见 [comparison.csv](comparison.csv) 和
[summary.json](summary.json)。这份原始分布不会被后续成功覆盖。

两处评测工具问题单独修复，未改变模型任务、指导输入或原验收：

- 阅读审计 v5 把文件列表接 `sort` 或纯数字 `sed -n` 误记为未知阅读。v6 只识别已确认的
  metadata 命令接这两种无文件参数的显示操作；读取、执行动作、重定向、多级管道仍拒绝。
  修复了主测和恢复复测各 1 份有效样本的误判，不给 metadata 记指导阅读分。
  初次协调器的非零退出保留；生成、验收、重审及补评分分别有原始记录。
- 原评分混用了生成沙箱自检与回答之后的主机验收，且对只要求方案的恢复案例额外要求执行或上线。
  评分视图 2 明确来源和任务范围后，匿名重新评分原产物：主测交互旧/新均 14.22、恢复均 16；
  恢复复测也均 16。保留视图 1，不把新旧视图混成平均数，也不借此宣称稳定提升。

原始 manifest.audit-v5.json、原评分和原事件均保留；AST 比较确认生成、初始化、任务构造、
契约与验收执行函数未变。见 [audit-repair-protocol.json](audit-repair-protocol.json)、
[audit-repair-main.json](audit-repair-main.json)、[audit-repair-recovery.json](audit-repair-recovery.json)
及 [adjudication/method.json](adjudication/method.json)。归档工具在 audit-tools，摘要另存。

按预定降分规则另生成恢复、交互各 1 组。交互复测虽都通过原有 5 项检查，候选输出被独立
失败审计判定不符合草稿保护：A 提交后编辑成 B、再改回 A，旧回调用文字相等判断并清空新草稿。
旧版复测也有同一问题；其评分没有指出，不代表实现正确。新增浏览器诊断证实：旧版主测、
两版交互复测均在该边界失败，主测候选和编辑版本修复对照通过。

这是真实缺口，未用重评分消除。原复测候选保留 fail；原夹具新增第 6 项保护检查后，原实现
5 失败 / 1 通过，编辑版本对照 6 项通过。诊断在副本运行，原采集契约与工作区未改：
[draft-revision/diagnostic.json](draft-revision/diagnostic.json)、
[复测候选失败日志](draft-revision/repeat-candidate.log)、[修复对照](draft-revision/positive.log)。

## 单独补强后的验证

只在已有异步专题补充编辑 owner/version 与提交快照的区别，说明文字相等不能证明没有编辑；
优先复用已有表单 revision/dirty 生命周期，仅在需要时增加本地版本，并覆盖程序化清空。
入口行数不变，未增加通用流程引擎、禁止恢复或锁住整个编辑器。

补强版使用新的冻结输入和验收版本，重新成对生成交互与命令归属两个场景；两版都得到相同
新增检查。它与原始主测、原样复测分开，结果见 [refinement/plan.json](refinement/plan.json)。

| 补强版场景 | 旧版 | 新版 | 实际验收 |
| --- | --- | --- | --- |
| 完整交互 | 16 / target | 14.22 / target | 两版 Chromium 各 6 项通过，保护文件未改 |
| 命令归属与必要抽象 | 16 / target | 16 / target | 方案评测，未运行缺失应用 |

新版交互的 1.78 分下降来自生成阶段浏览器命令因 EPERM 失败的两个维度；其代码和后来主机
6 项验收通过，回复如实记录了当时未验证范围。按预定规则再生成同输入成对复测，旧/新均为
14.22 / target，Chromium 各 6 项通过，没有新增失败。独立结果见
[补强版交互复测](repeats-selected/refinement-ui/plan.json)。
不通过再次改变评分规则消除这处分差，也不把两个维度解释为已确认的产品逻辑退化。

人工检查补强候选产物：提交值和编辑版本在请求前固定，用户输入及清空推进版本，成功只清
同版本草稿；失败保留输入、恢复保存，布局就绪后按实际相交行启动动效。实现沿用现有文件和
浏览器能力，没有新增依赖或通用流程引擎。此检查针对缩小夹具，不能替代真实产品验收。

其余 10 项主测没有针对最终新增
的异步段落重新执行，不能把初版主测冒充最终版全量结果。

本轮合计 **17 组成对生成、34 份独立产物**；另有 6 份仅重评分副本，不另计生成。
主测 24 份及补充 10 份生成、6 份评分副本均通过契约、原始事件、指导字节和验收顺序核验。
原交互复测候选的 fail 仍保留；补强版本已执行场景均达标。评分和有限复测不足以证明稳定优于
旧版或所有行为完全无退化。见 [补充证据汇总](supplemental-summary.json) 和
[最终确定性检查](final-deterministic-checks.json)。

## 本地安装约定

此次目标是当前仓库的已验证开发快照，不通过重新下载旧稳定标签覆盖本轮改动。
更新流程复用已安装系统 skill-installer 的目录校验/复制能力和 frontend-architect-update 的
变更比对、锁、备份、替换与恢复约定。

安装前，现有目录与其声明的 v0.4.2 标签逐文件一致；它不是符号链接或开发 checkout。
远端带注释标签的 peeled commit 也确认是 469a44dedea4d7effdbe74a65fe6e1d1f439637a。
见 [installed-before.json](installed-before.json) 和 [installed-tag-remote.txt](installed-tag-remote.txt)。

VERSION 继续标识已发布的 0.4.2；新的本地开发快照用来源清单、内容指纹和安装回执区分，
不伪造新的远端发布版本。复制保持仓库目录分发及支持文件，按既有约定将嵌套更新 companion
移出发现目录，独立安装的 companion 保持权威。旧版备份与锁都位于技能发现目录之外。

## 本地安装结果

- 已激活快照：`0.4.2+local.20261015.d05d4b1be0ef`。
- 安装目录：`/Users/heguangwei/.codex/skills/frontend-architect`；入口与维护参考逐字等于最终受检候选。
- 旧版备份：`/Users/heguangwei/.codex/skill-backups/frontend-architect/20261015T080935Z-53b1fbdf/previous`。
- 完整分发快照 4441 个文件；仅将 1 个嵌套 companion 文件移到发现目录之外，安装后 4440 个文件
  全部与来源清单、回执匹配。独立 companion 字节未变，旧备份与安装前指纹一致，更新锁已释放。
- 安装后官方 quick_validate 通过，仅有一个主 Skill 入口。新版按维护子技能约定下轮可用；未重启应用。

证据：[来源清单](installation-source-manifest.json)、[安装回执](installation-receipt.json)、
[安装后逐项核验](installation-post-check.json)。外部回执另存于备份操作目录的 `receipt.json`。

分发副本在激活前冻结，未包含之后生成的安装回执和本段最终结果；权威完成记录位于本源码
目录及上述外部回执。后续报告/状态更新不改变已受检的 Skill、维护入口或参考文件，不能把整个
后续工作树冒充安装时快照。来源清单保存安装时的确切文件集合与摘要。

## 未验证部分

- 本轮是 12 项定向对照，不是重新执行全部 51 项；上一轮 45 例全量报告独立保留。
  上一轮 Dialog 的候选额外复测失败没有在本轮重跑或消除，不能用本轮结果覆盖。
- 回复夹具是内存事务模型，不是生产 SQLite；交互夹具是缩小的 DOM 场景，不是完整虚拟表格 SDK。
  四个新增文字场景不能证明可运行实现、真实事故还原或证据实际保存操作。
- 布局用例覆盖 800×600、800×920 及 450ms 延迟；更多视口、离屏/滚动后重新入场和完整产品矩阵未测。
- 本轮显式加载 Skill；自动触发、其他技能共存和新版指导在真实产品中的持续使用效果未测。
- 未重跑四个真实产品的全量检查、真实后端、跨浏览器、物理设备帧时间、远端 CI 或发布。
- 临时故障注入验证本次本地激活的恢复路径；未完整演练 companion 的网络更新与独立回滚流程。
- 生成与评分属同一模型系列，准确服务端模型构建和 seed 不可得；共享依赖缓存没有制作镜像。
  前向评分及有限复测不能证明长期稳定改善或排除所有退化。
- 盲评存在漏报：旧版交互复测的草稿缺陷由新增浏览器诊断确认；target 不代表所有路径正确。
- 本地更新不同于正式发布；没有创建 tag、提交、推送、发布或自动重启 Codex。
