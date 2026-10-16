已完成商品搜索页：[SearchPage.vue](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-bfbtub7h/src/SearchPage.vue)

实现包括：

- 查询词、页码、locale 从 URL 初始化并写回 History。
- 支持刷新、分享及 `popstate` 前进/后退恢复。
- 区分输入草稿与已提交查询；新搜索重置到第 1 页。
- 通过请求序号与 `AbortController` 防止旧请求覆盖新结果，包括错误和 loading 状态。
- 提供语言选择、前后翻页及可访问的加载反馈。
- 使用消息模板、`Intl.PluralRules` 和 `Intl.NumberFormat` 支持 `en-US`、`fr-FR` 的复数、货币和 `lang`。
- 未引入路由、全局 store 或国际化依赖。
- `.frontend-architect` 和只读测试文件保持不变。

验证通过：

```text
npm run check
✓ TypeScript typecheck
✓ 2 test files, 5 tests passed
✓ git diff --check
```