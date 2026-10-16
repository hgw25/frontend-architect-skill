已完成商品搜索页：

- URL 驱动查询词、页码和 locale，支持刷新、分享及前进/后退。
- 区分输入草稿与已提交查询；新查询自动回到第 1 页。
- 使用请求身份与 `AbortController`，避免旧请求的结果、错误或加载状态覆盖新请求。
- 支持 `en-US` / `fr-FR` 消息、复数规则、货币格式及 `lang` 属性。
- 提供语言切换和分页控件，均同步浏览器历史。
- 保持轻量，没有引入路由、全局 store 或国际化依赖。

主要文件：

- [SearchPage.vue](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-73j5dn60/src/SearchPage.vue)
- [searchState.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-73j5dn60/src/searchState.ts)
- [searchI18n.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-73j5dn60/src/searchI18n.ts)
- [search-edge-cases.test.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-73j5dn60/src/search-edge-cases.test.ts)

验证结果：`npm run check` 通过，TypeScript 检查成功，3 个测试文件共 7 项测试全部通过；只读契约测试未修改。