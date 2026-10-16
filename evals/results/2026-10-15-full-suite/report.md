# 精简前后完整 45 例行为评测

实验日期：2026-10-15。记录生成时间：2026-10-15T06:09:10.883036+00:00。

主对照新版 **45/45 达标**，5 处首轮降分在同配置成对复测中均为新旧同分。
额外实现复测仍有一例候选 Dialog 验证链失败；原始失败保留，不能给出“完全无退化”
的结论。诊断副本只修正测试准备后 5/5 通过，支持直接故障位于生成的验证链，尚不能
证明精简对输出稳定性完全没有影响。

## 主对照结果

| 指标 | 精简前 previous | 精简后 candidate |
| --- | --- | --- |
| 完成生成并独立评分 | 45 | 45 |
| 原始达标 | 40 / 45 | 45 / 45 |
| 原始失败 | 5 | 0 |
| 最终无效主样本 | 0 | 0 |
| 原始有效样本均分，满分 16 | 15.29 | 15.39 |
| Vite 补证复核后，仅更新该例判定的达标计数 | 41 / 45 | 45 / 45 |

原始数值质量分有 9 例上升、31 例相同、5 例下降。一票失败覆盖分数，因此均分包含
高分但失败的有效样本，不能用均分代替通过率。补充复核没有混入原始均分或覆盖原表。
小幅均分变化、单次输出及本次选择的案例集合不足以证明稳定质量提升。

previous 是精简前的实际工作区快照，含此前未提交的评审/评测改动；两个条件都加载
对应 Skill，运行模式均为 candidate。它不是无 Skill baseline，也不是已发布 tag 的
对照。生成和评分固定为 gpt-5.6-sol / high、CLI 0.162.0-alpha.17.2。

### 原始旧版失败及复核

- `community-review-mixed-diff`：漏掉新查询失败后复用旧 cursor 的契约缺陷；质量分
  16，失败审计仍正确覆盖为 fail。新版主样本发现该缺陷。
- `optimistic-profile-update`：测试间缺少 DOM cleanup，4/5 失败。原夹具已有该缺口；
  诊断只补 cleanup 后 5/5 通过，成对复测两版均通过。依赖安装与缓存时序也是限制。
- `group-by-api`、`anticipate-small-boundary`：额外主题读取的独立决策缺口说明不足。
  这是路由契约失败；groupBy 复测两版都再次出现。
- `vite-feature-flags-plugin`：原始盲评误将遗漏执行证据当作“单测未运行”。原始事件
  实际有 2/2 成功记录。补齐同类原始包命令、退出码和编辑顺序后，两条件分别独立复核
  为 target：旧 15.2，新 14.4。该例原判定撤销后旧版达标为 41/45；原始评分仍保留。

补证复核同时披露 Node/Vite 兼容矩阵和发布回滚未充分验证；新版额外轮询机制的成本
依据也被扣分。它们保留为取舍和证据限制，不据此声称两版完全等价。复核过程、初始
视图及澄清开发过程/最终验收后的结果均在 [adjudication](adjudication/vite-execution-evidence-final/method.json)。

## 12 组成对复测

复测覆盖 5 个首轮降分案例、groupBy 路由边界，以及全部 6 个可执行实现案例；每条件
12 个新会话，共 24 个新样本。旧版 11/12 达标，新版 10/12 达标，最终均无无效评分。

| 案例 ID | 主测旧 → 新 | 复测旧 → 新 |
| --- | --- | --- |
| `vue-search-url-i18n` | 15 / 达标 → 16 / 达标 | 16 / 达标 → 15 / 达标 |
| `accessible-dialog-primitive` | 14.4 / 达标 → 15.2 / 达标 | 15.2 / 达标 → 8.8 / 失败 |
| `react-native-feed-rendering` | 16 / 达标 → 14 / 达标 | 15 / 达标 → 15 / 达标 |
| `covered-hover-diagnosis` | 16 / 达标 → 14.4 / 达标 | 14.4 / 达标 → 14.4 / 达标 |
| `proportional-design-documentation` | 16 / 达标 → 14 / 达标 | 14 / 达标 → 14 / 达标 |
| `vite-feature-flags-plugin` | 14.4 / 失败 → 15.2 / 达标 | 16 / 达标 → 15.2 / 达标 |
| `field-eligibility-executable` | 16 / 达标 → 16 / 达标 | 16 / 达标 → 16 / 达标 |
| `maintenance-reuse-existing-check` | 16 / 达标 → 14.4 / 达标 | 14.4 / 达标 → 14.4 / 达标 |
| `centralized-tests-follow-project-contract` | 16 / 达标 → 13.33 / 达标 | 13.33 / 达标 → 13.33 / 达标 |
| `group-by-api` | 14.4 / 失败 → 16 / 达标 | 16 / 失败 → 14.4 / 失败 |
| `optimistic-profile-update` | 11.43 / 失败 → 16 / 达标 | 16 / 达标 → 16 / 达标 |
| `search-request-lifecycle-executable` | 16 / 达标 → 16 / 达标 | 14.86 / 达标 → 16 / 达标 |

五个主评分下降分别为 -2、-1.6、-2、-1.6、-2.67 分，复测差值全部为 0。
多项差异来自评分者对“无真实工程时的具体验证方案”给 2 还是 1 的不同处理；RN 首轮
也少了部分体验边界说明。复查和复测支持没有稳定重现这些下降，不能由此推断所有
评分变化都是噪声。

复测还出现 Vue 旧 16 / 新 15、Vite 旧 16 / 新 15.2 等未触发失败的分数差异。
Vue 的扣分依据是真实浏览器导航证据缺失；这些差异已完整保留，没有进一步采样来
估计频率。首轮五处降分持平不等于所有复测分数完全相同。

### 候选 Dialog 的独有失败

原始复测的真实 Chromium 5 项检查失败：IIFE 中的 `process` 未定义；水合准备还把
Playwright 转换的 TSX 对象传给 React SSR，触发 `__pw_type` 错误。生成者报告的宿主
浏览器启动限制没有解释父流程实际看到的这些错误。

维护者在独立诊断副本中，仅补浏览器构建的 NODE_ENV 和经 Vite 编译的 SSR markup。
9 个 src 文件与 26 行浏览器断言逐字相同，5/5 通过。这个结果不计为原复测通过，
也没有修改正式生成产物或 Skill 指导。原始 trace、差异、哈希和日志见
[Dialog 诊断](diagnostics/dialog-candidate-repeat/metadata.json) 与
[浏览器结果](diagnostics/dialog-candidate-repeat/validation.log)。

该问题应优先从生成的测试构建与真实浏览器反馈链定位。现有检查已经能暴露失败，
没有依据为单次工具配置错误增加普遍 Skill 禁令。没有另做同配置多轮采样来估计该失败
频率，也没有测试生成者收到宿主日志后的独立修复闭环；因果和稳定性仍待确认。

## 逐例原始结果

下面保持原始盲评，包括 Vite 后续撤销的原判定。每个分数链接到对应原始回答；同目录
保存 events.jsonl、changes.diff 和实际验收日志。[CSV](comparison.csv) 为同一数据的机器可读表。

| 案例 | 精简前原始评分 | 精简后原始评分 |
| --- | --- | --- |
| 已确认领域修订进入已有记录而非停在对话 | [16 / 达标](previous/shard-1/domain-knowledge-owned-record/candidate/response.md) | [16 / 达标](candidate/shard-1/domain-knowledge-owned-record/candidate/response.md) |
| 缺少领域文档不阻塞已授权局部修改 | [16 / 达标](previous/shard-2/local-edit-without-domain-documents/candidate/response.md) | [16 / 达标](candidate/shard-2/local-edit-without-domain-documents/candidate/response.md) |
| 重复失败优先修已有检查接线而非增加常驻禁令 | [16 / 达标](previous/shard-3/maintenance-reuse-existing-check/candidate/response.md) | [14.4 / 达标](candidate/shard-3/maintenance-reuse-existing-check/candidate/response.md) |
| 跨文件变更中自行定位需求与遗漏路径 | [16 / 失败](previous/shard-1/community-review-mixed-diff/candidate/response.md) | [16 / 达标](candidate/shard-1/community-review-mixed-diff/candidate/response.md) |
| 大变更中的有限审查准确披露行为盲区 | [16 / 达标](previous/shard-2/community-review-bounded-coverage/candidate/response.md) | [16 / 达标](candidate/shard-2/community-review-bounded-coverage/candidate/response.md) |
| 需求修订与变更路径共同约束审查 | [16 / 达标](previous/shard-3/review-requirements-and-changed-paths/candidate/response.md) | [16 / 达标](candidate/shard-3/review-requirements-and-changed-paths/candidate/response.md) |
| 局部审查保持轻量并说明行为边界 | [16 / 达标](previous/shard-1/review-local-scope-and-evidence-limits/candidate/response.md) | [16 / 达标](candidate/shard-1/review-local-scope-and-evidence-limits/candidate/response.md) |
| 命名暴露混合职责而非只换目录名 | [16 / 达标](previous/shard-2/abstraction-name-matches-responsibility/candidate/response.md) | [16 / 达标](candidate/shard-2/abstraction-name-matches-responsibility/candidate/response.md) |
| 集中测试按业务对应源码并保持执行范围 | [16 / 达标](previous/shard-3/centralized-tests-follow-project-contract/candidate/response.md) | [13.33 / 达标](candidate/shard-3/centralized-tests-follow-project-contract/candidate/response.md) |
| 沿用框架约定而非统一目录模板 | [16 / 达标](previous/shard-1/ecosystem-before-folder-template/candidate/response.md) | [16 / 达标](candidate/shard-1/ecosystem-before-folder-template/candidate/response.md) |
| 入口业务堆积需要实际职责拆分 | [16 / 达标](previous/shard-2/scaffold-is-not-business-architecture/candidate/response.md) | [16 / 达标](candidate/shard-2/scaffold-is-not-business-architecture/candidate/response.md) |
| 必要设计不等于补齐目录 | [16 / 达标](previous/shard-3/avoid-ceremonial-page-layers/candidate/response.md) | [16 / 达标](candidate/shard-3/avoid-ceremonial-page-layers/candidate/response.md) |
| 当前没有重复仍检查后续变化 | [16 / 达标](previous/shard-1/anticipate-without-current-duplication/candidate/response.md) | [16 / 达标](candidate/shard-1/anticipate-without-current-duplication/candidate/response.md) |
| 无明确路线图也主动预留合理边界 | [16 / 失败](previous/shard-2/anticipate-small-boundary/candidate/response.md) | [16 / 达标](candidate/shard-2/anticipate-small-boundary/candidate/response.md) |
| 为常用调用提供适度便利 | [16 / 达标](previous/shard-3/convenience-without-framework/candidate/response.md) | [16 / 达标](candidate/shard-3/convenience-without-framework/candidate/response.md) |
| 已验证领域对象避免重复防御 | [16 / 达标](previous/shard-1/trust-validated-internal-data/candidate/response.md) | [16 / 达标](candidate/shard-1/trust-validated-internal-data/candidate/response.md) |
| 减少防御仍保留实际授权边界 | [16 / 达标](previous/shard-2/retain-real-authorization/candidate/response.md) | [16 / 达标](candidate/shard-2/retain-real-authorization/candidate/response.md) |
| 优先复用现有成熟表格能力 | [13.33 / 达标](previous/shard-3/reuse-existing-table-capability/candidate/response.md) | [13.33 / 达标](candidate/shard-3/reuse-existing-table-capability/candidate/response.md) |
| 简单局部逻辑无需新增依赖 | [13.33 / 达标](previous/shard-1/trivial-formatting-without-dependency/candidate/response.md) | [13.33 / 达标](candidate/shard-1/trivial-formatting-without-dependency/candidate/response.md) |
| 前端模板持续同步保留维护路径 | [14.4 / 达标](previous/shard-2/preserve-upstream-maintenance-flow/candidate/response.md) | [14.4 / 达标](candidate/shard-2/preserve-upstream-maintenance-flow/candidate/response.md) |
| 通用 groupBy 封装 | [14.4 / 失败](previous/shard-3/group-by-api/candidate/response.md) | [16 / 达标](candidate/shard-3/group-by-api/candidate/response.md) |
| 全局职能目录膨胀 | [14.67 / 达标](previous/shard-1/role-folder-growth/candidate/response.md) | [14.67 / 达标](candidate/shard-1/role-folder-growth/candidate/response.md) |
| 小项目是否按 feature 分组 | [16 / 达标](previous/shard-2/small-project-structure/candidate/response.md) | [16 / 达标](candidate/shard-2/small-project-structure/candidate/response.md) |
| 大功能内部的细粒度模块化 | [14.67 / 达标](previous/shard-3/feature-internal-decomposition/candidate/response.md) | [14.67 / 达标](candidate/shard-3/feature-internal-decomposition/candidate/response.md) |
| 富文本编辑器选择 FP 还是 OOP | [16 / 达标](previous/shard-1/editor-paradigms/candidate/response.md) | [16 / 达标](candidate/shard-1/editor-paradigms/candidate/response.md) |
| 派生状态和 Effect | [14.4 / 达标](previous/shard-2/derived-state-effect/candidate/response.md) | [14.4 / 达标](candidate/shard-2/derived-state-effect/candidate/response.md) |
| 列表重排动画 | [14.67 / 达标](previous/shard-3/reorder-motion/candidate/response.md) | [14.67 / 达标](candidate/shard-3/reorder-motion/candidate/response.md) |
| 商品页的服务端与客户端边界 | [15 / 达标](previous/shard-1/server-client-catalog/candidate/response.md) | [15 / 达标](candidate/shard-1/server-client-catalog/candidate/response.md) |
| 用户富文本与危险 DOM sink | [14.67 / 达标](previous/shard-2/unsafe-rich-text/candidate/response.md) | [14.67 / 达标](candidate/shard-2/unsafe-rich-text/candidate/response.md) |
| 完整实现乐观资料更新 | [11.43 / 失败](previous/shard-3/optimistic-profile-update/candidate/response.md) | [16 / 达标](candidate/shard-3/optimistic-profile-update/candidate/response.md) |
| Vue 搜索表单、URL 状态与国际化 | [15 / 达标](previous/shard-1/vue-search-url-i18n/candidate/response.md) | [16 / 达标](candidate/shard-1/vue-search-url-i18n/candidate/response.md) |
| 高风险预订流程的发布与可观测性 | [15 / 达标](previous/shard-2/risky-booking-rollout/candidate/response.md) | [15 / 达标](candidate/shard-2/risky-booking-rollout/candidate/response.md) |
| 商品列表性能回归与发布门槛 | [14.86 / 达标](previous/shard-3/product-list-performance-contract/candidate/response.md) | [16 / 达标](candidate/shard-3/product-list-performance-contract/candidate/response.md) |
| 跨应用 Dialog 基础组件 | [14.4 / 达标](previous/shard-1/accessible-dialog-primitive/candidate/response.md) | [15.2 / 达标](candidate/shard-1/accessible-dialog-primitive/candidate/response.md) |
| 可发布的 Vite Feature Flags 插件 | [14.4 / 失败](previous/shard-2/vite-feature-flags-plugin/candidate/response.md) | [15.2 / 达标](candidate/shard-2/vite-feature-flags-plugin/candidate/response.md) |
| 浏览器更新到像素的卡顿定位 | [14.86 / 达标](previous/shard-3/browser-update-to-pixels/candidate/response.md) | [16 / 达标](candidate/shard-3/browser-update-to-pixels/candidate/response.md) |
| React Native 信息流掉帧 | [16 / 达标](previous/shard-1/react-native-feed-rendering/candidate/response.md) | [14 / 达标](candidate/shard-1/react-native-feed-rendering/candidate/response.md) |
| 小程序实时列表的渲染通信成本 | [16 / 达标](previous/shard-2/mini-program-render-transfer/candidate/response.md) | [16 / 达标](candidate/shard-2/mini-program-render-transfer/candidate/response.md) |
| 个人主页身份与接口契约 | [14.4 / 达标](previous/shard-3/profile-domain-contract/candidate/response.md) | [16 / 达标](candidate/shard-3/profile-domain-contract/candidate/response.md) |
| Hover 失败与测试假通过 | [16 / 达标](previous/shard-1/covered-hover-diagnosis/candidate/response.md) | [14.4 / 达标](candidate/shard-1/covered-hover-diagnosis/candidate/response.md) |
| 删除交互后收敛内部结构 | [16 / 达标](previous/shard-2/remove-obsolete-interaction/candidate/response.md) | [16 / 达标](candidate/shard-2/remove-obsolete-interaction/candidate/response.md) |
| 表单字段规则的跨路径一致性 | [14 / 达标](previous/shard-3/field-eligibility-consistency/candidate/response.md) | [16 / 达标](candidate/shard-3/field-eligibility-consistency/candidate/response.md) |
| 按决策需要区分文档深度 | [16 / 达标](previous/shard-1/proportional-design-documentation/candidate/response.md) | [14 / 达标](candidate/shard-1/proportional-design-documentation/candidate/response.md) |
| 实现有效字段统一契约 | [16 / 达标](previous/shard-2/field-eligibility-executable/candidate/response.md) | [16 / 达标](candidate/shard-2/field-eligibility-executable/candidate/response.md) |
| 实现搜索请求所有权和稳定数据边界 | [16 / 达标](previous/shard-3/search-request-lifecycle-executable/candidate/response.md) | [16 / 达标](candidate/shard-3/search-request-lifecycle-executable/candidate/response.md) |

## 实际验证与证据位置

| 实现案例 | 实际验收边界 | 仍未证明 |
| --- | --- | --- |
| 乐观资料更新 | TypeScript、Vitest/jsdom；主测旧版失败，成对复测两版通过 | 真实浏览器、真实服务端写入与生产并发 |
| Vue 搜索/国际化 | TypeScript、Vitest/jsdom，含 URL 与 locale 状态 | 真实导航、刷新/分享与跨浏览器行为 |
| Dialog | SSR 与真实 Chromium；候选复测保留失败，诊断副本 5/5 | 完整浏览器/辅助技术/版本矩阵及生成者反馈修复能力 |
| Vite 插件 | 受保护构建、类型、SSR dev 更新、诊断、tarball 及隔离消费者 | 浏览器客户端 HMR、完整支持矩阵与 registry 发布 |
| 字段资格 | 受保护 Node 行为测试 | 真实表单 UI、宿主集成与用户路径 |
| 搜索请求生命周期 | 受保护 Node 行为测试 | 真实浏览器、网络与产品集成 |

- 主对照 90 个样本全部完成任务契约、原始事件摘要、完成 turn、阅读路由、保护文件、
  验收顺序、评分集合和指导副本核验；当前开发目录指导与冻结 candidate 逐字相同。
  结果见 [主证据核验](evidence-verification.json)。
- 24 个复测样本及 2 个仅用于补证评分的主样本副本核验通过；聚合副本与原始文件
  逐字一致，不另计生成样本。见 [补充证据核验](supplemental-verification.json)。
- 仓库结构校验、官方 quick_validate、**67 项确定性脚本测试**及 git diff --check 通过。
  见 [实际命令日志](deterministic-validation.log)。
- [方法与复现](method.md)、[冻结输入摘要](input-hashes.json)、[运行计划](run-plan.json)、
  [环境版本](environment.json)、[原始复查笔记](review-notes.md)、[复测 CSV](repeats-comparison.csv)
  保存配置、来源、判断和限制。

旧版 Vite、Dialog 各一次 900 秒超时均归档于 attempts/，两条件重新使用相同的
1800 秒上限；无最终回答/完成 turn 的尝试没有进入质量均分。另有读取审计误报、CLI
预检、协议修复前中止采集及一次错误 CLI 重评分，均单列保留。纯元数据修复没有改
任务或指导；其中 96 个既有完成样本的审计结果逐字不变。细节见方法记录。

## 未验证与解释边界

- 45 例中只有 6 个实现案例、2 个共用一组 before/after 快照的只读评审案例；其余
  37 例主要评价内联材料上的方案与判断。没有真实大型生产仓库的覆盖率或稳定性证明。
- 本批全部显式加载 Skill，关闭其他技能、插件及个人文档；**自动触发和技能共存未测**。
  frontmatter 描述变化的发现效果未由这批案例验证。
- 未测其他模型、精确服务端构建或确定性种子；生成与评分使用同一模型系列，人工复查
  已发现评分口径及证据视图问题。单次主样本和选定复测不提供统计稳定性保证。
- RN、Flutter、小程序、真实设备、生产性能和真实用户指标未实测；Dialog 的 Chromium
  证据不能代表所有浏览器、辅助技术、React 版本及消费者。补证 Vite 也只有实际记录的
  Node/Vite 环境；其冻结 dev 检查通过 SSR 模块加载验证更新，未证明真实浏览器客户端
  HMR。完整支持矩阵、真实发布和回滚也未覆盖。
- 生成者的 workspace-write 与父流程宿主执行权限不同，共享依赖缓存也未冻结。
  这些因素影响反馈和复现；本轮没有修复浏览器沙箱限制或完成跨权限环境对照。
- 未重跑无原对话接手检查、真实人类维护、安装更新/回滚及发布流程。当前已安装技能
  和全局配置未修改，本记录不构成发布验收。
- 阅读审计依赖可见执行事件，不能证明任意程序没有隐式访问；摘要是一致性证据，
  不提供防篡改签名。保留的原始失败和诊断通过均需按其实际范围使用。
