# Headless Dialog

An accessible React 19 modal dialog primitive. The package owns dialog state,
layering, keyboard and focus behavior; consuming products own all copy, actions,
layout and visual styling.

## Public API

```tsx
import { Dialog } from '@fixture/headless-dialog'

<Dialog.Root defaultOpen={false} onOpenChange={(open) => {}}>
  <Dialog.Trigger className="button">Edit profile</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="overlay">
      <Dialog.Content className="panel">
        <Dialog.Title>Edit profile</Dialog.Title>
        <Dialog.Description>Update your public information.</Dialog.Description>
        {/* Product fields and actions belong here. */}
        <Dialog.Close className="button">Cancel</Dialog.Close>
      </Dialog.Content>
    </Dialog.Overlay>
  </Dialog.Portal>
</Dialog.Root>
```

`Root` accepts either `defaultOpen` (uncontrolled) or `open` plus
`onOpenChange` (controlled). `Portal.container` selects a portal host. Every DOM
primitive forwards its ref and accepts the corresponding native element props,
including `className`, `style`, `data-*` and event handlers. A consumer handler
can prevent the primitive action with `event.preventDefault()`.

`Content` supports `initialFocusRef`, `finalFocusRef`, `onOpenAutoFocus`,
`onCloseAutoFocus`, `onEscapeKeyDown` and `onPointerDownOutside`. Preventing one
of the cancelable events suppresses its default behavior. Include `Title` and
`Description` so the generated stable IDs provide the accessible name and
description; when supplying `aria-label`, it becomes the name instead. If a
custom `Title.id` or `Description.id` is used, pass the matching ARIA ID to
`Content`.

## Behavioral boundary

- The most recently mounted open dialog is the active modal layer. Only it
  handles Escape, outside interaction and focus containment.
- Opening focuses `initialFocusRef`, an `autofocus` descendant, the first
  tabbable descendant, or `Content` in that order. Closing restores
  `finalFocusRef` or the local trigger when it is still connected.
- Non-active DOM branches are restored after each layer closes; existing
  `aria-hidden` and `inert` values are preserved. This also makes nested dialogs
  restore their parent before the page.
- Portal DOM is created only after a browser effect. Server output and the first
  hydration render agree even for `defaultOpen`; content appears immediately
  after hydration. `useId` keeps ARIA IDs stable.
- The package intentionally provides no CSS, z-index policy, product copy,
  close label or business action. Consumers may omit `Overlay`, but `Content`
  remains modal and outside interaction still dismisses it by default.

## Release verification matrix

| Contract | Automated evidence | Release expansion |
| --- | --- | --- |
| Uncontrolled and controlled state | Nested dialog uses uncontrolled state; profile dialog uses controlled state in Playwright | Consumer smoke test for each product adapter |
| Focus entry, loop, escape and restoration | Chromium Playwright keyboard assertions | Firefox and WebKit on supported CI |
| Nested layering and local restoration | Chromium nested-dialog test | Screen-reader pass on one desktop platform |
| Role, name, description, modal state and background isolation | Chromium accessibility locators and DOM assertions | axe scan and forced-colors inspection |
| Portal and consumer styling | Browser assertions against body portal and public classes | Product visual regression stories |
| SSR and hydration-safe first render | Node `renderToString` tests for closed and default-open roots | Framework SSR/hydration smoke test in each supported host |
| Published ESM and declarations | Library build plus import of the built public entry | `npm pack` install in a clean consumer fixture |

The local `npm run check` executes the current automated column. Browser/version
and assistive-technology coverage should be promoted into release CI before the
package claims those platforms as supported.

## Incremental migration

1. Add a thin product adapter around this API that keeps the old product
   component's props and renders its existing copy, actions and classes through
   the primitive. Do not switch all three products at once.
2. Migrate one representative dialog first. Run its existing user-flow tests
   plus the primitive matrix, and release it behind the product's normal rollback
   boundary.
3. Move remaining dialogs one at a time. Map old `isOpen`/`onClose` contracts to
   controlled `open`/`onOpenChange`; map initial focus and portal hosts explicitly.
   Keep product-specific close policy in the adapter by preventing Escape or
   outside events when necessary.
4. After all callers use the adapter, remove each legacy focus trap and global
   Escape listener. Then replace adapter imports with the compound API where that
   improves composition, and remove the adapter only after repository search and
   product tests prove it has no callers.

Rollback stays local during the migration: revert a product adapter to its old
implementation without changing the primitive or already-migrated products.
