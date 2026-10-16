已完成商品搜索页：

- URL 初始化并同步 `q`、`page`、`locale`，支持刷新、分享及前进/后退。
- 新查询提交时页码重置为 `1`。
- 通过请求版本标识与 `AbortController` 防止旧请求覆盖新结果，包括错误和 loading 状态。
- 支持 `en-US`、`fr-FR` 的完整消息、复数规则、货币格式及 HTML `lang` 属性。
- locale 切换会写入浏览器历史。
- 国际化集中在小型模块中，未引入路由、全局 store 或大型依赖。
- 增强行为测试并加入组件自动卸载，避免监听器泄漏。

修改文件：

- [SearchPage.vue](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-3kvp95dx/src/SearchPage.vue)
- [searchPageI18n.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-3kvp95dx/src/searchPageI18n.ts)
- [SearchPage.test.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-3kvp95dx/src/SearchPage.test.ts)

验证结果：`npm run check` 通过，TypeScript 检查成功，4 个行为测试全部通过。