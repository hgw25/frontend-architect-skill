已完成商品搜索页，保留了 Vue 3 + TypeScript + Vite，并把 URL 作为这页的规范化状态来源。现在页面会从 `q`、`page`、`locale` 初始化，刷新、分享、前进/后退都能恢复；提交新查询时会把页码重置为 `1`，同时用请求序号加 `AbortController` 防止旧请求覆盖新结果。

主要改动在 [src/SearchPage.vue](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-sv8ini6n/src/SearchPage.vue) 和新增的 [src/searchPageIntl.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-sv8ini6n/src/searchPageIntl.ts)。我把 URL 解析/序列化、`en-US`/`fr-FR` 的消息复数规则、货币格式化集中到小模块里，组件只负责协调状态和渲染；界面也设置了 `lang` 属性，没有用字符串拼接去模拟国际化。

已运行并通过 `npm run check`，其中包含 `vue-tsc --noEmit` 和 `vitest run`。