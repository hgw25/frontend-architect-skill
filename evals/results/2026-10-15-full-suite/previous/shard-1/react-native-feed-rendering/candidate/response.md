当前工作区没有 React Native 应用源码、依赖清单或 Android 工程，只有空 Git 提交和 `.frontend-architect` 指南。因此无法实施或验证补丁；我没有创建占位代码，工作区保持干净。下面是应在真实项目中执行的最小修复顺序。

## 先固定证据基线

先记录：

- `package.json` 中 React、React Native 和当前列表/图片组件的确切版本。
- `android/gradle.properties`、实际构建参数及 `BuildConfig.IS_NEW_ARCHITECTURE_ENABLED`，确认目标 APK 的架构。不能只按版本推断：RN 0.76 起新架构默认启用，但项目仍可退出。[官方说明](https://reactnative.dev/architecture/landing-page)
- 中端 Android 真机型号、刷新率、800 项固定数据、相同滚动步骤。
- 关闭开发模式，使用 profileable/release 类构建采集三次：
  - React Profiler：哪些组件被 100ms 更新带动。
  - Android Studio System Trace/Perfetto FrameTimeline：JS、UI、RenderThread、图片工作分别占用多少。
  - 内存时间线：进入页面、连续滚动若干轮、空闲、退出页面后的 Java、native、graphics/图片内存。
  - 若要看 Java/Kotlin retained objects，另用可调试诊断构建抓 heap dump，但不要把其帧率当发布性能。[RN Profiling](https://reactnative.dev/docs/profiling)、[Android Profiler](https://developer.android.com/studio/profile)

模拟器和 debug 表现不能作为基线；RN 官方同样要求在关闭 Development Mode 后分析性能。[Performance Overview](https://reactnative.dev/docs/performance.html)

## 第一笔最小补丁：缩小 10Hz 更新范围

不先降低音频刷新率，因为这会改变体验，也没有证明它是唯一瓶颈。应先建立以下不变量：

1. 音频 tick 不再执行 `items.map(...)` 创建 800 个新行对象。
2. `data` 数组以及未变项目的对象引用，在纯进度更新间保持稳定。
3. 每次 tick 最多使进度展示和正在播放的行发生有效更新。
4. 行 key 始终来自稳定业务 ID，不使用索引、URI 或进度值。
5. 音频 timer/listener 由明确组件或播放控制器持有，并在卸载时释放。

具体结构：

- 将 `feedItems` 与 `playbackProgress` 分开保存；内容仅在真实信息流数据改变时更新。
- 若进度只显示在固定播放器中，把列表提成稳定的 memo 边界，使音频 tick 完全不进入列表。
- 若进度必须显示在播放中的行：
  - 优先复用现有音频状态方案的窄订阅/selector，让小型 `AudioProgress` 子组件订阅当前条目；
  - 若项目没有这种能力，则让列表传递 `playingId` 和标量 `progressMs`，并 memo 行组件，使只有当前播放行（切歌时包括前一行）更新，不为此引入新状态库。
- 行组件只接收必要字段和稳定回调，例如 `onPressItem(id)`；绑定 ID 的闭包可在 memo 行内部创建。
- 静态样式移到模块级 `StyleSheet.create`；确实随主题变化的样式才按真实依赖稳定化。
- 不写遗漏回调或行为字段的自定义 `React.memo` 比较器，避免得到“更快但闭包过期”的错误结果。

`FlatList` 本身采用浅比较；只加 `memo` 而继续每 100ms 重建所有对象和函数，通常不会形成有效边界。[FlatList 契约](https://reactnative.dev/docs/flatlist)、[React memo](https://react.dev/reference/react/memo)

## 第二笔补丁：处理图片，而不是先换列表库

确认列表当前实际使用的图片组件及缓存策略，然后：

- 信息流请求接近展示像素尺寸的缩略图，详情页再加载原图。
- 图片视图提供稳定尺寸或 `aspectRatio`，避免加载后反复布局。
- 保持 URI/cache key 稳定，不能把进度、时间戳等易变值拼入图片地址。
- 若当前版本和图片组件支持，在 Android 上对远大于视图的图片对比测试 `resizeMethod="resize"`；不要未经真机测量全局开启。RN 文档明确说明它会在解码前下采样，但存在画质权衡。[Image 文档](https://reactnative.dev/docs/Image)
- 不因本问题直接引入另一图片库或更换列表库。

内存持续增长需要先分类：图片缓存增长后形成平台不等于泄漏；退出页面并触发后续 GC 后仍逐轮增长、且能看到 retained owner，才支持泄漏判断。

## 最后才调列表窗口

仅当当前实现属于 `FlatList`/`SectionList`/`VirtualizedList` 家族且 trace 仍指向列表窗口：

- 固定行高时补准确的 `getItemLayout`，包括分隔线尺寸。
- 用真机实验逐步减小 `windowSize`，同时观察内存、空白区域和快速滑动。
- 调整 `maxToRenderPerBatch`、`updateCellsBatchingPeriod`、`initialNumToRender` 时一次只改一组参数。
- 不把 `removeClippedSubviews` 当内存修复：官方说明它主要是从原生视图层级脱离屏外视图，并不会显著释放这些视图的内存。[FlatList 优化说明](https://reactnative.dev/docs/optimizing-flatlist-configuration)

## 必须在真实运行时和 Android 真机确认的结论

| 结论 | 必需证据 |
|---|---|
| 实际使用新架构还是旧架构 | 目标 APK 的构建配置/BuildConfig 和实际变体 |
| 掉帧主因是 JS 更新、UI/Layout、RenderThread 还是图片 | 同一滚动场景下的 React Profiler + FrameTimeline/System Trace |
| 稳定对象和 memo 是否改善用户体验 | profile/release 真机补丁前后相同场景对照 |
| 内存增长是泄漏还是正常缓存平台 | 多轮滚动、空闲及离开页面后的 heap/native/graphics 趋势和 retained owner |
| 缩略图或 Android 下采样是否有效 | 真机峰值内存、解码工作、帧时间及肉眼画质 |
| 列表窗口参数是否合适 | 快速滚动的慢帧、空白区域、触控响应与峰值内存 |
| 修复是否可发布 | 代表性中端设备至少三次重复结果；模拟器、render count 或单次微基准均不足以证明 |

最合理的停止条件是：进度 tick 不再重建信息流模型，只有所需进度 UI 更新；真机慢帧显著下降；重复滚动并离开页面后内存不再呈单调的 post-GC 增长；同时没有空白列表、图片模糊或播放状态错误。