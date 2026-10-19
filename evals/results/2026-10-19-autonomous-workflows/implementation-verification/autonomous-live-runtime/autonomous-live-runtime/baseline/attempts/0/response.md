已完成商品报价页与购买流程。

主要实现：

- 报价缓存按租户、用户、商品隔离，并根据 `validUntil` 自动过期。
- 购买权限完全由服务端会话决定，查看者无法购买。
- 购买成功只清除当前用户报价，且处理了并发请求重新写入旧缓存的问题。
- 敏感报价字段不会发送到浏览器。
- 商品描述安全过滤，保留 `p/strong/em` 格式。
- 支持 `en-US`、`fr-FR` 价格格式。
- 支持无 JavaScript 原生购买和 JavaScript 状态增强。
- 增加响应式商品页样式、可访问状态提示及 CSP 等响应头。
- 上游报价和购买异常返回脱敏的 `502`。

修改文件：

- [server/app.mjs](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-runtime-baseline-cjzomte4/server/app.mjs)
- [src/app.mjs](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-runtime-baseline-cjzomte4/src/app.mjs)
- [src/style.css](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-runtime-baseline-cjzomte4/src/style.css)

验证结果：

- JavaScript 语法检查通过。
- `git diff --check` 通过。
- 无网络处理器测试通过，覆盖缓存、权限、购买失效、本地化、内容安全、错误脱敏和并发失效。
- 官方 Node 与 Playwright 套件已尝试运行，但当前沙箱禁止监听 `127.0.0.1`，均在启动测试服务器时因 `listen EPERM` 中止，未进入断言阶段。