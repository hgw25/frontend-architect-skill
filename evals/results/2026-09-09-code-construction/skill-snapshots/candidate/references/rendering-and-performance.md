# Cross-Platform Rendering and Performance

Use this reference when a frontend task involves rendering cost, repeated UI
updates, framework scheduling, layout or paint work, dropped frames, input
latency, long lists, images, memory pressure, native or host bridges, or a
performance claim across web, app, hybrid, or mini-program runtimes.

Use [runtime-and-delivery.md](runtime-and-delivery.md) instead for server/client
placement, hydration, caching, bundles, and rollout. Use
[interface-and-motion.md](interface-and-motion.md) instead for interaction
semantics, CSS, accessibility, and motion design.

## Contents

- Model the path from update to display
- Define the performance contract
- Control invalidation and transfer
- Select platform guidance
- Handle lists, media, and resource lifetime
- Optimize the measured stage
- Verify on the real runtime
- Review smells
- Platform extensions and sources

## Model the path from update to display

Do not optimize a component merely because it renders. Build the smallest
target-specific model that explains how a meaningful user action becomes a
visible result:

```text
event or data
  -> state ownership and subscriptions
  -> scheduling, derivation, and tree computation
  -> optional serialization, bridge, or process boundary
  -> host-tree mutation
  -> style and layout
  -> paint or rasterization
  -> composition and presentation
```

Not every runtime exposes every stage, and names differ across versions. Map
only the stages the selected platform and framework actually use. Identify:

- which thread, isolate, process, or queue owns each stage;
- which values cross a serialization, bridge, network, or host boundary;
- which state change invalidates which subscribers, views, or nodes;
- which work is synchronous with input or a frame deadline;
- which tree or resource has stable identity across updates;
- which lifecycle owns cancellation, teardown, and memory release.

Model initial display separately from steady-state updates. Startup, parsing,
bundle or package loading, data acquisition, and hydration can dominate first
display while scheduling, invalidation, layout, rasterization, or bridge traffic
dominates later interaction.

Rendering knowledge is useful when it predicts observable cost. Do not teach or
apply engine internals that cannot change the current design or verification.

## Define the performance contract

Before changing code for performance, record:

- the user-visible symptom and affected journey;
- target platform, framework and runtime versions, device class, refresh rate,
  and release or profile build mode;
- a reproducible baseline with representative data and interaction;
- the metric and evidence that localize the cost;
- the target, tolerance, owner, and release decision;
- correctness, accessibility, memory, energy, and maintainability constraints.

A display's nominal frame interval is approximately `1000 / refreshRate` ms,
but that is not a universal amount of application CPU time. Scheduling,
buffering, framework work, system load, and variable refresh rates affect the
real deadline. Use the target runtime's frame and hitch evidence instead of
hard-coding 16 ms as a universal pass condition.

Separate related but different symptoms:

- slow initial display or navigation;
- delayed input response;
- excessive recomputation without a missed frame;
- layout, drawing, raster, or GPU cost;
- scroll or animation jank;
- memory growth, garbage collection, or resource churn;
- network, image decode, storage, or bridge latency;
- thermal, battery, and background-work cost.

## Control invalidation and transfer

Start at the state and dependency graph before applying rendering tricks:

- Keep state at the smallest owner that can coordinate its real consumers.
- Derive display values instead of synchronizing duplicate state.
- Subscribe to the narrowest stable data required by the rendered unit.
- Preserve semantic identity for list items, host views, and retained resources.
- Batch related transitions when the framework and product semantics allow it.
- Keep expensive deterministic transformations outside repeated render paths or
  precompute them only when profiles show they matter.
- Keep high-frequency visual state close to the rendering mechanism that owns
  it when crossing a slower boundary would be the bottleneck.
- Transfer only data needed by the receiver; do not mirror an entire model into
  another thread or view layer by convenience.

Memoization is not a substitute for correct ownership. It has comparison,
allocation, retention, dependency, and cognitive costs. Use it when a measured
recomputation or unstable identity is material and the cache has a clear scope
and invalidation story. Do not add memoization to every component, callback, or
computed value.

## Select platform guidance

After applying the shared model, load only the extension for the runtime under
investigation:

- For browsers, DOM/CSS, hydration, layout, paint, layers, and composition, read
  [rendering-web.md](rendering-web.md).
- For native apps, React Native, Flutter, SwiftUI, Jetpack Compose, hybrid
  WebViews, UI threads, and raster threads, read
  [rendering-app.md](rendering-app.md).
- For mini-program logic/view separation, host transfer, page lifecycle,
  package startup, and vendor tooling, read
  [rendering-mini-program.md](rendering-mini-program.md).

Read more than one extension only when the product genuinely combines those
runtimes, such as a native shell containing a performance-sensitive WebView.

## Handle lists, media, and resource lifetime

Long collections and rich media can move cost between CPU, GPU, memory,
network, and storage:

- Use stable semantic keys and update only affected items.
- Recycle, virtualize, paginate, or incrementally render only when mounted-node
  count, item cost, or traces justify the complexity.
- Define behavior for variable item size, focus or accessibility traversal,
  scroll restoration, measurement, and rapid data changes.
- Request images near their rendered dimensions; account for decode, resize,
  upload, cache identity, interim visuals, cancellation, and reuse.
- Release listeners, timers, animation handles, decoded media, object URLs,
  native handles, and retained caches when their owner ends.
- Investigate allocation rate and garbage collection only when memory or trace
  evidence points there; do not sacrifice clear ownership to avoid ordinary
  short-lived values.

## Optimize the measured stage

Choose the smallest change that removes work from the demonstrated bottleneck:

| Symptom | Evidence to seek | Likely boundary |
| --- | --- | --- |
| Input feels delayed | input-to-update trace, long tasks, blocked UI or JS thread | event work, scheduling, synchronous I/O |
| Many views update | dependency or component profiler, update cause graph | state ownership, subscription or identity |
| Layout dominates | layout trace, repeated measurement, hierarchy cost | geometry reads/writes, constraints, tree shape |
| Paint or raster dominates | paint/raster/GPU timeline, layer and image evidence | visual effects, area, overdraw, image decode |
| Host transfer is slow | message count, payload size, queue time | bridge or logic/view contract |
| Scrolling drops frames | frame timeline with list and media traces | mounted work, recycling, image or main-thread work |
| Memory grows | heap, retained-object or resource trace | lifecycle, cache, decoded media, native handles |

After the change, repeat the same scenario and compare correctness and
tradeoffs. A lower component render count, smaller payload, or faster pure
function is only intermediate evidence unless it improves or protects the
relevant user outcome.

## Verify on the real runtime

Match evidence to the claim:

- Web: supported-browser performance and memory traces, controlled lab builds,
  and field metrics when claiming real-user impact.
- React Native or another cross-platform host: framework profiler plus native
  system trace when the boundary is unclear.
- Flutter: profile-mode Flutter DevTools frame, CPU, raster, and memory evidence.
- Android: Android Studio or system traces, frame timelines, and macro-level
  benchmarks for the affected journey.
- Apple platforms: Instruments, SwiftUI update or hitch analysis, and Organizer
  or MetricKit evidence when production impact is claimed.
- Mini-program: the selected vendor's performance tools, update-transfer
  diagnostics, package analysis, and physical-device verification.

Record runtime and framework versions, device class, refresh rate, build mode,
data size, interaction, and measurement variance. State what remains
unverified. Never claim that a theoretical property, simulator result, render
counter, or one synthetic run proves production performance.

## Review smells

- memoizing every value or component without a profile;
- treating fewer framework renders as the final user metric;
- assuming `transform` or a GPU layer is free;
- reading layout after each write inside a loop;
- recreating stable list identity or transferring whole collections for one
  changed item;
- moving work to another thread while retaining synchronous waits or excessive
  serialization;
- applying browser advice to native, canvas, or mini-program renderers;
- hard-coding one frame budget, device, or historical host limit;
- virtualizing a small collection while ignoring expensive item work;
- profiling only debug builds, simulators, or an author's flagship device;
- declaring success without repeating the original user journey.

Platform-specific primary sources live with the corresponding extension so an
agent does not load unrelated runtime documentation.
