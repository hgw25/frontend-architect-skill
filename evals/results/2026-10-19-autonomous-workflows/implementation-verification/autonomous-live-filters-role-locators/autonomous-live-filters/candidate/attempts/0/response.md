已完成商品页和订单页筛选功能。

主要实现：

- 商品筛选支持关键字、分类、状态、Apply、Reset，以及 URL/浏览器历史恢复。
- 订单筛选支持关键字、状态、日期范围即时生效；无效日期显示关联错误且不修改结果或 URL。
- 保留无关 URL 参数。
- 使用请求代次防止旧响应或旧错误覆盖最新结果。
- 查询失败显示可访问的 alert。
- 改善窄屏、长标签、键盘操作及 200% 字号布局。
- 技术设计记录在 [filtering-design.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-filters-candidate-10thsw50/docs/filtering-design.md)。

核心文件：

- [app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-filters-candidate-10thsw50/src/app.mjs)
- [filters.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-filters-candidate-10thsw50/src/filters.mjs)
- [style.css](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-filters-candidate-10thsw50/src/style.css)

验证结果：

- 3 项 URL、默认值及日期规则测试通过。
- 新增模块语法检查通过。
- `git diff --check` 通过。
- `npm run check` 未能运行浏览器用例：当前沙箱禁止监听 `127.0.0.1`，且禁止 Chromium 注册所需的系统服务。已提供无服务器浏览器检查脚本，供正常环境复验。
- 所有指定只读 harness 文件均未修改。