# 三类任务的默认自主流程验证

日期：2026-10-19。状态：完成定向验证；本机安装状态以本目录的安装回执为准。本轮未发布版本。

后续根据维护者澄清，将需求开发与架构设计统一为相互反馈的开发过程；下文早期“三条路径”
的表述是原验证历史。当前规则与补充验证见文末“需求开发与架构设计贯通”。

## 改变的默认行为

用户只说明目标和对象，技能自行判断需求开发、架构设计或代码审查，查找已有需求、有效决策、代码、调用方和验证入口，再完成对应工作。只有调查后仍无法解决、且会影响结果的重要选择才需要追问。

- **需求开发**：需要设计的工作先保存技术文档，明确有依赖顺序的步骤、每步功能、函数或类契约及验收，并提供架构图和数据流转图；随后实现、验证并检查实际代码质量。既定局部修改仍直接完成。
- **架构设计**：交付工作区中可继续维护的技术文档及链接，包含上述实施和代码设计；明确哪些是项目事实、拟议方案及未执行验证。设计请求本身不授权编写应用实现。
- **代码审查**：默认同时检查有效需求是否满足、代码是否符合共同工程标准。自行检查真实调用关系、函数职责、状态和副作用所有权、依赖与生命周期；测试全绿不代替可维护性判断。审查保持只读。

三条路径使用相同的适用工程标准。任务大小改变范围和检查深度，不降低清晰性、正确性与可维护性要求。“最高标准”也不授权凭空认定缺陷、增加无依据框架或声称未检查的系统已合格。标准沿用技能已有原则及维护者提供的工程判断。

变更集中于入口、现有架构与审查专题、默认调用提示和用例。未修改行为采集或评分器；未改变其他项目的 AGENTS.md。先前已完成的需求文档流程保留，详见[前一轮记录](../2026-10-19-design-workflow/report.md)。

## 输入与隔离

原始用户请求仅为：

| 用例 | 用户请求 | 项目输入 |
| --- | --- | --- |
| 条件字段开发 | 把这个表单的条件字段支持做完。 | 现有代码、README 产品契约及受保护测试 |
| 上传架构 | 设计这个文件上传模块的架构。 | 内联现有入口、appApi 能力及已接受分片 API 和产品契约 |
| 维护性审查 | 审查这次改动。 | before/after 快照、公开导出契约及行为测试 |
| 契约审查 | 审查这次改动。 | before/after 社区模块、当前产品契约、accepted decisions 及测试 |

开发产物没有获得“要拆步骤、设计函数、保存文档、画两类图或检查双轴”的额外提示；审查输入没有预先告诉生成器要找什么缺陷。维护性 fixture 从原导出 fixture 复制后移除了面向评测的答案暗示，保留产品契约和全部代码、测试。架构事实只说明产品需要，不指定模块方案。原始 fixtures 已保存于 [frozen-inputs/fixtures](frozen-inputs/fixtures)。

使用已有 `run_behavior_evals.py` 的通用工作区和隔离指令：读取本地技能、按需读取引用、保护评测文件、不得读取答案或旧结果；实现模式另有通用的完成任务及运行检查要求。完整实际提示见各轮 `prompt.txt`，不是只有聊天一行文字的无宿主实验。没有将判分条件放进生成提示。审查模式核实快照未修改。

所有有效生成与独立评分使用 `gpt-5.6-sol`、medium，Codex CLI 0.145.0，临时独立上下文。生成阶段未带原聊天历史、评分标准或既往答案；两阶段评分另起上下文。独立指上下文隔离，模型家族相同，不是跨模型评审。尝试过的不可用模型名称未产生有效对照，不纳入结果。

`previous` 是本轮开始时已有的本地技能，已经包含前一轮需求文档改进；它不是 Git HEAD 的 v0.5.0。无技能组为 `baseline`。指南快照与哈希保存在 [frozen-inputs](frozen-inputs)，本轮前七份文件的哈希见 [before-change-hashes.json](before-change-hashes.json)；架构专题的原始版本在 previous 快照中。当前运行脚本未改动。

## 最终有效的定向复测

| 目标 | 有效轮次 | 独立语义评分 | 实际产物与检查 |
| --- | --- | --- | --- |
| 从短需求完成开发 | candidate-v2-development | target | 先保存设计再改代码；文档有步骤、代码契约和两类文本图；受保护文件检查、npm ci、13/13 行为测试通过 |
| 从短请求交付架构 | candidate-v4-design | target | 实际保存 docs/uploads-architecture.md；5 步实施计划、类型和函数职责、架构与数据流图；未创建 src/test 实现文件 |
| 测试全绿时检查维护性 | candidate-v3-maintainability | target | 找到调用方需要维护可变分阶段协议的问题；区分结构成本与当前功能回归；before/after 共 20 项测试通过，审查只读 |
| 按现行需求审查 | candidate-v3-contracts | target | 找齐 4 项模块契约缺陷，并用最小运行示例复现；10 项原有测试仍通过，审查只读 |
| 局部修改不过度设计 | candidate-local（首轮指南） | target | 直接完成既定标签修改，未额外生成设计文档或安装依赖 |

可直接复核的最终产物：

- [条件字段设计](candidate-v2-development/autonomous-feature-development/candidate/artifacts/docs/conditional-fields.md)、[实现差异](candidate-v2-development/autonomous-feature-development/candidate/changes.diff)、[开发答复](candidate-v2-development/autonomous-feature-development/candidate/response.md)。创建设计与首次代码修改分别出现在事件 30、34；此检查证明文件写入顺序，不替代首稿内容的语义审查。
- [上传架构文档](candidate-v4-design/autonomous-architecture-design/candidate/artifacts/docs/uploads-architecture.md)、[设计答复](candidate-v4-design/autonomous-architecture-design/candidate/response.md)。包含双槽队列、单文件会话与传输边界、暂停恢复、取消、complete/status 对账及页面释放，复用 appApi；行为验证均明确为计划。
- [维护性审查](candidate-v3-maintainability/autonomous-review-maintainability/candidate/response.md)、[契约审查](candidate-v3-contracts/autonomous-review-contracts/candidate/response.md)。后者发现无 activityId 的 Get 可用、目录未随前台恢复、新草稿替换失败重试 payload、新查询失败后沿用旧分页游标；未把未提供的宿主接线断言为缺陷。

各组 `manifest.json` 保存生成、只读/受保护文件检查、宿主验证及读取隔离结果。`blind-scores/scores.json`、原始 events.jsonl、changes.diff、response.md 与验证日志均保留。最终三类任务的隔离与读取审计有效。架构读取了三个相关专题，触发人工范围复核；架构、异步生命周期、模块边界与此任务有关，不以专题个数判为越界。

## 对照、失败及修正

本轮不能证明所有能力由新提示首次带来。旧版已能在开发和架构任务保存完整设计，独立评分均为 target，历史 Mermaid 块解析通过；无技能架构组也交付了设计并获 target。无技能组与旧版均能识别导出协议耦合，因此不把该审查发现计作新增能力。契约审查的本次样本中，无技能组发现 2/4、旧版 3/4、新版修正后 4/4；这是固定输入的有限观测，不是普遍成功率。

保留所有原始轮次，不把重试替换成首轮成功：

1. `candidate-main` 的开发语义评分为 target，但独立 Mermaid 12.2.0 解析暴露第二张图的语法错误，综合判定失败；无技能开发组没有先行设计。技能随后明确优先使用已有图示校验工具，DSL 必须校验；没有工具时用带标注、箭头和分支的自包含文本图，不能以披露“未渲染”代替有效图示。没有为小型设计安装整套应用工具链。
2. 同组架构 candidate 虽保存文档且 Mermaid 解析通过，但一次 `find ... -newer ...` 的元数据访问未被现有读取审计识别，该次采集按 invalid 保留。未放宽审计来取得通过。
3. `candidate-review` 初版契约审查虽然找到四项缺陷且获得 target，还把未提供的宿主 URL 接线当成确定问题。证据复核将其记为精度问题；规则补充先找责任边界。v3 重新生成后，把这类情况列为验证缺口，同时保留模块内部可证明的问题。
4. `candidate-v2-design` 在聊天中给出完整方案却没有保存文档，独立语义评分仍给出 target。实际文件检查判定失败；未把聊天代存为模型产物。随后明确“设计要保存并链接”，并补充该案例不可用未提醒保存作豁免。v4 独立重新生成后实际交付文件，文件检查与语义评分同时通过。原评分及漏判保留，未改写。

因此，单独依赖文字评分会漏掉产物和语法问题。本记录结合独立语义评分、实际文件/写入顺序检查及 DSL 解析；综合结论见 [outcomes.json](outcomes.json)。最终两份设计均用文本图，已复核模块依赖、数据变化及分支含义；不宣称经过 Mermaid 解析或浏览器视觉验收。历史 DSL 错误保留在对应 `diagram-checks.json`。

## 校验与复现

仓库结构校验与主技能官方校验通过，91 项既有脚本测试通过。日志见 [execution](execution)。全部 60 项行为用例只完成静态校验，**没有重跑完整行为套件**。开发 v2、审查 v3、架构 v4 是按受影响路径重测，不是最终快照上的整套重复运行；v3 仅收紧审查证据边界，v4 仅澄清设计保存。局部修改对照来自首轮指南。

复现时从本仓库复制未修改的 scripts，恢复任一 `frozen-inputs/<版本>/SKILL.snapshot.md` 为隔离副本的 `SKILL.md`，恢复其 references，并把快照根目录的 `openai.yaml` 放入 `agents/openai.yaml`；使用保存的 fixture。用例输入可用 `scoring-cases.yaml`，其中最终保存文件失败条件较初期评分更明确；原始生成请求和项目契约不变，各轮 cases 快照保留当时条件。

在准备好的隔离技能副本中执行，例如：

```sh
python scripts/run_behavior_evals.py --case autonomous-feature-development --mode candidate --model gpt-5.6-sol --reasoning-effort medium --timeout-seconds 900 --results-dir /tmp/frontend-architect-autonomy-reproduction
python scripts/score_behavior_evals.py --case autonomous-feature-development --mode candidate --model gpt-5.6-sol --reasoning-effort medium --timeout-seconds 600 --results-dir /tmp/frontend-architect-autonomy-reproduction
```

替换用例 ID 可复现其他场景；无技能组选择 `--mode baseline`。使用新空结果目录；原始轮次没有启用宿主反馈重试。评分目录保留实际发送的匿名评分提示与缓存，最终判定还需结合本记录的产物及 DSL 检查。

本记录增加三个范围有限的证据工具：`execution/collect-artifacts.py` 从本轮临时工作区保存真实文件及写入事件；`execution/check-artifacts.py` 检查本轮开发先行文档、设计文件落盘与不生成实现；`execution/check-diagrams.mjs` 解析实际 Mermaid 块。它们不替代通用评分器或日常 validator。对历史失败和最终成功都运行过检查；预期失败的退出码及日志未忽略。文本图没有 DSL 解析结论，仍需语义复核。

限制：这些是小型固定场景，不是完整业务仓库验收；未验证实际浏览器、设备或完整 React 集成，未验证其他模型与自动技能选择，未建立统计显著性。设计产物没有运行时实现可验。结论是三种短请求在相关最终复测中完成了目标，不能保证所有任务永不遗漏，也不能据此给未检查的代码最高质量认证。

## 本机使用与恢复

同步采用独立本机开发预览，保留当前安装完整备份并记录覆盖文件哈希；不建立开发目录到技能目录的长期链接。`VERSION` 保持 0.5.0，tag 与公开发布不变。实际目标、快照标识及恢复路径见 [installation-receipt.json](installation-receipt.json)。先前文档流程与其他安装内容继续保留。

## 需求开发与架构设计贯通

维护者进一步明确：需求开发与架构设计相辅相成。相应调整入口、架构专题、README 与调用描述，
将其表达为同一过程：从产品规则和验收拆解功能，确定职责、函数或类契约及数据流，按依赖实现并验证，
再将实际约束反馈到原设计、实施步骤和图示。仅设计请求限定的是该过程的交付边界，不是另一套脱离需求的设计方法。
仅审查的职责及只读边界保持原规则。

该修订没有要求用户补充流程提示，也没有新增审批。旧的两个短请求及其项目输入保持原样，
只增强用例中对“需求—步骤—架构—实际代码/验收”对应关系的观察条件。
前一版七份文件保存在 [before-coupled-refinement](frozen-inputs/before-coupled-refinement)，
新指导保存在 [candidate-v5-coupled](frozen-inputs/candidate-v5-coupled)，
精确差异见 [coupled-refinement.diff](coupled-refinement.diff)。

开发复测 `candidate-v5-coupled-development` 的独立评分为 target，受保护文件、npm ci 和 13 项行为检查通过。
实际写入事件 31 先保存设计，34 修改源码，41 更新同一设计的步骤状态及实际验证结果。
两类文本图中的 `processForm`、条件筛选、快照、验证与发送职责能对应到源码；未额外建设类或框架。
原始输出及 [设计文档](candidate-v5-coupled-development/autonomous-feature-development/candidate/artifacts/docs/conditional-fields.md)
均保留；没有把评测产物改写成参考答案。

人工复核发现该设计步骤 1 的验收句把 inactive 与 disabled 一并表述为不执行条件回调，措辞不准确；
同篇契约、真实源码及测试清楚区分 disabled 不执行条件回调、inactive 在条件求值后跳过验证和提交。
独立评分没有报告该处文案问题，因此本记录不将 target 等同于所有文字和代码均无问题。

仅设计复测 `candidate-v5-coupled-design` 的独立评分为 target（14.86/16）。实际保存
[上传架构文档](candidate-v5-coupled-design/autonomous-architecture-design/candidate/artifacts/docs/uploads-architecture.md)，
从已接受规则推导模型、单文件协议、传输适配、页面期协调与 UI，再关联到 5 个实施步骤及各步验收。
架构和数据流均为有标注的文本图，文件检查确认没有新增应用源码或测试；未安装应用依赖。
读取审计有效，五个专题涉及架构、异步、模块、范式与交互，人工范围复核认为与此设计相关。

该独立评审把 correctness_boundary 评为 1/2：create 与 cancel 竞态中，旧 runId 的发布可能被丢弃，
`runUpload` 返回 void，文档未闭合新取得 uploadId 如何可靠交给取消收尾的契约。
它列出了相应测试计划，但没有实现和运行证据可以消除该缺口；应在真实开发时细化并验证。
保留这一评审，不将“已联动需求与设计”扩大为方案已经完全正确。该问题也未导致再添加一条只针对样例的全局规则。

本次仓库校验、官方技能校验和 91 项既有脚本测试再次通过；日志为 `execution/coupled-*.log`。
未重新执行代码审查用例或完整 60 例；局部修改对照仍来自前一轮。相同模型家族、文本图语义复核及无真实浏览器的证据限制继续适用。

本次同步保留原安装回执；后续预览的实际哈希、目标及完整备份见
[贯通流程安装回执](coupled-refinement-installation-receipt.json)。公开版本仍为 0.5.0，未发布或推送。

## 工程理念贯穿需求开发与架构设计

维护者要求技能中的开发理念和思维参与整个开发与设计过程。前版已经具备共同工程标准、
范式选择、模块化及各运行时专题；本次补强这些指导与默认技术设计流程之间的连接。

关键选择须有需求或约束、具体方案、选择理由及检查依据，并写在原设计中相关的契约或步骤旁。
复用、职责与依赖方向、范式、状态/资源所有权、扩展边界及适用的运行时、交互、安全和性能义务
用于实际取舍；设计稿和最终代码都按共同标准自审。完整图示、计划检查和功能全绿不能替代这种判断。
保持原专题为指导来源，依据任务选择阅读深度，不要求把全部模式或原则名称变成每份文档的章节。

修订涉及入口、原架构专题、README、变更记录和两个原有用例的观察/失败条件，未修改采集器、
评分器或项目输入。旧指导保存在 [before-principles-refinement](frozen-inputs/before-principles-refinement)，
新指导保存在 [candidate-v6-principles](frozen-inputs/candidate-v6-principles)，
精确变更见 [principles-refinement.diff](principles-refinement.diff)。

既有合理决策继续作为基线：例如上一版已经复用 appApi，并按纯状态和页面期资源选择表示，
不能把新指导中更明确地写出这些原则，当成首次获得相应能力。本次验证继续固定两条短请求、
原项目输入、模型和隔离方式，检查选择理由与具体契约、代码和验收的对应关系。

开发复测 `candidate-v6-principles-development` 的独立评分为 target（16/16）。
[实际设计](candidate-v6-principles-development/autonomous-feature-development/candidate/artifacts/docs/conditional-fields.md)
用单次提交的所有权解释浅快照和求值时序，按该操作没有独立身份或可复用生命周期解释保留既有模块，
并通过回调扩展点检查后续条件规则，而没有为了模式增加类或分层。源码、README 和图示对应同一契约；
受保护文件核对、npm ci 及 13 项行为检查通过。设计事件 32 先于源码事件 35，之后继续更新原文档。
这是小型无界面提交能力，不据此宣称已验证真实 UI、运行时性能或网络环境。

设计复测 `candidate-v6-principles-design` 保存了
[实际上传架构](candidate-v6-principles-design/autonomous-architecture-design/candidate/artifacts/docs/uploads-architecture.md)。
它通过纯转换与资源对象的职责解释范式组合，通过页面期稳定身份解释 manager 的选择，
让 React 只订阅和发命令，继续复用 appApi，以类型/状态契约描述服务端确认、取消和晚到响应，
并把可访问交互与“未来分片并发”联系到具体 UI 验收及变化落点。设计文档包含两类文本图和 5 步计划，
文件检查确认没有新增实现或测试文件，未安装项目依赖；行为和浏览器验证仍明确为计划。
该轮读取了五个与上述决策相关的专题，读取审计和隔离有效；专题数不作为质量分数。

设计独立评分为 target（16/16）。它具体写出取消意图与迟到 create 返回的 abort 收尾，
将该动作放在同一 manager 的资源所有权内；本次评审未再报告上一轮的 uploadId 交接缺口。
这只是新样例的设计层观察，不等于运行时竞态已验证，也不足以把评分变化归因于一条指导。
独立评审保留真实 appApi 类型、消费者、测试惯例与集成环境缺失的限制；其中生成期格式检查
no-index 命令的退出码为 1，完整应用行为仍不能由该命令或文档质量证明。

两轮实际产物/写入顺序检查通过。两份文档使用文本图，做语义复核，不宣称经过图形 DSL 解析或视觉验收。
完整结果见 [principles-refinement-outcomes.json](principles-refinement-outcomes.json)，原始评分和输出保留在各轮目录。
复现沿用前文命令，使用 candidate-v6-principles 快照及相同用例输入即可。
本次仓库、官方技能及差异格式校验通过；脚本未改动，91 项脚本测试沿用前一轮记录，本次未重复运行。
未重跑完整 60 例、审查和局部修改场景，也未验证自动技能选择或真实应用。单次同模型家族评测不保证以后无遗漏。

本轮同步继续保留完整前版安装及历史回执，实际目标、哈希与恢复路径见
[工程理念安装回执](principles-refinement-installation-receipt.json)。公开版本与 tag 保持不变。

## 具体思想与自主发现审计：FLIP 等

维护者追问 FLIP 及其他思想是否真正融入。核对结果：这些思想大多早已存在于专题中，
上一轮仅以共同标准和宽泛的交互/性能入口接入，未验证用户不点名方法时的自主选择。
原 `reorder-motion` 请求明确列出 FLIP 和过渡机制，不能用其结果代替自主发现证据。

本轮没有另写一套方法教程。原技术设计章节增加“业务行为—设计视角—原指导”的条件导航，
入口直接链接该导航，并为重排、共享元素和中断式空间变化增加明确过渡机制入口。
重要不变量、所有权和验收继续落入原技术文档及实施步骤；不把全部方法列成每个项目必用的模式。

| 核实的既有思想/指导 | 要影响的实际决定 | 原指导 |
| --- | --- | --- |
| FLIP、过渡机制层级 | 几何映射、First/Last/Invert/Play、读写批处理、中断、静态终态与减少动态效果 | [动效](../../../references/interface-and-motion.md#apply-flip-deliberately) |
| Atomic Design、组合 | 稳定部件与整体、设计系统政策与产品业务的边界 | [组件系统](../../../references/interface-and-motion.md#choose-component-system-boundaries) |
| Colocation、FSD、信息隐藏 | 功能内聚、公开 API、依赖方向与变化落点 | [模块](../../../references/module-boundaries.md#compare-the-two-grouping-strategies) |
| 函数式核心/命令式外壳、对象、reducer/状态机 | 规则、身份、生命周期与副作用分别由谁承担 | [范式](../../../references/programming-paradigms.md#decision-matrix) |
| 最小状态、派生数据、Effect 同步边界 | 真实编辑状态与重复事实的区别 | [状态](../../../references/architecture-and-code.md#model-data-and-state) |
| AHA、错误抽象 | 何时共享、保留何种扩展点、共性是否稳定 | [抽象](../../../references/architecture-and-code.md#abstract-at-the-right-time) |
| Intrinsic Web Design、渐进增强、包容性交互 | 内容与容器约束、原生语义、可维持的基线及本地化 | [布局](../../../references/interface-and-motion.md#design-layout-from-content-and-constraints) |
| RAIL、更新到像素的成本链 | 响应/动画/加载目标、实际瓶颈、运行时测量与资源成本 | [响应](../../../references/interface-and-motion.md#protect-accessibility-and-performance)、[渲染](../../../references/rendering-and-performance.md#model-the-path-from-update-to-display) |
| 执行与发布分离、命令顺序、乐观对账 | 过期结果、权威状态、取消和资源获取/释放 | [异步](../../../references/async-and-lifecycles.md#choose-policy-from-the-operation) |
| 环境/缓存所有权、信任边界 | 序列化、作用域、失效、source-to-sink 和服务端授权 | [运行时](../../../references/runtime-and-delivery.md#map-environments-before-components)、[信任](../../../references/security-and-trust.md#trace-data-from-source-to-sink) |
| 契约先行、消费者演进 | 共享基建的真实公开产物、类型、兼容与迁移 | [基建](../../../references/frontend-infrastructure.md#design-the-contract-before-the-internals) |

新增两条中性请求：“设计这个看板卡片排序的技术方案。”和“设计商品页和订单页筛选区的技术方案。”
原始产品事实不包含 FLIP、Atomic Design、FSD 等名称，也不提示拆步骤、画图或列工程方法。
重排输入只描述空间连续性、连续操作、滚动/resize、焦点及减少动态效果；筛选输入则保留两个
页面真实不同的草稿/即时提交、URL 恢复、重置与长标签需求，没有动效要求。

前版与新版使用相同的新用例输入、采集器、模型 gpt-5.6-sol/medium 和隔离方式；每个生成上下文
只获得一份技能与原始输入。这里的“自主发现”指加载技能后的方法选择，不是 Codex 自动选择技能。
旧指导及哈希见 [before-lenses-refinement](frozen-inputs/before-lenses-refinement)，
新指导见 [candidate-v7-lenses](frozen-inputs/candidate-v7-lenses)，
原始输入见 [lenses-scoring-cases.yaml](lenses-scoring-cases.yaml)，
精确变更见 [lenses-refinement.diff](lenses-refinement.diff)。
旧指导原来只有 60 例；为保持比较输入一致，隔离副本加入同一份新用例数据，但不改其指南。
判定基于具体取舍与契约，合理选择其他过渡方案不构成失败，也不以复述方法名称计分。

| 指导 | 无方法提示的排序方案 | 无方法提示的筛选区方案 |
| --- | --- | --- |
| 前版（principles 预览） | target；主动选用可中断 FLIP + WAAPI，定义几何、持久化和交互边界 | target；复用控件，分离业务策略与共享布局，区分草稿及 URL |
| 新版（lenses 预览） | target；First/Last/Invert/Play、当前视觉起点、批量读写、稳定身份、清理及真实运行时验收进入设计 | target；稳定部件/整体、功能内聚、派生状态、内容约束和后续变化进入设计，无无关动效 |

四份有效采集的独立评分均为 16/16、target，实际文件检查均通过；没有生成应用实现或测试文件。
前版也已主动选择 FLIP，且筛选方案的核心取舍合理，因此不能把方法选择能力计为本轮首次获得，
也未证明成功率显著提升。本轮交付的是更明确、可维护的行为触发入口及此前缺失的自主验证证据。

新版可复核产物：

- [排序设计](candidate-v7-lenses-reorder/autonomous-reorder-design/candidate/artifacts/docs/card-reordering-technical-design.md)：
  区分唯一业务顺序、纯排序规则、视觉投影和串行合并保存；从播放中的视觉矩形重新接管动效，
  焦点、按钮与拖动、减少动态效果、scroll/resize、卸载及后续跨列变化均有对应契约和验收。
- [筛选区设计](candidate-v7-lenses-filter/autonomous-filter-design/candidate/artifacts/docs/filter-areas-technical-design.md)：
  两个业务各自拥有类型、默认值、URL codec 和提交政策，仅共享有当前收益的展示骨架；
  商品草稿和订单日期中间态有独立语义，结果与数量从查询数据派生；约束布局、翻译、键盘、
  浏览历史和新增商品条件的变化落点均被纳入。

完整原始输出、评分及证据限制保存在四组目录，汇总见
[lenses-refinement-outcomes.json](lenses-refinement-outcomes.json)。四组的读取审计与隔离有效，
前后两份 capture_contract 一致；不同专题组合按真实需求核对，不按读文件数评分。
图示均为文本图，做语义审查，不宣称经过图形 DSL 解析或浏览器视觉验收。

仓库与官方技能校验通过，91 项既有脚本测试通过，当前用例静态校验为 62 项。
未运行完整 62 例，也未重新生成前几轮的开发/审查回归。以上是两类设计场景，实际应用源码、
浏览器交互、运行时性能、API 最终提交语义和真实消费者集成均未验收；其他思想本轮完成指导与
路由核对，不能由这四份方案推论所有方法和全部运行环境均已验证。仍为同模型家族的少量样本。

本轮以完整备份同步本机预览，保留历史回执；实际哈希、目标和恢复路径见
[具体方法导航安装回执](lenses-refinement-installation-receipt.json)。公开版本与 tag 未改变。

## 具体思想的实现、运行与接手验证

后续新增八组短请求实现用例，并完成 29 次生成采集，补上前节未验证的真实代码、
Chromium/HTTP 行为、包消费者和后续变化检查。本次指导与已安装预览字节一致；没有向
生成方提供方法名称、预期方案或维护者诊断。原始失败、选择器/产物采集纠错和无效样本保留。

已观察到内聚导出、闭包生命周期、乐观 reducer、共享控件与业务政策分工、FLIP、
用户缓存和信任边界、公共插件宿主契约进入实际代码。异步编码只修改操作所有者；
库存只进入商品相关代码，原订单语义通过回归。权限一致的新上下文还自行发现并修复
看板焦点缺陷，浏览器全套通过，插件自行通过真实打包安装。

仍不能据此宣称稳定达到全部最高标准：另一次看板实现确有焦点遗漏，RAIL 缺少自主
取得的原始实现基线，原生购买的已确认结果会被后续报价失败掩盖，部分技术文档的私有符号/签名未完全对齐。完整代码、图示、原始
执行和分项结论见[实现型验证报告](implementation-verification/report.md)。未运行完整 70 例行为库。

## 通用判断与自主验证的后续补强

针对前节四项缺口，将交互连续性、独立呈现权威确认、实现前取得原始基线，以及从最终
定义和调用重建重要文档契约接入现有流程；以团队邀请页检查跨业务迁移，仍仅给原始需求、
项目和技能。共完成 27 份采集，完整保留三轮指导、中断、无效审计及实际缺陷。

当前购买确认和焦点处理通过真实边界检查，邀请页自主新增了复合失败、编辑连续性和键盘
检查；性能基线采集及文档验收状态仍有遗漏，未达到四项全部稳定自主验收。公开版本未变，
同步为可恢复的本机开发预览。逐项证据、来源与限制见[通用判断复测](judgment-refinement/report.md)。
