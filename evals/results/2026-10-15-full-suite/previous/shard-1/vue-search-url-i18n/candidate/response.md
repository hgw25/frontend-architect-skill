已完成商品搜索页：

- URL 统一管理 `q`、`page`、`locale`，支持初始化、分享、刷新及前进/后退；新查询重置到第 1 页。[searchUrlState.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-qvvi0l7i/src/searchUrlState.ts:1)
- 使用请求身份校验与 `AbortController`，旧请求的成功或失败都不会覆盖最新状态，并清理导航监听。[SearchPage.vue](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-qvvi0l7i/src/SearchPage.vue:48)
- 为 `en-US`、`fr-FR` 提供本地化消息，使用 `Intl.PluralRules` 和 `Intl.NumberFormat` 处理复数及货币，同时同步页面语言属性。[searchI18n.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-qvvi0l7i/src/searchI18n.ts:17)
- 扩充行为测试，覆盖 HTML `lang`、法语复数/欧元、英语单数/美元及组件自动卸载。[SearchPage.test.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-qvvi0l7i/src/SearchPage.test.ts:26)

验证：

- 国际化边界运行检查通过。
- `git diff --check` 通过。
- 完整 `npm run check` 未能运行：工作区没有 `node_modules`，而 `npm ci` 被环境禁止连接 npm 代理（`EPERM 127.0.0.1:7897`）。依赖可用后直接运行 `npm run check` 即可。