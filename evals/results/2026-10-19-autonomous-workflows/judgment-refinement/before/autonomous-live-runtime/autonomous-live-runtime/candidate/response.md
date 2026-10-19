已完成商品报价页与购买流程。

- 实现按租户、用户、SKU 和有效期隔离的报价缓存，购买成功后精准失效。
- 服务端强制登录与购买权限校验，阻止浏览器字段绕过授权。
- 安全输出商品描述与公开报价字段，避免私密数据和不可信 HTML 泄漏。
- 支持 `en-US`、`fr-FR` 价格格式及无 JavaScript 原生购买。
- 增加响应式商品页、窄屏布局、键盘焦点、加载/成功/失败反馈和重复提交保护。
- 购买成功后即时展示刷新后的报价。

主要文件：

- [server/app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-runtime-candidate-lcw0l7rj/server/app.mjs)
- [src/app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-runtime-candidate-lcw0l7rj/src/app.mjs)
- [src/style.css](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-runtime-candidate-lcw0l7rj/src/style.css)
- [技术设计](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-runtime-candidate-lcw0l7rj/docs/product-quote-design.md)
- [新增浏览器测试](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-runtime-candidate-lcw0l7rj/tests/product-quote.spec.mjs)

验证结果：

- 服务端测试：4/4 通过
- Playwright Chromium：5/5 通过
- JavaScript 语法检查通过
- `git diff --check` 通过

未执行部署及非 Chromium 浏览器验证。