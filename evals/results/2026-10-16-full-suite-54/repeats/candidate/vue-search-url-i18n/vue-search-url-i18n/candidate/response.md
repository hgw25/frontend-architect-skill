已完成商品搜索页：

- URL 同步查询词、页码和 locale，支持刷新、分享及前进/后退；新查询自动回到第 1 页。
- 使用请求取消与请求序号，避免旧请求覆盖新结果或 loading/error 状态。
- 支持 `en-US`、`fr-FR` 的复数消息、货币格式、界面文案及页面 `lang` 属性。
- 增加轻量分页与语言切换，不引入路由、全局 store 或国际化依赖。
- URL 与国际化逻辑拆分为聚焦模块，保留未提交查询草稿。

涉及文件：

- [SearchPage.vue](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-2j69r395/src/SearchPage.vue)
- [searchState.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-2j69r395/src/searchState.ts)
- [searchI18n.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-2j69r395/src/searchI18n.ts)

验证通过：`npm run check`，包含 TypeScript 检查及 3 项行为测试。`.frontend-architect` 未修改。