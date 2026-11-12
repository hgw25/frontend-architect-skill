# Browser Rendering

Read this extension after
[rendering-and-performance.md](rendering-and-performance.md) when the target is
a browser, DOM/CSS surface, or browser-backed rendering path.

## Map browser work to pixels

Distinguish the initial critical rendering path from later frame updates. A
useful high-level update model is:

```text
JavaScript or CSS -> style -> layout -> paint/raster -> composite
```

The engine may optimize, skip, defer, or parallelize stages. Use browser traces
rather than treating the diagram as a guarantee.

- Keep DOM and style invalidation proportional to the visible change.
- Avoid interleaving geometry reads with DOM or style writes when that forces
  repeated synchronous layout. Batch reads and writes around one owned update.
- Prefer compositor-friendly animation when it preserves the intended result,
  but verify paint area, layer count, memory, text quality, and device behavior.
- Use containment, offscreen rendering controls, virtualization, or progressive
  rendering only when content, accessibility, browser support, and measurement
  justify them.
- Reserve dimensions for images and asynchronous content when layout movement
  harms the user experience.
- Treat hydration and client takeover as correctness boundaries as well as
  performance work; a faster mismatch is still a defect.

Use a real supported browser for layout, focus, paint, scrolling, animation,
hydration, and memory claims. A DOM emulator cannot demonstrate these stages.
When claiming field impact, connect controlled traces to representative user
metrics instead of extrapolating from one local run.

## Primary references

- web.dev, [Rendering performance](https://web.dev/articles/rendering-performance):
  JavaScript, style, layout, paint, and composite stages.
- React, [Render and Commit](https://react.dev/learn/render-and-commit): rendering
  a component is distinct from committing changes to the DOM.
