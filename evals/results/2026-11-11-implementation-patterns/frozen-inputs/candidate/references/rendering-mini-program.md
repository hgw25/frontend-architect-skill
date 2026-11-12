# Mini-Program Rendering

Read this extension after
[rendering-and-performance.md](rendering-and-performance.md) when the target is a
mini-program host with logic/view separation, host data transfer, page
lifecycle, package startup, or vendor-specific rendering tools.

## Treat host transfer as a contract

Identify the host vendor, base-library version, rendering backend, component
model, and supported performance tooling. Mini-program implementations differ;
do not assume one vendor's limits or newer rendering engine applies to another.

When the host separates a logic layer from a view or rendering layer:

- Keep non-rendered business data out of the view-transfer model.
- Send the smallest changed paths or payload that preserve correctness.
- Combine updates that are one semantic transition when batching does not delay
  required feedback.
- Avoid high-frequency full-page transfers for scroll, gesture, animation, or
  live data. Use a supported rendering-side or worklet capability only after
  confirming lifecycle and compatibility.
- Stop timers, subscriptions, animations, and view updates when a page becomes
  hidden or is destroyed unless background behavior is explicit.
- Preserve stable item identity and bound mounted nodes for large collections,
  but do not build a custom virtual-list system before data and traces justify
  it.

Startup work also includes code-package loading, page initialization, network
waterfalls, component creation, and media. Use the selected host's supported
package or subpackage, preload, cache, and interim-content capabilities for the
real startup path. Do not copy historical numeric limits for payloads, nodes,
or update frequency into a current project without checking its host version.

Validate with vendor tools and representative physical devices. Record update
frequency, payload size, and queue evidence when available, but connect them to
visible startup, input, scroll, frame, or memory outcomes.

## Primary reference

- Tencent Cloud,
  [Mini-program host environment](https://intl.cloud.tencent.com/zh/document/product/1219/61737):
  one current example of separated logic and rendering layers. Check the
  selected vendor's current documentation before using a host-specific limit or
  optimization API.
