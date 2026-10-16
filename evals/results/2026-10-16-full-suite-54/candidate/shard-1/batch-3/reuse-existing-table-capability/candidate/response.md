当前工作区无法实际提交实现：仓库 `HEAD` 是空树，没有 `package.json`、前端源码、Table 封装或测试文件；仅存在评测用 `.frontend-architect` 目录。为避免虚构项目结构，我没有创建替代项目，也没有修改任何文件。

建议实现应直接复用现有能力：

```tsx
type SortModel = NonNullable<
  React.ComponentProps<typeof ExistingTable>["sortModel"]
>;

const [sortModel, setSortModel] = useState<SortModel>([]);

return (
  <ExistingTable
    {...existingProps}
    sortModel={sortModel}
    onSortModelChange={(nextSortModel) => {
      setSortModel(nextSortModel);
    }}
  />
);
```

具体决策：

- 排序状态由现有页面或其领域容器控制，以完整 `sortModel` 表示多列排序及优先级。
- 继续使用项目现有 Table 封装，不直接绕过封装调用 TableKit。
- 不自行编写排序手势、键盘事件、焦点恢复或 ARIA 播报；这些已经由封装和 TableKit 4 负责。
- 不安装额外依赖。
- 如果页面当前只有单列排序状态，应在同一状态所有者处替换为 `sortModel`，并删除旧的单列适配逻辑，避免两个排序真相源。
- 将来若改为服务端排序，页面可以直接把同一 `sortModel` 序列化为查询参数，无需修改表格封装。

验证方案：

1. 多列排序

   - 建立第一、第二排序列后，断言 `onSortModelChange` 返回完整且顺序正确的模型。
   - 受控回传模型后，断言行顺序符合主、次排序规则。
   - 覆盖方向切换、移除其中一列及清空排序。

2. 键盘与焦点

   - 使用封装已经定义的导航及排序按键完成多列排序。
   - 每次排序重渲染后，焦点仍停留在发起操作的表头。
   - 继续使用封装的键盘契约，不在测试中假设或复制 TableKit 内部实现。

3. 无障碍和本地化

   - 复用现有本地化排序播报测试，扩展到多列顺序和方向变化。
   - 检查鼠标操作与键盘操作产生相同的受控模型及播报结果。

4. 项目检查

   - 运行现有消费者测试、类型检查、lint 和构建命令。
   - 若仓库提供浏览器测试，再验证真实 DOM 中的焦点移动和播报区域更新。

由于源码缺失，上述交互和项目命令本次均无法实际执行。需要补充包含现有 Table 封装及消费者的工作区后，才能完成代码落地和验证。