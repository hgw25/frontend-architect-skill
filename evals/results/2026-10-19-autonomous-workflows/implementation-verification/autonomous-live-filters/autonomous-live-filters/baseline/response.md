已完成商品页和订单页筛选功能。

主要实现：

- 商品：关键词、分类、发布状态，Apply 后生效，Reset 恢复默认。
- 订单：关键词、日期范围、订单状态即时筛选，非法日期显示关联错误且不改变结果或 URL。
- URL 持久化并保留无关参数；支持刷新及浏览器历史恢复。
- 处理异步竞态、查询失败提示和准确结果数量。
- 改善窄屏、长标签、键盘焦点和 200% 文本缩放布局。

修改文件：

- [src/app.mjs](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-filters-baseline-1t27mfoa/src/app.mjs)
- [src/style.css](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-filters-baseline-1t27mfoa/src/style.css)

验证结果：

- 所有模块语法检查通过。
- 查询组合检查通过。
- `git diff --check` 通过。
- `npm run check` 无法完整运行：当前沙箱禁止测试服务器监听端口，并禁止 Chromium 创建所需的系统 Mach port，均为环境权限错误。