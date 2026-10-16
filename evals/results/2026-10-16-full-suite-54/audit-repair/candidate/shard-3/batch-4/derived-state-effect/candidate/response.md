## 评审结论

提供片段第 2–8 行存在一个中等优先级的正确性与维护性问题：`filteredUsers` 完全由 `users` 和 `query` 决定，不应作为独立 state 保存，也不需要 Effect 同步。

当前实现会：

- 首次提交时先显示全部 `users`，Effect 执行后才显示过滤结果。
- `users` 或 `query` 更新时，先提交上一次的结果，再额外渲染一次。
- 服务端渲染时 Effect 不执行，直接输出未过滤列表。
- 形成两份可能暂时矛盾的数据来源。

建议直接在渲染期间计算：

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

这保留了现有过滤规则，包括大小写敏感、子串匹配、顺序、`key` 和传给 `User` 的对象引用。变化仅是消除 Effect 执行前的错误中间状态；它应视为实现缺陷，而不是需要保留的公开契约。

`useMemo` 目前也没有必要。只有在代表性数据上确认过滤成本显著，而且 `users` 引用通常稳定时，才考虑：

```jsx
const filteredUsers = useMemo(
  () => users.filter((user) => user.name.includes(query)),
  [users, query],
)
```

## 验证建议

使用项目现有测试工具覆盖：

- 首次渲染只出现匹配用户。
- 分别更新 `query` 和 `users` 后，立即呈现最新结果，不残留旧列表。
- 空查询、无匹配、大小写差异和子串匹配保持原有语义。
- 若支持 SSR，确认服务端输出已经过滤。
- 运行现有单元测试、类型检查和 lint。
- 不应仅凭感觉加入 `useMemo`；如怀疑性能问题，用 React Profiler 和代表性用户数量比较过滤耗时及提交次数。

工作区没有组件实现、项目配置或测试文件，因此本次未修改文件，也无法执行仓库级测试。