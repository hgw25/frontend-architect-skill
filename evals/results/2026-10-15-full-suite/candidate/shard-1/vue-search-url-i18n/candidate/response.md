已完成商品搜索页：

- URL 完整承载查询词、页码和 locale，支持刷新、分享、前进/后退。
- 新查询自动重置到第 1 页，并提供分页与语言切换。
- 使用 AbortController + 请求序号，确保旧请求的成功、失败或清理都不会覆盖新状态。
- 通过消息目录、`Intl.PluralRules` 和 `Intl.NumberFormat` 支持 `en-US` / `fr-FR` 的复数、货币和语言属性。
- 未引入 store、路由框架或国际化依赖。

变更文件：

- [SearchPage.vue](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-fmrr4hb2/src/SearchPage.vue)
- [searchI18n.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-fmrr4hb2/src/searchI18n.ts)
- [SearchPage.test.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-fmrr4hb2/src/SearchPage.test.ts)

验证结果：`npm run check` 通过，TypeScript 检查通过，5 个行为测试全部通过；`git diff --check` 无格式问题。`.frontend-architect` 保持未修改。