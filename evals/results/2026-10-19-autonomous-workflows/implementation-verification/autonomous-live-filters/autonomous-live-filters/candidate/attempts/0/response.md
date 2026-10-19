已完成商品页和订单页筛选功能；核心逻辑与单元验证通过，浏览器验收因沙箱权限限制未能运行。

实现包括：

- 商品筛选草稿、Apply/Reset、分类与发布状态、URL/历史恢复。
- 订单筛选即时生效、30 天默认日期、日期区间校验。
- 保留无关 URL 参数。
- 查询错误提示及 latest-wins 竞态保护。
- 原生键盘操作、窄屏/长标签/200% 字号自适应布局。
- 独立的筛选状态与异步请求模块。
- 完整技术设计：[filtering-design.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-filters-candidate-juiamxw2/docs/filtering-design.md)
- 页面实现：[app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-filters-candidate-juiamxw2/src/app.mjs)
- URL/校验契约：[filter-state.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-filters-candidate-juiamxw2/src/filter-state.mjs)
- 请求竞态控制：[latest-query.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-filters-candidate-juiamxw2/src/latest-query.mjs)

验证结果：

- Node 单元测试：7/7 通过。
- 所有源模块语法检查通过。
- `git diff --check` 通过。
- `npm run check` 启动时，沙箱拒绝监听 `127.0.0.1`（`EPERM`）；直接启动 Chromium 也被 Mach-port 策略拒绝，因此现有 Playwright 用例未实际执行。
- `.frontend-architect` 和所有指定评测脚手架文件均未修改。

本次使用了工作区本地 frontend-architect Skill，依其要求先建立技术设计，并据此划分 URL 状态、页面交互和异步发布职责。