已在 [src/SearchPage.vue](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-baseline-mhe28q3d/src/SearchPage.vue) 完成实现，保持了 Vue 3 + TypeScript + Vite 的单页范围，没有引入路由、全局 store 或大型 i18n 依赖。

这个版本补齐了 URL 驱动的搜索状态：`q`、`page`、`locale` 会从地址栏初始化，提交新查询时会把页码重置到 `1` 并写回历史，`popstate` 会在前进/后退时恢复状态并重新请求。请求层加入了 `requestId` + `AbortController` 保护，旧请求不会覆盖新结果。界面本地化使用 `Intl.PluralRules` 和 `Intl.NumberFormat`，正确支持 `en-US` / `fr-FR` 的复数、货币格式，并同步了 `lang` 属性到页面和 `document.documentElement`。

检查已通过：执行了 `npm install`、`npm run typecheck` 和 `npm test`，当前测试 `3/3` 通过。