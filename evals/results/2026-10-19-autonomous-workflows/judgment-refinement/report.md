# 通用判断与自主验证补强

本轮已将焦点连续性、权威确认与后续同步、原始性能基线、文档与代码对齐接入现有指导，
并完成 27 次独立生成采集。最终指导下，焦点、购买确认分离和邀请页迁移已有实际代码及
真实运行证据；**原始性能基线采集和文档验收状态同步仍有遗漏，不能宣布四项自主验收全部稳定通过。**

## 修改的判断与执行条件

- 结构变化时分别判断节点身份与交互状态。由改变结构的所有者维持实际焦点/选择位置；
  连续键盘操作应不靠测试重新聚焦，异步完成应尊重用户已移开的焦点。
- 权威效果确认后，确认呈现应独立于后续读取、渲染或导航。沿最终消费者检查复合完成
  结果；已有测试未覆盖重要组合时补写并执行验收，复用原有 transport 和状态机制。
- 成本变化在实施前取得原始样本，遗漏时从原始快照的隔离副本重建；最终正确版本再以
  可比条件采样。布局次数、动画呈现和输入延迟分别陈述。
- 从最终定义核对重要可调用契约、注入参数、内联所有者及真实调用；同步两类图示和
  已执行验收。概念标签与拟议契约保持明确，不要求枚举全部私有 helper。

入口负责触发和执行时点，细节修改在已有专题中。没有加入看板专用算法、购买专用状态机、
固定架构层数或额外审批流程。最终差异见 [指导补丁](verification-guidance.patch)。

## 仅给需求、项目与技能的复测

原始请求是完成连续看板排序、报价购买、共享功能开关插件、团队邀请页。生成方没有得到
本聊天、失败诊断、预期修法、评分项、oracle 或参考实现，没有宿主反馈修复提示。
模型自行从项目测试得到的失败反馈属于其正常工作过程，原始失败和修复均保留。

修改前后两组都加载各自的技能，均使用 candidate 模式；旧指导组不是无技能 baseline。
主要比较为 `cli-before` 与 `verified-after`/`verified-repeat`，生成与盲评分固定为
`gpt-5.6-terra`、medium。模型家族相关性及少量场景的限制仍在。

- [原始用例](frozen-cases-v3.yaml)、[实验配置](plan.json)、[最终指导字节](verification-guidance/hashes.json)。
- 四个项目的 58 份文件在旧/新输入中一致，见 [夹具核对](execution/fixture-byte-check.json)。
  团队邀请页最终输入位于 `frozen-fixtures-v2/live-invites`；较早的冻结副本没有用于生成。
- CLI 0.145.0，Node 22.22.2，Playwright 1.62.1，Chromium 151.0.7922.34；两组均使用与当前
  工作区一致的 `danger-full-access`，关闭用户配置、插件和额外技能发现，避免 HTTP/浏览器
  被沙箱阻断。原始采集脚本未修改，只在临时副本改变执行权限。

## 实际结果

| 检查 | 修改前指导 | 当前指导的实际产物 | 结论 |
| --- | --- | --- | --- |
| 焦点与交互连续性 | 看板 6 项公开及 2 项向上操作检查通过；邀请页隐藏检查 3/4，异步完成抢走已移开焦点 | 两份看板各 6 项公开及 2 项隐藏检查通过；邀请页新增 4 项自身测试，合计 7 项公开及 4 项隐藏检查通过 | 已有运行与迁移证据；旧指导也具备部分能力 |
| 购买确认与刷新失败 | 原 4 项 HTTP、3 项浏览器检查通过；确认后的读取失败反例仅 1/2 通过 | 原 4+3 项及 2 项隐藏检查全部通过；原生购买直接呈现独立确认页，报价在后续 GET 读取 | 行为与责任边界已落地；隐藏反例是宿主补查，不算模型自行新增的回归 |
| 原始性能基线 | 只有改动后样本 | 第二轮指导曾在首个实现改动前得到 655 次布局，最终正确版本为 23；当前指导的两次全新采集都只有改动后样本 | **当前自主基线采集仍未达标**，重复运行不能替代原始对照 |
| 文档与代码 | 首轮新指导仍出现不存在的 `disposeBoard`、`handlePurchase` 及遗漏的注入参数 | 当前购买页的重要声明与调用一致；插件补充复核未发现重要签名或流程冲突；看板仍未完整登记已执行验收，重复样本还误称改代码后的缺依赖尝试为 pre-change | 关键契约改善，**验收状态和证据时点仍未完全对齐** |

可复核产物：

- [当前购买实现](verified-after/autonomous-live-runtime/autonomous-live-runtime/candidate/artifacts/server/app.mjs)
  与[设计](verified-after/autonomous-live-runtime/autonomous-live-runtime/candidate/artifacts/docs/quote-purchase-design.md)。
  `renderQuotePage(services, quote, locale, canBuy)`、`renderConfirmationPage(locale)` 与真实定义一致。
- [邀请实现](verified-after/autonomous-live-invites/autonomous-live-invites/candidate/artifacts/src/app.mjs)、
  [自主新增检查](verified-after/autonomous-live-invites/autonomous-live-invites/candidate/artifacts/tests/invites-interactions.spec.mjs)
  覆盖接受后统计失败、连续键盘操作、请求期间编辑和命令失败重试。
- [当前看板执行索引](verified-after/autonomous-live-board/autonomous-live-board/candidate/execution-index.json)
  中首个实现修改为事件 39，首次实际成本样本在 47；
  [重复索引](verified-repeat/autonomous-live-board/autonomous-live-board/candidate/execution-index.json)
  则为修改 41、样本 46。二者都不能算原始基线。
- [第二轮有基线的原始执行索引](final-after/autonomous-live-board/autonomous-live-board/candidate/execution-index.json)
  为样本 50、首个实现修改 53、最终正确版本样本 75。80 卡片、1100×760、8 次操作、减少
  动态效果条件一致；655→23 支持该场景布局工作减少，不能证明动画帧率、线上延迟或真机表现。
- [插件补充复核](execution/flags-artifact-review.json)核对了真实源码、类型和消费者及最后交叉搜索。
  包构建、工作区消费、SSR 开发更新、诊断及包导入检查通过；未验浏览器 HMR、全部诊断
  分支或打包后完整 Vite 构建。不能扩大为全兼容、全部运行行为已验收。

有效的新实现都先保存了含功能步骤、支持契约、架构与数据流两种文本图的技术设计。
`document-order.json` 保存写入顺序；所检查的图均为文本图，做语义复核，没有 Mermaid
语法待修项，也不宣称完成浏览器图形排版验收。

## 保留的失败、评分限制与采集问题

三轮指导均保留：`after-guidance` 是首轮，`final-guidance` 是第二轮，
`verification-guidance` 是当前版。目录名不代表整轮已经达到交付质量门槛。
首轮只有后置性能样本；第二轮补上一次真实基线，但购买仍失败；当前购买路径消除了对
二次读取的依赖，基线遗漏则在同配置重复中再次出现。没有修改生成代码来让反例通过。

27 份采集的原始盲评分为 15 target、4 fail、8 invalid，见 [完整结果](outcomes.json)。
该分数不能替代上表的实际复核：例如早期 `gpt-5.6-sol` 看板虽为 target、原 6 项检查通过，
新增向上操作两项均失败；当前看板 target 也没有补齐基线。

8 份 invalid 单列，不计为实现质量失败或成功：

- 三份生成被模型容量错误中断；其后宿主检查的结果不能替代完整自主交付。
- 四份使用桌面提供、但当前 CLI/account 不支持的模型名；没有产生有效生成。
- 当前插件重跑生成与全部公开检查完成，但一个纯文件名枚举的复合命令触发读取审计
  unknown。原始 invalid 保留，见 [审计记录](verified-repeat/autonomous-live-flags/manifest.json)。
  主代理与补充复核确认命令只有 `pwd`、`rg --files`、`sed`、`find` 元数据枚举；补充的
  代码/文档检查不将它改写为自动审计有效，也不把它归为产品代码缺陷。

主要严格对照因此有三项当前指导有效采集；插件只提供补充的实际产物与运行证据。
原始模型的四份有效样本另列，不能与更换模型后的结果混成一对。模型配置调整见
[首次调整](capacity-adaptation.json)和 [CLI 支持模型配置](cli-runtime-adaptation.json)。

## 验证、安装与范围

仓库校验为 71 项静态用例，官方技能校验通过；91 项既有脚本回归通过。
没有修改核心采集/评分脚本，没有运行完整 71 例行为库，也未证明其他模型、浏览器、
真机和真实后端的稳定效果。所有购买和邀请均在本地夹具与 HTTP 替身上运行。

最终指导保留为可恢复的本机开发预览；公开 VERSION、tag 和远端均未改变。
具体激活状态、哈希和完整备份见 [安装回执](installation-receipt.json)。
本轮交付是通用指导修订及诚实的行为证据，不能将当前仍有遗漏的自主验收写成全部完成。
