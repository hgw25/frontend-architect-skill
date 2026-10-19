已完成商品页和订单页筛选功能。

主要实现：

- 商品关键词、分类、发布状态筛选，修改后点击 Apply 生效
- 订单关键词、日期范围、订单状态即时筛选
- Reset 恢复各页面默认条件
- URL 同步筛选状态并保留无关参数
- 支持刷新及浏览器前进/后退恢复
- 日期错误提示及无效日期保护
- 请求失败提示与异步竞态保护
- 响应式布局、键盘焦点和 200% 文本缩放适配

修改文件：

- [src/app.mjs](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-filters-baseline-rng3mneg/src/app.mjs)
- [src/style.css](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-filters-baseline-rng3mneg/src/style.css)

验证情况：

- `node --check` 通过
- `git diff --check` 通过
- `npm run check` 已尝试，但当前沙箱禁止监听 `127.0.0.1`，测试服务器报 `EPERM`，因此无法在此环境执行 Playwright 端到端测试
- 指定的评测配置和测试文件均未修改或读取其内容