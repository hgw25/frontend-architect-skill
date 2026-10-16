# Headless Dialog primitive

This package owns modal dialog behavior shared by the three React products. It intentionally
does not own product copy, actions, layout, animation, or visual tokens.

## Public API

Import the namespace API or the individually named exports from `@fixture/headless-dialog`:

```tsx
<Dialog.Root defaultOpen={false} onOpenChange={(open, { reason }) => setOpen(open)}>
  <Dialog.Trigger className="button">Edit profile</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="overlay">
      <Dialog.Content className="panel">
        <Dialog.Title>Edit profile</Dialog.Title>
        <Dialog.Description>Update your public information.</Dialog.Description>
        {/* Product fields and actions stay in the product. */}
        <Dialog.Close className="button">Cancel</Dialog.Close>
      </Dialog.Content>
    </Dialog.Overlay>
  </Dialog.Portal>
</Dialog.Root>
```

- `Root` accepts either `defaultOpen` (uncontrolled) or `open` (controlled), plus
  `onOpenChange(open, { reason })`. The type prevents supplying `open` and `defaultOpen`
  together.
- `Trigger`, `Content`, `Title`, `Description`, `Overlay`, and `Close` forward refs and native
  element props, including `className`, `style`, and `data-*` styling hooks.
- `Portal` targets `document.body` by default and accepts a `container` for product-specific
  layering roots. It renders nothing during SSR and the first hydration render, then mounts on
  the client without a server/client tree mismatch.
- `Content` accepts `initialFocusRef` and `onEscapeKeyDown`. Preventing the Escape event keeps
  the dialog open. Supply `Title` and `Description`; an `aria-label` or explicit ARIA reference
  may replace `Title` when a visible title is intentionally absent.

The primitive assigns stable React IDs, `role="dialog"`, `aria-modal`, labeling references,
focus entry/loop/restoration, background isolation, outside dismissal, and top-layer-only
Escape behavior. Nested dialogs share an internal layer stack; the stack and focus-scope module
remain private package implementation.

## Implementation boundaries

- `Root` is the only open-state owner and translates user actions into typed change reasons.
- `Portal` alone crosses the server/browser and DOM-container boundary.
- `Content` mounts the private focus scope. That module owns the modal layer stack, background
  isolation, keyboard routing, focus looping, and restoration cleanup; nested products do not
  coordinate these effects themselves.
- `Trigger`, `Overlay`, `Title`, `Description`, and `Close` only compose native element props
  with the invariant behavior they own. They contain no product content or CSS.
- `src/index.ts` is the source boundary and the package `exports` map exposes only the compiled
  entry. Internal focus and layer helpers cannot be imported through a package subpath.

## Test matrix

| Contract | Automated evidence | Additional release coverage |
| --- | --- | --- |
| Focus enters, loops, cannot escape, and restores | Playwright keyboard and programmatic-focus checks | Screen-reader smoke test in each product shell |
| Escape and outside click dismiss | Playwright, including trigger restoration | Touch outside interaction on supported mobile browsers |
| Nested dialogs only dismiss the top layer | Playwright two-level scenario | Product layering/z-index visual regression |
| Accessible name, description, and modal state | Playwright accessibility locators/assertions | axe and NVDA/VoiceOver smoke tests |
| Controlled and uncontrolled ownership | Demo uses controlled parent and uncontrolled child | Consumer type test for invalid mixed ownership |
| SSR safety | Vitest server rendering of closed and initially-open roots | Hydration test in each supported SSR framework |
| Public package artifact | Library build plus declaration emit | `npm pack --dry-run` and a minimal consumer install before release |

Chrome is the fixture's current claimed browser lane. Add Firefox/WebKit to Playwright before
claiming those engines as supported.

## Migration

Migrate one product at a time so rollback remains local:

1. Replace the product's state wrapper with `Dialog.Root`; keep its existing controlled state or
   use `defaultOpen` when no external owner exists.
2. Move existing trigger, heading, description, body, and buttons into the matching compound
   parts. Keep all product copy and business callbacks in the product.
3. Move existing overlay/panel class names to `Dialog.Overlay` and `Dialog.Content`. Remove old
   focus traps, document key listeners, portal calls, and ARIA ID generation only after the new
   browser checks pass.
4. Exercise keyboard, nested-dialog, outside-click, and focus-return paths in the real product
   shell. Release behind the product's normal staged rollout if its previous Escape or outside
   click behavior differs.
5. After all three products migrate, delete their local Dialog implementations and prohibit
   private imports; consumers use only the package export.

The likely next change—adding an alert-dialog variant—belongs in a separate semantic Content
variant/export with its own keyboard and labeling tests, rather than a product-mode boolean on
this dialog.
