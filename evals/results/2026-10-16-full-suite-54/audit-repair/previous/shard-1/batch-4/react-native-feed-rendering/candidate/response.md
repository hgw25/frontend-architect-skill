结论：先处理“100ms 高频状态扩大到整张列表”的更新边界，再根据真机证据处理图片与虚拟化参数；不更换列表库，也不基于旧 Bridge 推理。当前工作区没有应用源码、依赖清单或 Android 工程，因此无法实施或验证代码改动；`.frontend-architect` 保持未修改。

## 最小修复顺序

### 1. 先补齐事实与基线

从实际项目记录：

- `react-native`、React、列表组件及图片组件的精确版本。
- 锁文件、`android/gradle.properties`、构建参数及最终 APK 的架构标记。
- Hermes、构建模式、目标 Android 版本、设备型号与刷新率。
- 800 项数据中实际挂载数量、行高是否固定、图片请求尺寸和缓存策略。

不能仅凭“现代 RN”判断架构。RN 0.76 起新架构默认启用，但项目可以关闭，最终构建配置才是事实。[React Native New Architecture](https://reactnative.dev/architecture/landing-page)

在同一台中端 Android 真机上，用相同 800 项数据和固定滚动操作录制四组 profile/release 样本：

| 音频进度 | 图片 | 用途 |
|---|---|---|
| 正常 100ms 更新 | 正常图片 | 基线 |
| 暂停进度更新 | 正常图片 | 判断高频 React 更新是否主因 |
| 正常更新 | 固定尺寸占位图 | 判断解码、上传、绘制和缓存是否主因 |
| 暂停更新 | 占位图 | 观察两者叠加及剩余布局成本 |

采集：

- React Profiler：每次进度变化触发哪些组件 commit、耗时多少。
- RN 性能轨迹：若当前版本支持；新版 Performance 面板从 RN 0.83 才提供，不能假定已有。[React Native DevTools](https://reactnative.dev/docs/react-native-devtools)
- Android Studio/Perfetto FrameTimeline：区分 JS、UI、布局、绘制和图片相关工作。
- JS heap、Java/Kotlin heap、native/graphics memory、进程 PSS。
- 连续多次顶部到底部再返回，并等待空闲/GC 后观察是否形成平台，而非只看一次 RSS 上升。Bitmap 等资源可能体现在 native memory，不能只检查 JS heap。[Android Memory Profiler](https://developer.android.com/studio/profile/record-java-kotlin-allocations)

### 2. 若暂停进度后明显改善，先做更新隔离

这是已知代码描述下最小、最可能有效的改动：

- 800 项业务数据保持稳定引用；音频 tick 不再 `map` 出整批新行对象。
- 高频 `progress` 由播放器控件和当前播放行订阅。切换播放项时只应使旧活动行、新活动行及播放器更新。
- 不把 `progress` 放入整张列表的 `data`、列表级 `extraData` 或等效全局失效输入。
- 行组件只接收必要的标量和稳定对象，例如 `item`、`isActive`、稳定的 `onPress(id)`。
- 静态样式移至模块级 `StyleSheet.create`；确有动态样式时只传最小变化值。
- `renderItem` 和列表级回调保持稳定依赖。
- 仅当 profiler 显示行重渲染成本显著时添加 `React.memo`；比较实际可见属性和回调，不做深比较，也不能故意忽略会影响行为的 prop。

中间验收条件：每个 100ms tick 不再导致所有可见行 commit；通常只允许播放器及活动行更新。这个结果只能证明失效范围缩小，不能单独证明掉帧已解决。

暂不降低 100ms 频率，因为这会改变进度显示语义。若隔离后活动行仍然过重，再根据检测到的 RN 版本和动画能力决定是否降低显示采样率或把纯视觉插值放到 UI 侧；不能先套用旧 Bridge 的“减少跨桥消息”结论。

### 3. 若占位图实验有效，再收缩图片成本

- 信息流请求接近实际显示尺寸的缩略图，而不是下载后解码原始高分辨率图。
- 请求像素尺寸按布局尺寸和设备像素密度确定，并保持稳定 URI/缓存键。
- 为图片预留确定尺寸或宽高比，避免加载后重新布局。
- 复用项目现有图片加载和缓存能力；先确认缓存上限、淘汰、取消和卸载行为，不直接引入新图片库。
- 用 retained object、Bitmap/native allocation 或缓存统计确认资源所有者。内存持续增长不等于已经证实泄漏。

RN 官方也建议列表使用轻量缩略图，但是否改善本项目仍须由真机内存和帧轨迹确认。[FlatList optimization](https://reactnative.dev/docs/optimizing-flatlist-configuration)

### 4. 最后才调整当前列表的虚拟化参数

不换库，只在确认当前组件及版本后逐项实验：

- 使用稳定的业务 ID 作为 key，禁止 index key。
- 行高真正固定时才提供 `getItemLayout`，并正确包含分隔线；动态高度不能伪造。
- 根据屏幕可见行数调整 `initialNumToRender`。
- 单独实验 `windowSize`、批量大小和批次周期，兼顾内存、空白区与触摸响应。
- 不把 `removeClippedSubviews` 当成内存泄漏修复：官方说明它主要将视图从原生层级脱离，并不保证释放这些视图的内存。[FlatList configuration](https://reactnative.dev/docs/optimizing-flatlist-configuration)

## 证据分支

- 冻结进度有效、占位图无效：实施状态隔离和稳定身份，暂不动图片或列表窗口。
- 占位图有效、冻结进度无效：优先缩略图、尺寸、缓存和资源生命周期。
- 两者都有效：先合入状态隔离，再处理图片；每一步重复同一测量，避免无法归因。
- 两者都无效：从 Perfetto 中继续定位布局、绘制、UI 线程阻塞或其他原生工作，不增加 memo 或切换列表库碰运气。
- 内存只在滚动期间上升、随后形成平台：更像窗口或缓存行为；若多轮操作后 retained set 仍阶梯式增长，才沿引用链调查泄漏。

## 必须在真实环境验证的结论

必须在真实 React Native 运行时确认：

- 实际 RN/Hermes/New Architecture 组合。
- 100ms 更新究竟使哪些组件 render/commit。
- `memo`、稳定对象和订阅下沉是否真正缩小失效范围。
- 当前列表组件的窗口、回收、测量及图片卸载行为。

必须在中端 Android 真机的 profile/release 条件确认：

- 滚动掉帧是否改善，以及瓶颈在 JS、UI、布局、绘制还是图片阶段。
- 图片解码、native/graphics memory 和 GC 是否主导内存变化。
- 多轮滚动后的内存是否形成稳定平台。
- 是否出现空白区、触摸延迟、错误复用、图片闪烁或滚动位置回归。
- 热机、真实刷新率和持续滚动下的结果；模拟器与 debug 构建不能支撑这些结论。Android 官方推荐用系统轨迹和帧数据定位 jank。[Android rendering diagnostics](https://developer.android.com/topic/performance/rendering/optimizing-view-hierarchies)

最终放行标准应在基线后固定：同一设备、数据、构建和操作下，帧指标达到产品目标且重复运行稳定；内存在多轮滚动后进入可解释的平台；音频进度、点击、重排、快速滚动和图片展示均无行为回归。