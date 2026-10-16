已完成商品搜索页：

- URL 统一管理查询词、页码和 locale，支持刷新、分享及前进/后退；分页和语言切换同步写入历史。
- 新查询自动回到第 1 页，并区分未提交草稿与已提交状态。
- 使用请求代次与 `AbortController`，确保旧请求的成功、失败和清理都不会覆盖新请求。
- 使用消息表、`Intl.PluralRules` 和 `Intl.NumberFormat` 正确支持 `en-US` / `fr-FR` 的复数、货币及 `<html lang>`。
- 按 Skill 的职责边界建议，将 URL 编解码和本地化分别放入聚焦模块：
  - [SearchPage.vue](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-jwv2ug_j/src/SearchPage.vue:27)
  - [searchPageI18n.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-jwv2ug_j/src/searchPageI18n.ts:25)
  - [searchUrlState.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vue-search-url-i18n-candidate-jwv2ug_j/src/searchUrlState.ts:16)
- 扩充了行为测试，覆盖语言属性、英语单数/美元、语言和分页历史状态、请求竞态。

验证通过：`npm run check`，类型检查成功，4 个测试全部通过。`.frontend-architect` 未修改。