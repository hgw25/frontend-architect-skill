当前无法完成实际代码改动：工作区没有前端项目源码。

核查结果：

- `rg --files` 无结果。
- `git ls-tree -r --name-only HEAD` 无结果。
- 当前 `HEAD` 是空的 `eval fixture` 提交，且不是 sparse checkout。
- 工作区只有要求保持不变的 `.frontend-architect` 目录。
- Git 状态干净，因此没有文件被修改，也没有项目测试可运行。

确定的实现决策如下：

```tsx
// 类型名和组件名应替换为项目中的实际导出
type SortModel = NonNullable<
  React.ComponentProps<typeof ExistingTableWrapper>["sortModel"]
>;

const [sortModel, setSortModel] = useState<SortModel>([]);

<ExistingTableWrapper
  {...existingProps}
  sortModel={sortModel}
  onSortModelChange={setSortModel}
/>
```

- 由页面持有唯一的 `sortModel`，按 TableKit 4 的受控契约更新。
- 继续复用现有 wrapper；不改写排序算法、不新增键盘事件监听器、不复制 locale 或焦点管理。
- 不新增依赖。
- 如果现有数据由服务端排序，`onSortModelChange` 应交给既有查询状态所有者并触发请求，而不是同时进行客户端排序。
- 这样未来切换本地/服务端排序时，只需调整排序状态的消费端，Table wrapper 的交互契约无需变化。

验证应扩展现有 consumer tests：

1. 使用 TableKit 规定的交互依次排序两列，断言受控模型包含两个按优先级排列的排序项。
2. 用回调产生的新模型重新渲染，断言排序指示和可见行顺序与模型一致。
3. 覆盖第二列方向切换及从模型中移除排序项。
4. 复用现有键盘测试，确认排序后焦点仍位于预期表头或单元格；该结论应在真实浏览器环境验证。
5. 复用现有本地化播报测试，确认多列排序变化仍使用 wrapper 管理的 locale 文案。
6. 运行仓库实际提供的类型检查、相关测试、lint 和构建命令；当前无法确定或执行这些命令。

该方案受本地 Skill 的契约所有权原则影响：排序状态属于消费页面，键盘导航、焦点和本地化继续属于现有表格封装。要完成代码交付，需要先把项目源码及测试配置检出到此工作区。