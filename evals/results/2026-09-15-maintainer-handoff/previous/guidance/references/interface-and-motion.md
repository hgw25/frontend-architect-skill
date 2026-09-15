# Interface, Layout, and Motion

Use this reference for HTML, CSS, responsive layout, design systems,
interaction, accessibility, animation, FLIP, and perceived performance.

Use [rendering-and-performance.md](rendering-and-performance.md) instead when
the dominant concern is measured update-to-display, thread, layout, paint,
rasterization, frame, list, image, or memory cost rather than interface behavior.

## Contents

- Build the semantic and resilient layer first
- Design layout from content and constraints
- Choose component-system boundaries
- Control styles and internationalized content
- Specify interaction as behavior
- Use motion to explain change
- Choose the lightest transition mechanism
- Apply FLIP deliberately
- Protect accessibility and performance
- Influences

## Build the semantic and resilient layer first

Start with the simplest layer that communicates the content and supports the
primary task:

1. Semantic HTML and native browser behavior.
2. CSS for layout, presentation, and supported state expression.
3. JavaScript for behavior the platform layer cannot provide alone.
4. Framework and advanced enhancement where product complexity justifies them.

Progressive enhancement does not require every experience to work identically
without JavaScript. It requires a deliberate baseline and avoids turning an
optional enhancement failure into total loss of content or control when a
resilient fallback is practical.

Prefer native controls when their semantics and behavior fit. A custom control
inherits responsibility for keyboard operation, focus, disabled behavior,
labels, form participation, and assistive-technology semantics.

## Design layout from content and constraints

Prefer intrinsic and container-aware layout over device-specific pixel patches.

- Let content, available space, and min/max constraints participate in sizing.
- Use Grid, Flexbox, logical properties, `minmax()`, `clamp()`, and container
  queries when supported and appropriate.
- Add breakpoints where the content or interaction breaks, not for a catalog of
  device widths.
- Preserve document order and reading order; do not use visual reordering to
  create an inaccessible focus sequence.
- Test narrow, wide, zoomed, translated, and long-content states.
- Avoid fixed heights for text-bearing regions unless overflow behavior is part
  of the design.

CSS is a constraint system, not a list of screenshots. Prefer rules that explain
the intended relationship between elements.

## Choose component-system boundaries

Use design-system primitives for stable visual and behavioral policy: tokens,
typography, spacing, controls, focus treatment, and common interaction patterns.
Keep product-specific meaning in product components.

Atomic Design is a useful lens for seeing both the whole interface and reusable
parts. It is not a mandatory folder hierarchy. Promote a component into a shared
system only when it has stable cross-context semantics, documented variants,
accessibility behavior, and an owner for future change.

Avoid a universal component whose API is a long list of flags. Prefer:

- clear variants for a coherent concept;
- slots or composition for structural differences;
- separate components when behavior and reasons for change diverge;
- tokens for controlled visual choices rather than arbitrary values everywhere.

## Control styles and internationalized content

Give CSS the smallest practical ownership boundary. Prefer project-native
scoping, semantic tokens, and documented public styling hooks. Keep global
resets, utility layers, component styles, product overrides, and third-party CSS
in an intentional cascade order; use cascade layers only when the supported
environment and existing system can adopt them coherently. Avoid specificity
escalation, arbitrary global selectors, and private DOM selectors as consumer
APIs. Verify themes, forced colors, zoom, long content, and token changes at the
real consuming boundary.

Do not concatenate translatable sentences or assume word order, string length,
or a left-to-right layout. Use message keys with locale-aware plural selection
and platform or established-project formatters for dates, times, numbers, and
currencies. Set document or subtree language, use logical CSS properties, and
test bidirectional content when RTL or mixed-direction text is supported.
When rendered output varies by locale or timezone, make them explicit inputs at
server/client boundaries so hydration does not depend on each environment's
defaults.

## Specify interaction as behavior

For each interactive element, define:

- trigger and expected outcome;
- mouse, touch, and keyboard operation;
- focus entry, movement, restoration, and escape behavior;
- disabled versus unavailable semantics;
- loading, success, error, undo, and retry feedback;
- repeated activation and interruption behavior;
- behavior under slow network or partial rendering;
- announcements needed for dynamic updates.

Use established accessible patterns for dialogs, menus, listboxes, tabs,
tooltips, comboboxes, and disclosures. ARIA does not repair incorrect interaction
behavior; prefer native semantics and verified patterns.

## Use motion to explain change

Motion should reduce the cognitive cost of understanding an interface. Give it
at least one job:

- show where an element came from or went;
- preserve spatial continuity after layout changes;
- connect an action with its result;
- communicate hierarchy, focus, progress, or state transition;
- make direct manipulation feel physically coherent.

Avoid motion that delays common actions, competes with the task, hides latency,
or exists only to signal visual sophistication.

Specify motion using:

- semantic states, not scattered timeouts;
- durations and easing appropriate to distance and context;
- interruption, cancellation, and rapid repeated input behavior;
- ownership and cleanup on navigation or unmount;
- reduced-motion behavior;
- a static final state that remains correct if animation fails.

Prefer `transform` and `opacity` when they can express the effect without
changing layout on every frame. Do not promote elements to compositor layers
indiscriminately; layers also consume memory and have costs.

## Choose the lightest transition mechanism

Choose by the relationship the user needs to understand, not by technique
novelty:

1. Use no animation when the change is already obvious or motion would delay the
   task.
2. Use a CSS transition or animation for a local property change whose start and
   end states are stable in the DOM.
3. Consider the View Transitions API for page or DOM-state changes that can be
   expressed as old and new visual snapshots. Treat it as progressive
   enhancement, verify current framework and browser behavior, and keep the
   non-transition path correct.
4. Use FLIP when spatial continuity matters, geometry must be measured, and the
   platform transition cannot express the required mapping or control.
5. Use the Web Animations API or a focused animation library when sequencing,
   interruption, gesture coupling, or lifecycle orchestration justifies it.

Do not stack several mechanisms for the same transition without a clear owner.
Whichever mechanism is selected must define cancellation, rapid repeated input,
cleanup, and reduced-motion behavior.

## Apply FLIP deliberately

FLIP is a technique for turning a layout change into an inexpensive visual
transition:

1. **First**: measure the initial geometry.
2. **Last**: apply the final layout and measure its geometry.
3. **Invert**: calculate the delta and visually move/scale the element back to
   its initial appearance with a transform.
4. **Play**: animate the inversion away so the element reaches the final layout.

Use FLIP when:

- a list, grid, card, or shared element changes layout;
- initial and final geometry can be measured reliably;
- a simple CSS transition cannot express the relationship;
- spatial continuity materially helps comprehension.

Do not use FLIP by reflex. Before implementing it:

- batch DOM reads and writes to avoid layout thrashing;
- define what happens if input arrives mid-animation;
- account for scrolling, transforms, resize, and element removal;
- avoid animating distorted content when scale is inappropriate;
- clean up inline styles and animation handles;
- provide a reduced-motion path, often an immediate update or short fade;
- profile on representative devices rather than assuming compositor work is
  automatically cheap.

The invariant is that the real DOM reaches the correct final layout before the
visual inversion plays. Animation state must not become a second source of
business truth.

## Protect accessibility and performance

Accessibility checks:

- semantic name, role, state, and value;
- keyboard reachability and logical focus order;
- visible focus and focus restoration;
- target size and touch behavior;
- sufficient contrast and non-color state cues;
- zoom, text resizing, forced colors, and high contrast where relevant;
- `prefers-reduced-motion` and user control for persistent motion;
- announcements for asynchronous changes when required.
- a non-dragging single-pointer alternative for drag interactions;
- focus is not fully obscured by sticky or overlay content;
- repeated information is not needlessly re-entered and authentication does not
  rely only on a cognitive-function test when the applicable conformance target
  includes these WCAG 2.2 criteria.

Treat target size as a tested interaction constraint, not a visual preference.
When visual density requires a smaller visible control, preserve an adequate
click or touch area without overlapping adjacent targets.

Performance checks:

- optimize the critical user path, not isolated microbenchmarks;
- avoid unnecessary network waterfalls and duplicate requests;
- reserve space for media and async content to limit layout shift;
- virtualize or paginate only when data size demonstrates the need;
- avoid broad memoization without evidence;
- inspect rendering, layout, paint, and scripting costs for animation issues;
- measure before and after material optimization.

Use RAIL as a mental model—response, animation, idle, and load—but validate with
current product metrics and representative hardware.

## Influences

- W3C CSS Working Group,
  [CSS View Transitions Module Level 1](https://www.w3.org/TR/css-view-transitions-1/):
  visual transitions remain an enhancement over a correct underlying document
  state change.
- Paul Lewis, [FLIP Your Animations](https://aerotwist.com/blog/flip-your-animations/):
  First, Last, Invert, Play and compositor-friendly transitions.
- web.dev, [RAIL](https://web.dev/articles/rail): response and frame-budget
  thinking.
- web.dev,
  [Animation and motion accessibility](https://web.dev/learn/accessibility/motion):
  reduced-motion preferences and user control.
- Brad Frost, [Atomic Design](https://atomicdesign.bradfrost.com/chapter-2/):
  interfaces as systems of related parts and wholes.
- Heydon Pickering,
  [Inclusive Components](https://inclusive-components.design/): robust UI
  patterns designed around diverse users.
- Jen Simmons,
  [Intrinsic Web Design](https://talks.jensimmons.com/eK4aDd/everything-you-know-about-web-design-just-changed):
  layouts driven by content, space, and modern CSS capabilities.
- W3C, [What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/):
  focus visibility, dragging alternatives, target size, redundant entry, and
  accessible authentication criteria.
- W3C Internationalization,
  [Language on the Web](https://www.w3.org/International/getting-started/language):
  language metadata, direction, and locale-aware content behavior.
- Jeremy Keith, [Resilient Web Design](https://resilientwebdesign.com/): layered,
  user-centered resilience.
