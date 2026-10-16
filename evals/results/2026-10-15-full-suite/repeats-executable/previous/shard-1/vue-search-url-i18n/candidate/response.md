已完成商品搜索页，修改集中在 [SearchPage.vue](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-w9so9msy/src/SearchPage.vue:1)。

实现包括：

- URL 初始化并同步查询词、页码和 locale。
- 搜索、翻页、切换语言写入浏览器历史，支持刷新、分享及前进/后退。
- 提交查询自动重置到第 1 页。
- 使用请求中止与 generation 校验，防止旧请求覆盖新结果或错误状态。
- 使用 `Intl.PluralRules`、`Intl.NumberFormat` 和消息目录支持 `en-US`、`fr-FR`。
- 正确设置页面及组件的 `lang` 属性。
- 增加加载、错误、分页、API 响应校验和卸载清理。
- 未引入路由框架、全局 store 或额外依赖。
- `.frontend-architect` 内容保持不变。

验证结果：`npm run check` 通过，包括 TypeScript 类型检查及全部 3 个行为测试。