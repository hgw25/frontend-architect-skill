结论：`filteredUsers` 是由 `users` 和 `query` 完全派生的数据，不需要独立 state，也不需要 Effect。默认也不应加入 memoization。

### 主要问题：派生状态造成短暂错误显示

当前组件存在两个数据源：

- 权威数据：`users`、`query`
- 副本：`filteredUsers`

首次渲染时，`filteredUsers` 直接等于 `users`，因此非空查询也会先渲染全部用户；props 更新时，也会先渲染旧结果，等 Effect 执行后再更新。这还会为每次有效变化增加一次 state 更新和额外渲染。

建议直接在渲染期间派生：

```jsx
function UserList({ users, query }) {
  const filteredUsers = users.filter((user) =>
    user.name.includes(query),
  )

  return filteredUsers.map((user) => (
    <User key={user.id} user={user} />
  ))
}
```

这保持了公开 API、匹配规则、结果顺序和 `User` 的 key 不变。

需要明确一个行为边界：上述修改会消除首次渲染全部用户、更新后短暂显示旧结果的中间帧。若“延迟一帧再过滤”被明确要求为公开契约，就不能称为严格行为不变；但从提供的信息看，它更像实现缺陷，而不是产品行为。应将公开契约确认成“每次渲染都展示与当前 `users`、`query` 对应的结果”。

### Memoization 判断

暂时不要使用 `useMemo`：

```jsx
const filteredUsers = useMemo(
  () => users.filter((user) => user.name.includes(query)),
  [users, query],
)
```

它只在过滤已经成为可测量瓶颈，并且父组件能较稳定地复用 `users` 数组引用时才可能有价值。若父组件每次都创建新数组，缓存基本不会命中。`useMemo` 也不应用来修复正确性或保证引用稳定，除非下游确实存在这一公开契约。

### 验证方式

应通过组件的可观察输出验证，而不是检查是否调用了 Effect 或统计渲染次数：

- 首次以非空 `query` 渲染时，只出现匹配用户。
- 修改 `query` 后，列表立即对应新查询，不残留旧结果。
- 替换 `users` 后，新增、删除和改名正确反映。
- 覆盖空查询、无匹配、单个匹配和多个匹配。
- 确认仍保留当前的区分大小写、子串匹配和原始顺序。
- 运行项目既有的组件测试、类型检查和 lint。
- 如果计划加入 `useMemo`，先用代表性列表规模和真实交互做 React Profiler 基线，再比较相同条件下的提交耗时。

工作区中没有提供组件源码、测试配置或可执行项目，因此本次只能完成代码评审，未运行自动化验证。