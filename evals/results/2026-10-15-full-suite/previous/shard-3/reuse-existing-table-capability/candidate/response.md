工作区中没有应用源码、`package.json` 或测试文件，Git `HEAD` 也是空树，因此无法提交真实实现；当前工作树保持干净，也未修改 `.frontend-architect`。

具体落地方案：

1. 由现有表格页面或其既有状态层持有唯一的 `sortModel`。
2. 将 `sortModel` 和 `onSortModelChange` 原样传给现有 Table wrapper。
3. 更新时直接采用 TableKit 返回的完整有序模型，不自行合并列、编写比较器或维护额外排序状态。
4. 保留模型中的列顺序作为排序优先级。
5. 键盘导航、排序后的焦点恢复、locale 和排序播报继续由现有 wrapper/TableKit 负责；页面不增加 `keydown`、手工 `focus()` 或额外 live region。
6. 不增加依赖，也不绕过现有 wrapper。

等价的调用形态应为：

```tsx
const [sortModel, setSortModel] = useState(/* 使用项目现有 TableKit 类型 */)

<ExistingTable
  {...existingProps}
  sortModel={sortModel}
  onSortModelChange={setSortModel}
/>
```

实际实现时应复用仓库已有的初始值、类型导入和状态持有方式，不能根据空仓库猜测类型名或组件路径。

验证方案：

- 新增或扩展消费方交互测试：按 TableKit 既定操作依次排序两列，断言回调产生包含两列且顺序正确的模型，并确认该模型重新传回表格。
- 验证修改第二列方向或移除其中一列时，另一列及其优先级保持正确。
- 运行现有“排序后焦点保持”和“本地化排序播报”测试，避免重复实现同类测试。
- 在真实浏览器中仅用键盘完成进入表格、单列排序、追加第二排序列和单元格导航；检查焦点可见且排序重渲染后仍位于预期表头。
- 运行项目既有的类型检查、相关组件测试及完整测试套件。

后续增加第三排序列时，应只改变受控模型内容，不需要修改 wrapper 或键盘导航机制。若补充实际项目源码，我可以据此完成代码和测试提交。