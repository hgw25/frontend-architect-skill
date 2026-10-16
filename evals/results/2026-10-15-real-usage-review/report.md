# 真实使用复查：代码、工程判断与技能维护

复查日期：2026-10-15。结论限定于抽查的真实任务和代码路径。

**最终代码的关键边界大体符合我们的工程要求，但初次交付的判断和验收还不够稳定。**
值得保留的是队列事务、发送命令快照、组件 Core/适配层和有对照的真机优化；
需要改善的是根因证据、完整交互验收、局部成功与整体验收的区分，以及维护证据的可追溯性。
本轮新确认一处 P2 历史代码缺陷，未发现能在所选最终路径中复现的新 P1。
这不是全仓无缺陷结论，也不是精简版真实使用的对照试验。

## 范围与版本

检索 6 个近期对话，抽查 4 个代码仓库，时间范围涵盖 9 月底至 10 月 15 日：

| 对话原名 | 主要检查内容 | 代码状态 |
| --- | --- | --- |
| 对照迁移 pageForm 源码 | 输入框可用空间、清空交互、源码与 UI 适配来源；侧栏拖动阈值 | React 未提交工作树的固定副本 |
| 统一系统整体布局 | 统一异步反馈、表格 CRUD 动效、准备成本、懒加载和高度就绪 | 另一个对话仍在修改；本轮仅对固定副本下结论 |
| 对比并集成 AppTable 与 PageForm | Core/Vue 分层、来源指纹、会话和错误恢复、已有 CI | Vue 未提交工作树的固定副本 |
| 对齐 app 的排队机制 | 完成事实、身份合并、历史窗口、补偿与根因 | PC 当前 HEAD 对应文件 |
| 审查暂存区前端代码 | 精简目标、发送快照、切会话/账号、生成式 API 工作流 | PC 当前 HEAD 对应文件 |
| 梳理智能体进入后性能链路 | 预览尺寸所有者、转场状态、实验撤回与性能证据 | Flutter 当前 HEAD 对应文件 |

选取的 18 条历史请求/回复及技能读取命令保存在 [thread-excerpts.json](thread-excerpts.json)。
其中助手宣称的结果仍是历史证据，不能当作本轮执行结果。附件和完整业务工具输出未复制。

**真实任务加载的是已安装旧版，仓库精简版尚未进入这些任务的加载路径。**

| 入口 | 行数 | SHA-256 |
| --- | --- | --- |
| 当前已安装 | 327 | `0eb67432af8bc535cb045446a9397769d24796ab9da722de086e12c6fffe8138` |
| 45 例对照使用的 previous | 327 | `b16045665bc9d55f9c371a6a129956dde48dbb8d3c09a4991f5cc73f596b0d6d` |
| 仓库候选精简版 | 272 | `39f445039789a537fae64d11e3574dc468afe84de891b535934d4588f307cb5e` |

已安装入口与 previous 也不完全相同，差异是 review-only 路径的指导。
不能把这些任务直接称作 previous 对照组，更不能将它们的问题归因于本轮精简。
历史读取输出有截断，并未取得每一轮所有 reference 的完整版本指纹。

## 当前代码问题

### P2：API 生成后的手动写入始终失败，并被空 catch 隐藏

位置：[api-render/index.js:79](/Users/heguangwei/project/xiejing/useless-space-pc/packages/api-client/api-render/index.js:79)。

`generateApi(...).then(({ files }) => ...)` 内调用 `fs.writeFile(path, content)`：
这里的 `path` 是导入的模块对象，且回调版 `fs.writeFile` 没有第三个 callback 参数。
在当前 Node 22.22.2 下，最小复现立即抛出 `ERR_INVALID_ARG_TYPE`，提示 callback 为 undefined；
空 `catch {}` 将其全部吞掉，生成流程仍可表现为成功。

本地安装的 swagger-typescript-api 13.2.18 已在生成流程中使用
`this.fileSystem.createFile({ path: this.config.output, ...file })` 写入输出，
因此这里是无效的重复包装，不能提高生成可靠性。它还与紧随其后的“生成失败必须让进程红掉”
的维护意图矛盾。

建议删除这一 `then` 包装及因此闲置的 fs 导入，保留生成库的输出与错误传播；
若项目确有额外产物，明确文件名、使用可 await 的写入并使失败可见。
用最小离线 OpenAPI 输入检查实际文件输出和生成失败传播即可，无需新建生成框架。
本轮未修改该代码，也未连接真实 Swagger 服务。

归属：`git blame` 指向 2026-05-19 的历史代码；不是近期任务新增或精简版引入。
当前真实使用复查可以发现它，但不能据此认定之前一次有范围限制的 UI review 必须审到它。
复现输出、来源与修复边界见 [codegen-write-repro.json](codegen-write-repro.json)。

## 真实任务暴露的判断问题

### 高优先级：先证明主链路失败，再决定是否需要恢复机制

“对齐 app 的排队机制”曾先后将历史 50 条窗口、通知缺失作为完整根因，
之后新增启动/重连/联网/页面恢复和 30 秒周期对账。
这些测试证明补偿可以收口等待，没有证明原始完成事件为何没完成旧请求。
用户指出“只是兜底”后，该批机制已经撤回。

最终代码的改进是成立的：[ai-reply-progress.ts:39](/Users/heguangwei/project/xiejing/useless-space-pc/apps/user-web/src/db/sql/ai-reply-progress.ts:39)
在消息写入后的同一事务读取既有 replyMsgId，合并 user/client/agent 身份与单调完成事实。
新鲜复跑也覆盖原始完成 SSE、真实 SQLite worker、live query 和下一条队列提升，
不调用历史回拉来制造通过。
历史窗口外对账仍有独立职责，不应因撤回轮询而一并删除。

判断：此前的根因措辞和补偿优先不符合要求；最终修复及证据限制符合要求。
原来那五条真实请求的历史事件日志仍缺失，当前代码可复现的缺陷不能反推完整事故原因。

维护位置：现有 `Diagnose before restructuring` 与验证参考已经规定区分症状、假说、原因。
优先补行为评测：给出可使症状消失的补偿，同时保留一个能区分主链路缺陷的证据入口，
观察代理是否调查它、是否撤回无效实验、是否准确限定结论。不要再增加全局“禁止轮询”规则。

### 高优先级：按真实交互和负载验收，测试总数不代表覆盖完整

React 两类反馈具有相同的问题：

- 表单一开始只收紧图标间距，没有把释放的宽度交给文字；清空隐藏、单行/多行、
  下拉/日期、键盘与触屏需要分别看实际布局。后续才改为已有 shadcn InputGroup，
  配合组件自有布局规则回收宽度和恢复焦点。
- 统一动效的第一版，完成了大量功能测试，但后续性能任务记录到 24×16 批量更新
  准备耗时中位数 217.4ms，以及逐格动画和无数据变化滚动时的额外测量。
  该历史数值来自原任务报告，本轮没有重新构造旧版本测量。
  之后才改为可见业务 key、批量读取、只克隆真实删除行和最多 32 个属性效果。
- 用户又指出导航回第一项、统一加载反馈和表格下半部分入场不完整。
  该任务正在修复懒加载/高度就绪/观察生命周期；本轮固定副本已包含其中的修正，
  不能把正在变化的代码当成最终未修缺陷。

当前结构值得保留：
[useTableMotion.ts:20](/Users/heguangwei/project/gitee/react-admin-template/src/components/AppTable/table/motion/useTableMotion.ts:20)
负责 SDK 的业务身份和绘制时点，
[listMotion.ts:17](/Users/heguangwei/project/gitee/react-admin-template/src/capabilities/motion/listMotion.ts:17)
负责短暂视觉资源与成本，
[useAsyncAction.ts:5](/Users/heguangwei/project/gitee/react-admin-template/src/components/AsyncButton/useAsyncAction.ts:5)
只为没有既有 pending 所有者的 callback API 提供执行反馈。
这比页面各写一套或接管数据事务更清楚。

建议把“完整统一交互”落到一条可反驳的实际旅程：按钮→请求→数据提交→局部反馈→失败重试，
并覆盖一次冷加载、一次内容/高度延迟和一次连续中断。
性能敏感的公共行为在首版就检查真实支持规模下的准备工作量；不要求每个 CSS 修改做完整 profiling。
加载复用也要尊重整页与表格遮罩的职责差异，不能仅为去重把整页占位硬塞进局部视口。

维护位置：产品源码、已有浏览器测试与性能检查；Skill 中现有交互/性能/验证指导基本足够。
行为评测应覆盖“测试很多但旅程遗漏”和真实异步布局，而不是追加一遍同义原则。

### 中优先级：精简要检验所有权和调用契约，不能用净减行数下结论

“审查暂存区前端代码”曾以净减 31 行、再减 54 行和大量测试通过汇报精简；
之后从抽象与工程思维复查，才复现上传期间切会话导致发送目标改变、旧完成清空新草稿。

最终结构已经纠正：
[message-submission.ts:8](/Users/heguangwei/project/xiejing/useless-space-pc/apps/user-web/src/runtime/message-submission.ts:8)
由用户命令派生展示/网络投影；
[activity-runtime.ts:70](/Users/heguangwei/project/xiejing/useless-space-pc/apps/user-web/src/store/modules/activity-runtime.ts:70)
在上传前固定活动/账号/模式；
[use-activity-message-submission.ts:27](/Users/heguangwei/project/xiejing/useless-space-pc/apps/user-web/src/views/chat/hooks/use-activity-message-submission.ts:27)
隔离旧视图回调和新提交锁。普通业务调用不用了解数据库关联细节。
真实的后续变化检查可以是“新增附件字段”：命令和投影有可发现的所有者，不需在视图/网络/乐观状态分别补规则。

判断：这些必要抽象应保留。优先把已有精简评测扩展为“调用方催促进一步减代码”时仍检验快照、
身份和生命周期，不能奖励删行或拆函数数量。现有 Skill 已明确这点，不需要新建一套架构禁令。

### 中优先级：生成式 API 的本地验证应与已有 CI 契约一致

真实构建失败记录指出：服务端移除 login 后，本地旧生成文件仍能支持旧访问，
CI 在 test 模式重新生成才暴露组件/测试未同步。

当前 [GitLab CI:14](/Users/heguangwei/project/xiejing/useless-space-pc/.gitlab-ci.yml:14)
已有冻结安装后 `pnpm run api`，再类型检查/构建，且 `API_CODEGEN_MODE=test`。
保障已经存在。针对触及外部 DTO 的工作，应在隔离副本复用相同生成入口，再检查真实消费者；
不需要第二套 schema validator，也不能只依赖本地缓存类型。
无关本地样式调整不必每次连接 Swagger。

本轮未重新生成或访问真实 API，因此这条是已发生的流程缺口与现有维护入口确认，
不是又发现一处当前类型错误。

### 中优先级：保留可复核的关键性能证据

Flutter 的边界设计与实验方法符合要求：
[预览历史状态:98](/Users/heguangwei/project/xiejing/intelliland-app/lib/features/activity/presentation/runtime/runtime_preview_experience.dart:98)
保留“最后可见时是否让位”这一不能从当前 mode 完全推导的记忆，
[layer:172](/Users/heguangwei/project/xiejing/intelliland-app/lib/features/activity/presentation/runtime/runtime_conversation_layer.dart:172)
继续用现有安全区/token 计算几何，不缓存像素或引入额外原生协议。
后续调整摘要条高度仍由原 owner 处理。

原任务做了固定尺寸/保持合成/撤回原实现的对照，并在正式优化中保留玻璃修正，
区分 trace、无 trace、首次展开和重复开合，未夸大为 120Hz 全通过。
本轮 61 项 widget 检查也通过。

但 [性能报告 §17](/Users/heguangwei/project/xiejing/intelliland-app/docs/superpowers/verification/2026-09-28-runtime-performance-audit.md:632)
所指 `build/runtime-audit-20260928/` 已不存在。
现有文字说明和复跑步骤仍在，但无法用该位置的原始 trace 重算当时的 51–59ms / 13–15ms。

建议在已有验证记录/产物保存机制中保留脱敏原始样本或可获取的 artifact 地址、输入条件与校验值。
不必把全部 trace 提交 Git，也不必新建证据平台。缺失资料未恢复前，将历史数值标作“原任务记录，
本轮未重算”。

## 维护优先顺序

1. **接通版本验证**：先按既有维护流程完成候选版安装/发布验收，再积累真实调用证据。
   不自动修改当前活跃任务的技能安装；后续记录实际加载入口及必要 reference 的指纹。
2. **修负责代码**：删除 API 生成脚本的无效写入包装；完成正在进行的 React 入场/加载修复后，
   在最终 revision 复跑已有相关浏览器检查。
3. **补真实行为评测**：主链路根因与补偿、连续上下文切换、延迟布局/懒加载和工作量边界；
   优先扩展现有用例，并使用能失败的产物检查，避免再加一批只有自述的题目。
4. **复用已有命令和文档**：生成契约走现有 CI，来源漂移走现有指纹，性能资料走现有记录与产物保存。
   主入口不再重复已有指导；只有前向评测证明确实存在决策缺口，才在最相关专题补条件。

这些是复查后的具体待办，本轮没有实施技能规则变更、产品修复、安装、提交或发布。

## 本轮实际验证

| 检查 | 实际结果 | 边界 |
| --- | --- | --- |
| React 侧栏、PageForm、异步反馈、表格动效、动效成本 | 6 文件 / 77 项通过 | 固定副本，Chromium；不是设备帧率 |
| React 页面/表格入场与加载 | 3 文件 / 14 项通过 | 同一副本中正在修复的实现；不是另一对话最终 revision |
| Vue 会话、API 错误、来源漂移拒绝 | 3 文件 / 14 项通过 | Node/jsdom；来源测试含临时违规注入 |
| PC 完成队列、历史、发送快照、上传 | 5 文件 / 50 项通过 | Chromium、真实 SQLite worker 与 mock 传输；不是线上账号 |
| Flutter 预览几何、转场与身份 | 2 文件 / 61 项通过 | widget runner；不是 iOS 原生性能 |

合计 **19 个文件 / 216 项通过**。日志与命令元数据：
[verification.json](verification.json)、
[react-targeted.log](react-targeted.log)、
[react-entrance-snapshot.log](react-entrance-snapshot.log)、
[vue-targeted.log](vue-targeted.log)、
[pc-targeted.log](pc-targeted.log)、
[flutter-targeted.log](flutter-targeted.log)。

React 首次启动因本轮副本主动排除所有 .env 文件而失败，未选入测试；
按配置契约显式传入非敏感的 VITE_PUBLIC_PATH=/ 和 VITE_PORT=8848 后重跑通过，
没有修改产品校验或测试断言。原始失败见 [react-startup-missing-env.log](react-startup-missing-env.log)。

## 证据与未验证范围

- React HEAD 为 a0cc6b95，Vue 为 975206a5；它们都有未提交工作，
  不能只用 HEAD 标识本轮输入。[snapshot-manifest.json](snapshot-manifest.json)
  记录实际复制文件的 SHA-256 和执行后变化。Vue 输入未变；
  React 的 usePageMotion、相关测试/样式等文件在别的任务中继续变化，本轮结果绑定副本。
- PC HEAD 为 e5af8a38，Flutter 为 bbd3268a；所列受检实现与测试在执行后均与各自 HEAD 字节一致。
  PC 导航条有无关工作区修改。生产源码未改动。
- React/Vue 依赖使用现有 node_modules，包缓存未独立冻结；PC/Flutter 使用现有仓库环境。
  临时副本不是永久归档，保留了输入指纹，不声称整个私有产品工作树可从技能仓库重建。
- 未全面审查四个仓库所有组件、全部源码迁移能力、权限架构和其他并行任务。
  侧栏和表单的重点检查也不代表触屏、全部浏览器或辅助技术矩阵已覆盖。
- 未重跑真实账号、最新 OpenAPI 生成、生产构建/发布、远端 CI、Docker、Windows，
  也未进行新的物理设备性能采样或恢复已消失的 Flutter trace。
- 未让精简版执行以上真实任务，未做新旧版或技能共存的因果比较。
  45 例报告的结果与限制继续独立保留，不用本轮 216 项产品测试替代技能行为评分。

