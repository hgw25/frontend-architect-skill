当前无法提交代码补丁：工作区除 `.frontend-architect` 指导文件和 Git 元数据外没有应用源码、依赖清单、锁文件或 Android 工程。因而不能确认 React Native 版本、列表/图片组件及 New Architecture 状态。下面是可直接交给项目执行的最小修复顺序；现象目前只能支持“高频失效和图片资源是主要嫌疑”，不能宣称已定位根因。

## 最小修复顺序

### 1. 先固定基线

记录：

- 锁文件中的实际 React Native、React、列表组件和图片组件版本。
- Android 构建配置及运行时实际启用的架构；不要根据“新项目默认值”推断。RN 0.76 起 New Architecture 默认开启，但旧项目、升级项目和构建变体仍可能不同。[React Native 官方说明](https://reactnative.dev/blog/2024/10/23/release-0.76-new-architecture)
- 中端 Android 真机型号、Android 版本、刷新率。
- 800 项固定数据、固定图片 URL，分别测冷缓存和暖缓存。
- 接近 release 的、可 profile 的非 debug 构建；debug 和模拟器结果只用于排错，不能作为性能结论。

固定一次场景：音频播放并保持 100ms 进度更新，列表从顶部连续滚到底，再返回，重复至少 5 次。

采集三类证据：

1. React Profiler：一次进度 tick 更新了哪些组件，行组件提交了多少次。
2. Android System Trace/FrameTimeline：JS、UI、RenderThread、图片解码或 GC 中谁占用帧时间。RN 官方提供了 Android system tracing 流程。[RN Profiling](https://reactnative.dev/docs/profiling)
3. 内存时间线：Java/Kotlin、native、graphics/RSS 分别怎样增长；在相同内容已浏览一遍后再次滚动是否仍持续增加。

### 2. 第一批只改高频失效边界

这是不依赖旧 Bridge、新架构或具体列表库的最小改动：

- 不再把每 100ms 的播放进度放在包含整个 Feed 的页面状态中。
- 让进度状态由最小展示单元订阅：
  - 进度在列表外显示时，仅进度组件订阅。
  - 进度显示在当前播放行内时，静态行与 `ActiveProgress` 分开；只有当前行的进度叶节点以 10Hz 更新。
- Feed 数据不包含瞬时 `progress`；进度 tick 不再 `map` 800 项生成新对象。
- 未变化的行项目保留同一对象引用，列表 `data` 引用也保持不变。
- 样式移到模块级 `StyleSheet.create`。
- `key` 使用稳定业务 ID，不能使用索引或每次生成的新值。
- 行组件用 `React.memo`，先采用默认浅比较。
- `renderItem`、`keyExtractor` 和传给行的操作回调保持稳定。回调以 `id` 为参数，避免为每项在父层创建闭包。
- 不写一个忽略回调或其他可见字段的自定义 `memo` 比较器，否则容易引入陈旧闭包和不更新问题。

示意结构：

```tsx
const styles = StyleSheet.create({
  row: {/* existing styles */},
});

const FeedRow = memo(function FeedRow({
  item,
  isActive,
  onOpen,
}: FeedRowProps) {
  return (
    <View style={styles.row}>
      <FeedImage source={item.thumbnail} />
      <Pressable onPress={() => onOpen(item.id)}>
        {/* static row content */}
      </Pressable>
      {isActive ? <ActiveProgress itemId={item.id} /> : null}
    </View>
  );
});

function Feed({items, activeId, onOpen}: FeedProps) {
  const renderItem = useCallback(
    ({item}: {item: FeedItem}) => (
      <FeedRow
        item={item}
        isActive={item.id === activeId}
        onOpen={onOpen}
      />
    ),
    [activeId, onOpen],
  );

  return (
    <ExistingList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
    />
  );
}
```

`activeId` 只在切换播放项时变化；100ms 的进度值不进入 `Feed`。如果项目已有 selector 型 store/subscription，应复用它，不新增状态库。

这一批改动的直接验收条件是：播放进度 tick 时，Profiler 中 Feed 和普通行不再提交，只有进度叶节点更新。该结果只是定位证据，最终仍需真机帧数据证明体验改善。

### 3. 图片作为独立实验

高分辨率压缩文件即使下载体积不大，解码后的内存仍取决于像素尺寸。列表应请求接近实际显示像素尺寸的缩略图，而不是下载原图后仅靠 `resizeMode` 缩小显示。

优先顺序：

1. 使用现有 CDN/图片服务生成 density-aware 缩略图。
2. 保持同一资源 URI 和缓存 key 稳定。
3. 根据已经确认的图片组件及版本，启用其支持的 Android 解码缩放能力。
4. 检查取消、卸载和缓存上限，但不要无证据地在滚动时清空全局图片缓存。

只有当内存证据指向 Bitmap、native/graphics 或图片缓存时才实施这一步。缓存预热后达到平台并不等于泄漏；重复浏览同一批图片后，强制 GC/空闲阶段仍持续抬升，并且保留对象或 native allocation 数量增长，才更接近泄漏证据。Android Studio Heap Dump 能显示 `Bitmap` 的 native size、retained size 和引用链。[Android Heap Dump](https://developer.android.com/studio/profile/capture-heap-dump)

### 4. 最后才调列表窗口

不更换列表库。先确认现有组件是否确实在虚拟化，以及滚动时实际挂载多少行，再使用它已有的配置。

若现有实现是 `FlatList`/`VirtualizedList`：

- 固定高度时才提供准确的 `getItemLayout`，并计入 separator。
- `initialNumToRender` 只覆盖首屏。
- 用小步实验调整 `windowSize`、`maxToRenderPerBatch` 和 `updateCellsBatchingPeriod`。
- 每次同时检查快速滚动白屏、点击响应和内存。
- 不把 `removeClippedSubviews` 当作释放内存的方案；官方说明它主要是从原生视图层级中暂时脱离视图，并不会显著释放其内存。[FlatList 配置说明](https://reactnative.dev/docs/optimizing-flatlist-configuration)

如果不是 `FlatList`，先查当前列表组件相同语义的配置，不能照搬这些属性。

## 真机发布门槛

建议用同一设备、数据和滚动脚本比较前后至少 5 次：

| 结论 | 必须取得的证据 |
|---|---|
| 高频更新已隔离 | 10Hz tick 只提交进度叶节点；普通行不提交 |
| 掉帧改善 | profileable、接近 release 的真机 `FrameTimingMetric`/FrameTimeline；比较 P50/P95/P99 `frameOverrunMs` |
| 没有用白屏换性能 | 最快实际滚动下无空白窗口，点击仍及时 |
| 内存稳定 | 预热后重复相同滚动，最后几个循环的 GC 后 RSS、native/graphics、Bitmap 保留量不再呈持续上升趋势 |
| 图片改动有效 | 缩略图实验显著降低 Bitmap/native 内存或解码时间，而非只降低网络字节 |
| 行为未回归 | 切换播放项、暂停/恢复、跳转、列表复用后进度和点击目标正确 |

Android 的 Macrobenchmark `FrameTimingMetric` 可为滚动场景给出 `frameOverrunMs` 的 P50/P90/P95/P99，并明确不建议用模拟器生成代表用户的性能数据。[Android Macrobenchmark](https://developer.android.com/topic/performance/benchmarking/macrobenchmark-overview)

## 必须留到真实 RN 运行时和 Android 真机确认的结论

- 实际是否启用 New Architecture，以及更新经过的真实 render/commit/mount 与线程路径。New Architecture 的渲染管线与旧 Bridge 不是同一模型。[RN Render Pipeline](https://reactnative.dev/architecture/render-pipeline)
- 100ms 更新是否确实导致可见行提交、host mutation、布局或仅产生 JS 分配。
- 掉帧主要来自 JS、UI/RenderThread、图片解码/上传还是 GC。
- 现有列表是否正确虚拟化，以及窗口参数的最佳权衡。
- 内存增长是正常缓存平台、分配抖动，还是真正被引用链、监听器、计时器或 native 图片资源保留。
- 修复在生产构建配置、中端 Android 和实际刷新率下是否达到帧预算。
- 所选列表和图片 API 在锁定版本中的默认值与语义。

不建议首轮做的事情包括更换列表库、迁移 New Architecture、给所有值套 `useMemo`/`useCallback`、一次性修改多个窗口参数，或仅凭 debug render count 宣布修复完成。