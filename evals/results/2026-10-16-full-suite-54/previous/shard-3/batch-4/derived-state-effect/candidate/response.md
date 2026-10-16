结论：`filteredUsers` 是由 `users` 和 `query` 完全推导出的值，不需要独立 state，也不需要 Effect；目前也没有证据支持 memoization。

### 评审发现

**中等：Effect 会产生一次错误或过期的渲染**

- 首次渲染使用完整的 `users`，Effect 执行后才显示过滤结果，可能造成闪烁。
- `users` 或 `query` 更新时，会先显示上一次的过滤结果，再额外渲染一次。
- 服务端渲染时 Effect 不执行，因此服务端 HTML 会包含未过滤用户。
- `users` 被原地修改但引用未变时，依赖数组还可能让结果持续过期。

这是把同一事实分别存放在 props 和 state 中造成的双重数据源。

建议改为同步派生：

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

这保留了过滤规则、顺序、对象引用以及 `User` 的 key。它会消除首次未过滤和更新时短暂过期的画面；如果这些中间画面竟被视为公开契约，就无法同时删除 state/Effect 并逐帧保持行为。不过它们更像实现缺陷，应确认公开契约是“始终展示当前 props 对应的过滤结果”。

`useMemo` 暂不需要。过滤本身是普通的 O(n) 计算，组件仍需执行 O(n) 的映射；只有在真实列表很大、父组件存在大量无关重渲染、且性能测量确认过滤是瓶颈时，才考虑：

```jsx
const filteredUsers = useMemo(
  () => users.filter((user) => user.name.includes(query)),
  [users, query],
)
```

这还要求调用方在内容变化时提供新的 `users` 引用。

### 验证建议

通过组件的可见输出验证，不要断言内部 state、Effect 调用次数或 `useMemo`：

- 首次渲染只显示名称包含 `query` 的用户。
- 重新渲染并修改 `query` 后，只显示新条件对应的用户，不残留旧结果。
- 替换 `users` 后，新增、删除和改名立即反映出来。
- 覆盖空查询、无匹配、多匹配，并确认现有的大小写敏感 `includes` 语义和原始顺序不变。
- 若项目支持 SSR，用 `renderToString` 验证服务端输出已经过滤；这是能直接暴露原实现问题的检查。
- 最后运行项目既有的类型检查、lint 和组件测试。

当前工作区只有评审 Skill，没有组件源码、`package.json` 或测试配置，因此本次仅完成代码审查，没有修改文件或执行项目测试。