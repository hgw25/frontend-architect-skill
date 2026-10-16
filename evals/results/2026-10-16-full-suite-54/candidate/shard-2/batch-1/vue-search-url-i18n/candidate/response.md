已完成商品搜索页，实现集中在 [SearchPage.vue](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-ounue74c/src/SearchPage.vue:1)。

- 从 URL 初始化并同步 `q`、`page`、`locale`
- 新搜索写入浏览器历史并将页码重置为 1
- 支持刷新、分享及前进/后退恢复状态
- 通过请求代次与 `AbortController` 防止旧请求覆盖新状态
- 使用 `Intl.PluralRules` 和 `Intl.NumberFormat` 实现英法复数及货币格式
- 同步页面和文档的 `lang` 属性
- 本地化标题、表单、结果数量和错误消息
- 遵循本地 frontend-architect 指引，将请求执行与结果发布分离，并完整处理卸载清理

验证通过：

- `npm run typecheck`
- `npm test`：3 项行为测试全部通过
- `git diff --check`：通过