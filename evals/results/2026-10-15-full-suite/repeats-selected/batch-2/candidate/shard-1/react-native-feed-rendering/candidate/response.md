结论：先把 100ms 音频进度更新从信息流父组件的失效范围中移出去，并保持列表数据、行属性和回调身份稳定；暂不更换列表库、不先调一堆虚拟化参数，也不把问题归因于旧 Bridge。高分辨率图片是内存增长的重点嫌疑，但必须通过 Android 原生内存证据区分“缓存逐步填满”和“资源泄漏”。

工作区除 `.frontend-architect` 和 `.git` 外没有应用源码、`package.json` 或 Android 工程，因此以下是可执行方案，不能声称已经完成代码验证。

## 最小修复顺序

### 1. 先建立真机基线

使用相同的 800 项数据和图片，录制固定的“播放音频并连续滚动”场景：

- 记录 React Native 版本、Hermes/JSC、实际构建变体、Android 设备/系统/刷新率。
- 从构建配置和实际运行二进制确认 New Architecture/Fabric 是否启用；不能只根据历史默认值推断。
- 在中端 Android 真机的 profile/release-like 构建测试，debug 和模拟器仅用于功能调试。
- 同时采集：
  - React Native Profiler：每次进度更新触发了哪些组件、提交耗时。
  - Android System Trace/Perfetto FrameTimeline：掉帧期间 UI、Render、JS/runtime 工作的位置。
  - Android Memory Profiler：Java、native/graphics 内存、视图数量和 heap retain path。仅看 JS heap 不足以判断图片问题。
- 重复完整滚动若干轮，再停止交互观察内存是否趋于平台；记录可见图片尺寸和源图片像素尺寸。

成功标准不要固定为通用的“16 ms”。以设备刷新率的 frame deadline、掉帧比例及基线差异判断；内存应在工作集和缓存预热后趋于稳定，而不是每轮滚动继续线性增长。

### 2. 第一笔代码改动：缩小 100ms 更新范围

若 profiler 证实音频 tick 引发父页面或大量行提交，实施这一笔改动：

- 音频进度由播放器或唯一正在播放的进度组件订阅。
- 信息流父组件只持有低频状态，例如当前播放项 ID；不要每个 tick 接收 progress。
- 不在 tick 中 `map` 整个列表或给每项附加 progress。
- 数据真正变化时才替换对应 item；其余 item 保持引用。
- 行组件接收稳定、最小的 props，并在确认重渲染有成本后使用 `React.memo`。
- `renderItem`、`keyExtractor` 和行操作入口保持稳定；操作入口传 `id`，避免父层为 800 项反复生成闭包。
- 静态样式移至模块级 `StyleSheet.create`。这是消除无意义分配，不单独宣称能解决掉帧。
- 不写会忽略有效字段的自定义比较器，也不能用稳定回调换来陈旧状态。

示意边界：

```tsx
const styles = StyleSheet.create({ /* static styles */ });

const FeedRow = memo(function FeedRow({ item, onPress }: RowProps) {
  return <Pressable onPress={() => onPress(item.id)}>{/* ... */}</Pressable>;
});

function FeedScreen() {
  const items = useFeedItems(); // 音频 tick 时引用不变
  const activeId = useActiveTrackId(); // 仅切歌时变化
  const onPress = useCallback((id: string) => play(id), [play]);

  return (
    <>
      <ExistingFeedList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
      />
      <AudioProgress trackId={activeId} />
    </>
  );
}
```

如果进度必须显示在正在播放的行内，让该行中的小型进度子组件订阅；不要让所有行订阅 10Hz 状态。

改动后重复同一真机场景。只有当行提交数量、JS/runtime 忙碌时间和真机掉帧同步改善，才能认定失效范围是主要原因。若 render 次数下降但掉帧不变，它只是中间指标。

### 3. 按证据处理图片内存

若内存证据指向解码图片或图片缓存：

- 复用现有图片组件/服务，请求接近实际显示像素尺寸的缩略图；布局宽高或 `resizeMode` 本身不保证所有版本都会按目标尺寸解码。
- 保持图片 URL/cache key 稳定，避免每次 render 产生新 URL 或查询参数。
- 检查卸载后的图片视图、请求、监听器以及现有缓存策略是否仍被业务对象持有。
- 分别比较原图与缩略图构建的 native/graphics 内存和掉帧。

压缩文件大小不能代表解码内存；近似 RGBA 占用可按 `宽 × 高 × 4` 估算，但最终以实际图片管线和真机 profiler 为准。缓存增长到上限后趋稳不等同于泄漏。

### 4. 最后才调整现有列表

仅当证据显示挂载视图过多、批量挂载或测量阻塞帧时，使用当前列表库已有能力：

- 核对稳定语义 key 和实际挂载数量。
- 小步调整窗口、首批数量和批处理参数，每次重测。
- 只有项目高度确实固定或可预测时才提供布局估算。
- 验证快速滚动、回滚、动态高度、图片占位以及无障碍遍历。

800 个逻辑项目本身不能证明虚拟化失败；必须看实际挂载数量。第一轮不增加或替换列表依赖。

## 必须在真实环境验证的结论

| 结论 | 所需环境 |
|---|---|
| 100ms tick 是否让大量行真正 render/commit | 实际 React Native 版本和运行时 Profiler |
| 是否存在 Bridge 序列化或 Fabric/JSI/宿主边界瓶颈 | 实际二进制的架构配置与系统 trace |
| JS/runtime 优化是否改善用户看到的滚动 | 中端 Android 真机、profile/release-like 构建 |
| 掉帧来自 JS、UI、Render、布局、栅格或图片解码 | Android 真机 FrameTimeline/Perfetto |
| 内存增长是 JS retain、原生图片、GPU 资源、缓存预热还是泄漏 | Android 真机多轮滚动、内存分类及 retain path |
| 虚拟化参数是否改善且不造成空白、跳动或状态丢失 | 真实列表实现和 Android 真机 |
| 缩略图是否降低峰值内存且画质可接受 | 目标密度 Android 真机 |

这套顺序保留了现有技术栈，并将第一笔修复限制在状态所有权和身份稳定性；后续每项优化都由能否解释真机掉帧或持续内存增长来决定。