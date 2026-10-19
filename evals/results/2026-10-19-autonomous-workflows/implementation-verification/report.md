# 设计思想的实现型验证

本轮验证既有思想是否进入架构取舍、实际调用链和运行行为。技能指导保持不变，补充
八组短请求实现用例、无原聊天的后续需求接手，以及真实 HTTP、Chromium 和包消费者证据。
29 次生成采集及独立评分已结束。已有实际落地与自主修复证据，但焦点复测失败、购买确认被后续失败掩盖、原始性能基线缺失和文档符号漂移表明，不能宣称全部思想已稳定达到最高标准。

## 输入与隔离

- 来源提交仍为 `250883b4f7e2968ebf7ac2cb63b9c686fda316ab`（v0.5.0）；本地未发布指导
  快照为 `d7b6cc9ad0af`，与前一轮安装预览一致。15 份入口、专题和元数据与冻结输入、当前源码及已安装预览字节相同，
  见 [字节核对](execution/guidance-byte-check.json)。本轮没有增加方法提示或修改指导。
- 原始请求分别是整理导出、完成搜索、完成资料保存、完成共享插件、修复等待、完成双页
  筛选、完成连续排序、完成报价购买，详见 [冻结用例](frozen-cases.yaml)。
  生成方只得到请求、已有项目/消费者契约和对应条件的技能，不得到本聊天、观察项、失败项、
  维护者参考方案或另一组输出。已有公开测试属于项目契约。
- baseline 不含技能；candidate 只含隔离副本的入口和按需参考。保留执行事件、读取审计、
  保护文件核对、完整 diff、源码产物与宿主检查。复核采用独立上下文，生成和评分均为
  `gpt-5.6-sol` / medium，CLI 0.145.0；同模型相关性限制仍存在。
- 初始采集器的 `workspace-write` 阻止部分 HTTP 监听和 Chromium 启动。宿主复跑证明的
  运行结果不能写成生成方已自主完成。为补该缺口，单独增加与本工作区权限一致的看板和
  插件对照，唯一驱动差异见 [执行权限补丁](execution/host-runtime-driver.patch)，
  [配置](execution/host-runtime-source.json)。两种环境分别报告，不合并成质量均分。

## 已有的架构与代码证据

| 思想/判断 | 实际落点 | 运行与演进证据 |
| --- | --- | --- |
| 内聚操作、信息隐藏、函数与副作用边界 | `exportSelection(rows, write)` 拥有资格、意图快照、编码和发送；工具栏/快捷键保留兼容名称，调用方不维护阶段协议 | 原 10 项消费者检查通过；异步编码接手仅改操作所有者，两入口未改，candidate 原检查及新增检查共 16 项通过。[首轮代码](autonomous-live-export/autonomous-live-export/candidate/artifacts/src/export-selection.mjs)、[接手 diff](evolution/candidate/autonomous-export-async-encoding/candidate/changes.diff) |
| 生命周期闭包、执行与发布分离、最小状态 | `createSearch(fetchUsers)` 持有草稿、已提交值、请求身份和 dispose；`run` 统一 DTO 映射与当前结果发布，retry 不读取新草稿 | 8 项检查通过，覆盖迟到成功/失败、重试、独立快照和 dispose 后操作。[代码](autonomous-live-search/autonomous-live-search/candidate/artifacts/src/search.js) |
| reducer、乐观投影与权威确认、外部数据边界 | `saveReducer` 区分 confirmed/optimistic/error；提交 ID 决定确认顺序，API 校验 HTTP 状态与响应结构 | TypeScript 和 7 项组件检查通过；宿主另跑 3 种完成排列，两组均通过。[表单](autonomous-live-profile/autonomous-live-profile/candidate/artifacts/src/ProfileForm.tsx)、[API](autonomous-live-profile/autonomous-live-profile/candidate/artifacts/src/api.ts)、[排列检查](execution/profile-permutations-candidate.log) |
| Atomic Design/组合、AHA、业务归属、URL 权威与内容约束布局 | 复用 `ui.mjs`；商品保留草稿/Apply，订单即时生效；URL codec 和异步发布独立于页面语义，未强制目录模板 | 首轮 candidate 在仅修正测试选择器后 5/5 浏览器检查通过，生产代码未改。库存接手改商品控件、商品 codec 和 `queryProducts`，订单函数、基础控件和请求发布策略未改；7/7 浏览器及 10 项 Node 检查通过。[接手 diff](evolution/filter-stock/autonomous-filter-stock-evolution/candidate/changes.diff) |
| FLIP、单一业务顺序、资源归属与命令排序 | `reorderCard` 先读当前视觉位置再取消旧动画，移动真实 DOM 后映射新旧几何；动画、拖动与合并串行保存分别有所有者 | 首轮 candidate 6/6 真实浏览器检查通过，包含连续输入、拖动、焦点、系统偏好、退出和失败重试。[实现](autonomous-live-board/autonomous-live-board/candidate/artifacts/src/app.mjs) |
| RAIL 与更新到显示的成本判断 | 实际移除逐卡写入后读布局的路径，稳定节点和批量读写减少布局工作 | 宿主对相同 80 卡片、1100×760 视口、8 次操作顺序采样三轮：起始实现布局次数每轮 655，两个生成实现每轮均为 23。[原始数据](browser-costs.json)。这是减少动态效果条件下的布局证据，不能证明动画帧率，也不能归因于技能独有收益。初始生成方没有自主完成前后测量。 |
| 运行环境/缓存所有权、渐进增强、信任边界与成熟能力复用 | `createApp(services)` 复用平台会话、授权、时钟和安全描述；缓存按租户/用户/SKU 隔离并处理过期、购买失效；客户端仅增强原生表单 | 两组均通过原 4 项真实 HTTP 与 3 项 Chromium 检查；但新增“已确认购买遇到报价刷新失败”反例均失败，不能判为完整达标。[代码](autonomous-live-runtime/autonomous-live-runtime/candidate/artifacts/server/app.mjs)、[技术设计](autonomous-live-runtime/autonomous-live-runtime/candidate/artifacts/docs/product-quote-design.md) |
| 根因与恢复分开、身份关联与事实合并 | `receive` 先合并已存快照，再从 merged message 更新完成关联，保留显式 recover | 7 项重放检查通过，实际症状消失，未通过周期刷新掩盖。[代码](autonomous-live-completion/autonomous-live-completion/candidate/artifacts/src/ledger.mjs) |
| 契约先行、公共包消费者、宿主生命周期、数据最小化 | `featureFlags` 使用 Vite 的 `resolveId/load/handleHotUpdate` 与 `addWatchFile`；`loadExposedFlags` 只投影白名单；Vite 拥有监听与模块生命周期，插件没有再建 watcher/cache 框架 | 权限一致组自行完成 `npm run check`，真实构建、类型、开发更新、诊断、tarball 安装全部通过，另有 3 项契约测试；宿主复跑再次通过。[代码](host-runtime/autonomous-live-flags/autonomous-live-flags/candidate/artifacts/packages/plugin/src/index.ts)、[四步设计及两种图](host-runtime/autonomous-live-flags/autonomous-live-flags/candidate/artifacts/docs/feature-flags-plugin-design.md) |

导出、搜索、资料、筛选、看板和报价的首轮 candidate 均先落盘设计再改源码；原始事件
顺序保存在各组 `write-order.json` 和 `document-order.json`。相关设计具备功能实施步骤、
支持函数/类型与架构/数据流两种视图；筛选的 Mermaid 实际解析通过，其余主要使用可编辑
ASCII 图并由主代理核对含义。已证实的局部 ledger 修复沿用轻量路径，不强加设计文档。

库存接手开始时已有首轮设计，最终更新了同一份合同和图示；文档更新事件晚于源码修改。
该场景证明沿既有边界演进，不能记为另一次“新设计先行”成功。

## 复测与自主验证闭环

| 采集 | 实际结果 | 能支持的结论 |
| --- | --- | --- |
| 修正选择器后重新生成筛选 | baseline 3/5，candidate 5/5；candidate 另有 3 项 Node 测试通过 | 无额外方法提示仍生成 URL/草稿/即时生效分工与实际布局；无技能样本的公开 URL 参数不一致保留为失败。 |
| 排除报告资产后重新生成看板 | baseline 6/6，candidate 5/6；candidate 的键盘焦点缺陷在未改源码的副本重复两次均失败 | 名称与结构选择不能保证所有交互不变量落实，不能把首次 6/6 当成稳定最高标准。[复现](execution/board-clean-focus-reproduction.log) |
| 与当前权限一致的看板新上下文 | baseline 与 candidate 最终均 6/6；candidate 自己先运行出焦点失败，再修正源码并两次运行到 6/6，宿主复验也通过 | 没有外部诊断或修复提示，能够用实际消费者检查完成自主修复；首次错误仍保留。[逐次命令](host-runtime/board-generator-checks.json) |
| 与当前权限一致的插件新上下文 | 两组自行完成全套检查，宿主复验均通过 | 证明成熟宿主能力、公开包契约和真实分发消费者进入实际实现及自主验证。 |

权限一致的看板仍没有测量**修改前原始实现**：首次有效采样已来自改动后的代码（布局
15 次），修复焦点后为 23 次。这些数据证明运行和修复发生，不能代替原始实现到新实现的
性能基线。此前的 655→23 是宿主另行取得的证据。RAIL 的完整自主定位与前后比较仍未达标。

## 纠错与证据边界

1. **端口接线。** 新浏览器配置最初在 worker 导入时重新分配端口，参考实现无法连接。
   改为沿用环境传递的端口；错误日志保留为校准失败，不计模型失败。
2. **筛选选择器。** `getByLabel(..., exact)` 对包裹原生 select 的文本匹配过窄，可访问树
   实际给出了正确 combobox 名称。初次校准给参考实现补 aria-label 掩盖了该问题。
   改用 role/name，未修改旧 candidate 代码即通过 5/5；新输入另行冻结、重新生成。
   无技能首轮另有 `q` 与公开 `p_q/o_q` 消费者契约不一致，不能被选择器修正掩盖。
   见 [原始诊断与修正边界](adjudications/filter-selectors.json)。
3. **评分误报。** 资料页首轮评分把“最新提交失败后，旧成功更新最新确认回退值”视为
   覆盖新编辑；baseline 实际也有同一行为。补跑排列后，两组均符合原契约。仅澄清评分
   条件后重新盲评，两组通过；原始 fail、复核和新评分分别保留。
   见 [复核记录](adjudications/profile-contract.json)。
4. **评分容量。** 初始看板夹具遗漏 `.gitignore`，生成的报告资产进入 diff，使 baseline
   评分输入超过 CLI 限制。这是评分采集限制，不是实现 verdict。补齐既有 Playwright
   产物忽略约定后另行采集；原 4 MB 输入和失败日志未覆盖。
5. **环境阻塞与性能声明。** 看板初始评分将生成沙箱 EPERM 也判为实现失败；宿主随后
   6/6 通过，不能接受该因果解释。但“已移除性能问题”的比较性声明缺少生成方前后测量，
   这一证据缺口保留。宿主三轮测量证明实际布局改善，不能倒填为自主验证。
   见 [分项复核](adjudications/board-evidence.json)。
6. **插件等待。** 开发更新检查补充监听注册等待和事件超时，断言不变，新输入单独记录。
   原脚本本轮最终也通过，不能据此宣称存在必现的监听缺陷。600 秒补充采集的 baseline
   生成超时而宿主检查通过，仍记 invalid，不算质量失败或通过。
7. **文档精确性。** 权限一致插件的设计称私有 helper 为 `resolveSource`，源码实际是
   `sourcePathForRoot`；报价设计的部分私有签名也省略或简化了实际参数形状。公开调用与
   运行通过，仍不能称技术文档已与实现完全对齐。这些原产物未被维护者偷偷修正。
8. **已提交结果与后续读取。** 对两组报价实现增加隐藏的宿主反例：购买服务已确认，
   仅让随后的报价刷新拒绝。正常刷新对照通过，而失败分支均隐藏购买确认，仅返回报价
   不可用页（每组 1/2）。candidate 的 JSON 路径保留确认，原生 HTML 路径却没有遵守
   同一规则，也违背其设计中的“已确认购买不依赖刷新”说明。见
   [反例与依据](adjudications/runtime-receipt.json)、[candidate 原始日志](execution/runtime-receipt-candidate.log)。
   源码未改；原评分未倒改为包含这一新增检查，最终复核结论保留该实质缺口。
   后续案例审计条件已记入 `grading-cases-v3.yaml`，用于未来复测，不冒充本次原评分条件。

## 可复核范围

本轮不证明所有场景、模型或平台均达到同一标准。真实浏览器范围为 Chromium；资料页
组件检查主要是 jsdom；报价是本地 HTTP 平台，排序保存是 HTTP 替身，均不代表生产后端。
文字放大检查是 CSS 字体 200%，没有冒充浏览器 UI 缩放、真机或辅助技术验收。未运行完整
70 例行为库；91 项确定性脚本回归与官方技能校验已通过。

所有采集的最终状态、配置和分来源验证见 [outcomes.json](outcomes.json)；
原始指导、输入夹具和第二轮需求均在本记录冻结保存。复测使用既有
`scripts/run_behavior_evals.py` 与 `scripts/score_behavior_evals.py`，向新结果目录输出；
权限一致批次须同时应用已保存的一行驱动补丁，不覆盖历史结果。

复现时从记录的来源提交建立临时副本，把 `frozen-guidance/SKILL.snapshot.md` 还原为
`SKILL.md`，复制其 references 和 `openai.yaml`（后者放入 agents/）。按需要从
`frozen-fixtures/`、`frozen-fixtures-v2/` 或 `host-runtime/frozen-fixtures/` 复制对应项目，
并使用相应的冻结 cases 文件与 manifest 内的 capture_contract 核对字节。
用固定模型与 medium、`--case <id> --mode both --results-dir <新目录>` 运行生成和评分。
后续需求使用 evolution 中冻结的首轮仓库及 request，不能把未来规则提前放入首轮。
原始评分、澄清后的评分和补充 oracle 分开复现；CLI、模型或权限变更形成新批次。
