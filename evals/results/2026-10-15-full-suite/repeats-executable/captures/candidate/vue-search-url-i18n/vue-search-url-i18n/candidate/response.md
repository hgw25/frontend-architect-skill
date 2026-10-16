已完成商品搜索页：

- URL 初始化并同步查询词、页码、locale，支持刷新、分享及前进/后退。
- 新查询自动重置到第 1 页，并提供分页、语言切换。
- 使用取消请求与 generation 校验，防止旧请求覆盖新结果或清理新状态。
- 通过消息目录、`Intl.PluralRules` 和 `Intl.NumberFormat` 支持 `en-US` / `fr-FR` 的复数、货币及 `lang` 属性。
- 未引入 store、路由或大型国际化依赖。
- 增补语言、分页、竞态及历史状态行为测试。

主要文件：

- [SearchPage.vue](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-5zzy0ibz/src/SearchPage.vue)
- [searchI18n.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-5zzy0ibz/src/searchI18n.ts)
- [SearchPage.test.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-5zzy0ibz/src/SearchPage.test.ts)

验证结果：`npm run check` 通过，类型检查及 5 个测试全部成功；`.frontend-architect` 未修改。