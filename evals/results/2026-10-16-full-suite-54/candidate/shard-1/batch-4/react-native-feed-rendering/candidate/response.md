当前工作区没有 React Native 工程文件或受版本控制的源码，只有 `.frontend-architect` 指南，因此无法核实或提交代码修复。以下方案严格区分已知现象、待验证假设和生产修改。

## 当前能确定的事

- 每 100ms 重建 800 个行对象、样式和回调，会破坏引用稳定性，使行级 `memo` 等优化难以生效；但仅凭描述还不能断定它就是掉帧主因。
- 高分辨率图片是内存、解码和 GPU 上传压力的重要候选，但“内存增长”可能是正常缓存预热，也可能是监听器、计时器、原生图片资源等泄漏。
- 模拟器和 debug 构建不能证明真机性能。React Native 官方也要求用 release 构建判断最终性能，并建议用 Android 原生工具取得准确数据。[React Native Performance](https://reactnative.dev/docs/performance.html)、[Debugging Basics](https://reactnative.dev/docs/debugging.html)
- 800 项本身不证明虚拟化失效；必须检查实际列表组件、嵌套结构、窗口配置和已挂载行数。

## 最小执行方案

### 1. 先固定真实运行条件

从实际项目记录：

- `package.json` 和 lockfile 中解析到的 React、React Native、列表及图片组件版本。
- 当前 Android flavor 的 New Architecture、JS engine 和 release/profile 配置；不能只看模板默认值，要确认安装到设备的实际产物。
- 当前列表类型，以及是否被同方向 `ScrollView` 包裹。
- 行 key、`data`、`extraData`、`renderItem`、窗口化参数、图片 URL/尺寸和音频进度订阅位置。

测试场景固定为：相同 800 条数据、相同图片缓存初始状态、音频播放并每 100ms 更新、同一段快速往返滚动。使用目标档位 Android 真机，分别保存：

- 可分析 React 工作的 profiling 构建；
- 关闭开发开销的 release 构建，用于最终帧表现；
- Perfetto/System Trace 的 FrameTimeline、UI/RenderThread、GC 和图片解码信息；
- Android Studio Memory Profiler：首次进入、滚动多轮、退出页面、等待回收后的 Java/native/graphics 内存。

至少重复 3–5 次，记录中位数和波动，不用一次截图下结论。

### 2. 用三个诊断开关定位责任边界

这些只用于诊断，不直接作为产品修复：

| 对照实验 | 如果现象明显改善 | 优先处理 |
| --- | --- | --- |
| 暂停 100ms 进度更新，图片不变 | JS 工作和掉帧下降 | 状态所有权与行失效范围 |
| 进度照常更新，暂用固定小图/占位图 | 内存或 UI/RenderThread 压力下降 | 图片尺寸、解码和缓存 |
| 两者不变，记录已挂载行数和原生视图数量 | 数量持续增加或接近 800 | 修复现有列表的窗口化/嵌套问题 |

同时检查退出页面后音频订阅、timer 和图片请求是否解除。内存若经过几轮滚动后稳定在平台预算内，不应仅因没有立即下降就判为泄漏。

### 3. 第一笔生产修改：隔离高频音频状态

若 React trace 显示每个 tick 都使大量行重新渲染，最小修复是：

- 父页面不再持有供整张信息流消费的 `progress`。
- 进度只由真正显示它的组件订阅：若只在播放器栏显示，就放在播放器栏；若活动行显示，则只有活动行订阅。
- 父级最多保存低频的 `activeAudioId`、播放/暂停状态，不把每 100ms 的数值写回 800 项数据。
- feed 数据只在服务端数据或用户操作真正改变时更新；更新单项时保留其他行对象的引用。
- 静态样式移到模块级 `StyleSheet.create`。动态进度样式限制在进度组件内部。
- 向行传稳定、语义最小的 props；父级传统一的 `onPress(id)`，避免每个 tick 创建 800 个闭包。
- 只有确认重复渲染成本显著后才给行组件加 `React.memo`；比较函数必须覆盖所有影响 UI/交互的 props，不能用漏字段的比较掩盖更新。

目标不是“零对象分配”，而是让每次进度 tick 只失效真实消费者。这个不变量可以用组件测试保护，但性能收益仍需运行时验证。

### 4. 第二笔修改：按证据控制图片成本

如果图片对照实验有效：

- 优先请求接近显示尺寸 × 设备像素密度的服务端缩略图，不把原始高分辨率资源交给列表行。
- 保持图片 cache key/URI 稳定，避免随渲染添加变化的查询参数。
- 复用项目现有图片组件和缓存策略，不直接更换图片库。
- 只有确认当前 RN 版本支持且原图远大于视图时，才评估 Android 图片下采样选项；当前 `Image` 文档说明 `resizeMethod="resize"` 适合远大于视图的图片，但具体行为必须对照项目版本验证。[React Native Image](https://reactnative.dev/docs/Image)
- 不进行全量预取；它可能把网络问题转成更严重的解码内存峰值。

### 5. 只在证据指向列表窗口时调整现有列表

如果现有组件是 `FlatList`/`VirtualizedList`：

- 保证 `keyExtractor` 使用稳定业务 ID。
- 不把音频进度放进 `data` 或 `extraData`。
- 固定高度时才提供准确的 `getItemLayout`，并计入分隔线；可变高度不得伪造。
- 根据真机结果小步调节 `windowSize`、批量大小和批次周期，同时观察空白区域和点击响应。
- 不把 `removeClippedSubviews` 当成内存修复：官方文档明确它主要是把离屏视图从原生层级分离，并不会显著释放这些视图占用的内存，且可能带来显示问题。[Optimizing FlatList Configuration](https://reactnative.dev/docs/optimizing-flatlist-configuration)

如果当前不是这套列表，先按其现有维护契约检查窗口化，不能据此擅自迁移列表库。

## 必须在真实 RN 运行时和 Android 真机确认的结论

以下任何一项都不能由代码审阅、模拟器或 render counter 单独证明：

- 当前构建实际使用的新旧架构、renderer 和线程边界。
- 100ms 更新是否真的阻塞 JS/React 提交并造成掉帧。
- 掉帧来自 JS、UI/Layout、RenderThread、图片解码、GC，还是多者叠加。
- 行 memo 化和稳定引用是否改善用户可见帧表现。
- 列表窗口化是否正常，以及调参是否引入空白行、错误测量或滚动恢复问题。
- 内存增长是缓存平台、图片解码峰值还是可达对象/原生资源泄漏。
- 页面退出后 timer、订阅、图片资源是否释放。
- 缩略图策略对画质、流量、缓存命中和峰值内存的实际影响。
- 修改前后的慢帧/卡顿帧、输入响应和内存平台是否达到产品目标。Android 官方建议通过 FrameTimeline/系统跟踪定位卡顿，并用内存工具关联分配与 GC。[Android slow rendering](https://developer.android.com/topic/performance/vitals/render)

最终验收应是：同一真机、同一 release 产物和同一滚动脚本下，高频进度只更新其真实消费者，内存在缓存预热后形成稳定平台，慢帧显著下降，同时没有空白行、图片闪烁或播放状态错误。当前因缺少项目源码与真机产物，这些结论均尚未验证，也没有修改任何文件。