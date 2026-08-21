**Findings**

1. `UserList` 第 2-9 行把 `filteredUsers` 存成 state，是重复事实。
   `filteredUsers` 完全由 `users` 和 `query` 推导出来，不是“必须记住”的状态。现在这份实现会先渲染旧值，再由 `useEffect` 同步一次，带来至少一个额外 render，而且在 `users` 或 `query` 变化时会出现短暂的过期列表。

2. `useEffect` 第 4-8 行没有在同步外部系统，只是在做纯计算。
   这类逻辑应放在 render 期间直接推导。把纯派生放进 Effect，会让数据流变成“两阶段”，更难推断，也更容易产生时序问题。

3. 不建议为这里加 `useMemo`。
   `users.filter(...)` 是局部、同步、线性的纯计算。除非已经确认 `users` 很大且这个组件重渲染频繁，否则 memoization 只会增加复杂度。这里先写成直接派生更合适。

**Decision**

如果“公开行为不变”是严格要求，那不能直接把它改成 render 时过滤而不说明差异，因为可观察行为会变：
当前代码在首次挂载和后续 props 变化时，都会先显示旧列表，再显示过滤后的列表。

如果产品真正想要的契约是“`query` 变化后立即显示过滤结果”，那当前实现本身就是缺陷，应该改成：

```jsx
function UserList({ users, query }) {
  const filteredUsers = users.filter((user) => user.name.includes(query))

  return filteredUsers.map((user) => <User key={user.id} user={user} />)
}
```

这时：
- `state` 不必要
- `Effect` 不必要
- `useMemo` 默认也不必要

**How To Verify**

先确认契约，再测对应行为。

如果保留当前公开行为：
1. 写组件测试，覆盖首次渲染时传入非空 `query`，断言首帧仍显示未过滤列表，随后才变成过滤结果。
2. 再测 `query` 从 `a` 切到 `b` 时，是否会短暂显示旧结果。
3. 用 React DevTools Profiler 确认这类更新会触发额外 render；这能证明现实现状。

如果接受“立即过滤”为正确契约并做重构：
1. 写组件测试，首次渲染传入非空 `query` 时，直接断言只渲染过滤后的用户。
2. 测 `users` 和 `query` 更新后，同一轮更新里就得到正确列表，不依赖 `waitFor`。
3. 用 Profiler 对比前后 render 次数，确认少一次由 Effect 触发的重复 render。

结论很明确：从架构上看，`state` 和 `Effect` 都不该存在；是否能删，取决于你是否接受修正当前这个可观察的“延后一拍”行为。