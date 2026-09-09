# App and Cross-Platform Rendering

Read this extension after
[rendering-and-performance.md](rendering-and-performance.md) for native apps,
React Native, Flutter, SwiftUI, Jetpack Compose, hybrid WebViews, or another
app-hosted UI runtime.

## Map the actual app runtime

Identify the real UI stack before optimizing: native imperative views, a
declarative native framework, React Native, Flutter, a WebView hybrid, a game or
canvas engine, or another host. Do not call all of them a native renderer.

Map the main or UI thread, framework runtime thread or isolate, rendering or
raster thread, background workers, and any bridge or inter-process boundary.
Then determine whether the cost comes from update computation, transfer,
measurement and layout, host mutations, drawing, rasterization, image work, or
resource lifetime.

Platform examples are routing hints, not universal implementations:

- React Native's current renderer describes render, commit, and mount phases,
  with layout and host-view mutation responsibilities. Verify the project's
  architecture and version; do not repeat legacy bridge advice when that path
  does not apply.
- Flutter distinguishes widget build, persistent element and render-object
  work, layout, paint, composition, and engine rasterization. Limit rebuild and
  layout scope based on measured dependencies rather than widget count alone.
- SwiftUI and Jetpack Compose are dependency-driven declarative systems. Trace
  which observed value invalidates which view or composable, then inspect
  update, layout, drawing, main-thread, and frame evidence with platform tools.
- A hybrid WebView has both the browser pipeline and a host boundary. Include
  message serialization, navigation, lifecycle, and native-view integration;
  also read [rendering-web.md](rendering-web.md) when the browser pipeline is a
  demonstrated part of the cost.

Keep blocking I/O and expensive CPU work away from the UI-critical path, but do
not create arbitrary worker threads. Use the platform's concurrency and
scheduling model, keep UI mutation on its required owner, and account for
cancellation and result ordering.

Profile release or profile builds on representative physical devices. Debug
instrumentation, simulators, and desktop-class hardware can change scheduling,
compilation, rendering, and memory behavior. Combine the framework profiler with
native system traces when the expensive boundary is unclear.

## Primary references

- React Native,
  [Render, Commit, and Mount](https://reactnative.dev/architecture/render-pipeline).
- Flutter,
  [Architectural overview](https://docs.flutter.dev/resources/architectural-overview)
  and [Performance best practices](https://docs.flutter.dev/perf/best-practices).
- Android Developers,
  [Rendering](https://developer.android.com/topic/performance/rendering) and
  [Measure app performance](https://developer.android.com/topic/performance/measuring-performance).
- Apple Developer,
  [Improving your app's performance](https://developer.apple.com/documentation/Xcode/improving-your-app-s-performance)
  and
  [Understanding and improving SwiftUI performance](https://developer.apple.com/documentation/xcode/understanding-and-improving-swiftui-performance).
