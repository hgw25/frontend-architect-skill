## 问题

1. **高：回前台时未刷新 `creatorDirectory`。**  
   `src/lifecycle.ts` 快照第 7 行的 `Promise.all` 仅调用 `feed.refresh()`，直接违反 §4.2。应同时触发 `creatorDirectory.refresh()`，且不刷新本地 draft。

2. **中：无 `activityId` 时“获取”按钮未禁用。**  
   `src/PostRow.tsx` 快照第 8–10 行始终渲染可用按钮，仅在点击后不调用 `acquire`。这不等同于 §4.1 要求的禁用状态；按钮仍可获得焦点和被点击，也没有原生 `disabled` 语义。

## 验证范围

- 依据给定的已批准 `docs/community.md` §4.1–§4.3，对 `PostRow` 两个数据分支、作者入口及 `onForeground` 刷新目标做了静态追踪。
- 未修改任何文件。
- 已通过的结构测试只证明两个导出是函数，不能验证上述行为。
- 既有截图仅覆盖 `activityId="a1"` 的正常展示，不能验证无 ID 时按钮禁用，也不能证明详情导航或 `acquire("a1")` 的交互。
- 覆盖表中的状态登记本身不是执行证据；“创建页标题为空时禁用提交”与本次两个缺陷无直接覆盖关系。
- 因没有可运行的应用或浏览器环境，本轮未执行测试或交互验证。仍缺少：
  - `activityId=null` 时标题保留、无详情链接、按钮原生禁用且不调用 `acquire`；
  - 有 ID 时详情入口和获取回调均使用同一 ID；
  - 回前台时 `feed` 与 `creatorDirectory` 均刷新、draft 不参与刷新。