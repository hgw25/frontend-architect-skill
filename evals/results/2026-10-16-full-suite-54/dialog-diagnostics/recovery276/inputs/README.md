# Headless Dialog primitive

This package centralizes the modal behavior that was previously implemented by each product. It deliberately owns state coordination, accessible relationships, portal mounting, focus containment/restoration, top-layer Escape handling, background isolation, and lifecycle cleanup. Products continue to own copy, actions, layout, color, and motion.

## Public API

```tsx
import { Dialog } from 'frontend-architect-dialog-browser-eval'

<Dialog.Root defaultOpen={false} onOpenChange={(open, reason) => setOpen(open)}>
  <Dialog.Trigger className="trigger">Edit profile</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="overlay">
      <Dialog.Content className="panel">
        <Dialog.Title>Edit profile</Dialog.Title>
        <Dialog.Description>Update your public information.</Dialog.Description>
        {/* Product fields and actions stay here. */}
        <Dialog.Close className="secondary">Cancel</Dialog.Close>
      </Dialog.Content>
    </Dialog.Overlay>
  </Dialog.Portal>
</Dialog.Root>
```

The same components are available as named exports. `Root` supports `open` plus `onOpenChange` for controlled state and `defaultOpen` for uncontrolled state. The change reason is one of `trigger`, `close-button`, `escape-key`, or `outside-pointer`. A controlled consumer must apply the requested state change.

`Portal` accepts an optional `container`. `Content` accepts native `div` props, `role="dialog" | "alertdialog"`, `initialFocusRef`, `onEscapeKeyDown`, and `onPointerDownOutside`; preventing either native event cancels that dismissal. `Trigger`, `Close`, `Title`, `Description`, and `Overlay` forward native props and refs, so consumers style them with their existing classes or data selectors. No CSS ships with the package. `data-state` is exposed on the trigger, overlay, and content.

Every modal needs `Title`, unless `Content` receives an explicit `aria-label` or `aria-labelledby`. `Description` is optional and is associated only when mounted. One `Content` is supported per `Root`. Nested roots are supported; only the top content owns focus, outside-pointer dismissal, and Escape.

## Runtime and package boundary

The public entry point is `src/index.ts`; focus discovery and the document layer manager are private. Portal DOM creation occurs in an effect, so server rendering never reads browser globals and the first hydration render matches the server. An initially open portal appears after hydration. React and React DOM are peers (`^19.1.0`) to preserve their singleton ownership in each product; widen that range only after running the matrix against another release line.

`npm run build:package` emits an ESM bundle and declarations under `dist/package`. Package exports expose only the root entry point and package metadata; private focus and layer modules cannot become accidental imports. `npm run test:package` audits the packed file list and export targets.

## Verification matrix

| Contract | Automated evidence | Release expansion |
| --- | --- | --- |
| Accessible name/description and modal state | Playwright role and ARIA assertions | Screen-reader smoke test in one product |
| Initial focus, forward/reverse trap, programmatic escape prevention, restoration | Playwright in Chromium | Chromium, Firefox, and WebKit for each supported browser baseline |
| Escape and outside pointer | Playwright, including nested top-layer ordering | Touch-device smoke test |
| Controlled and uncontrolled state | Controlled parent and uncontrolled nested example in Playwright | Product integration tests |
| Portal and background isolation | Playwright DOM placement plus `inert` assertions | Custom-container integration where used |
| SSR and hydration | Node `renderToString` tests plus a Playwright `hydrateRoot` path, including `defaultOpen` | Framework hydration test in each SSR product |
| Public types and artifact | `tsc`, library build, and `npm pack --dry-run` | Install the tarball in a representative consumer before publishing |

The repository's full local gate is `npm run check`. It performs type checking, server rendering tests, real-browser behavior tests, the example build, the library/declaration build, and a package dry run.

## Migration of the three products

1. Publish a prerelease and migrate one low-risk dialog by replacing its local state shell with `Root`, `Trigger`, `Portal`, `Overlay`, and `Content`. Keep its product component, copy, actions, analytics, and CSS unchanged.
2. Run that product's keyboard, screen-reader, and visual checks. Map any intentional dismissal policy through `onEscapeKeyDown` or `onPointerDownOutside`; do not fork focus management.
3. Migrate the other products independently. Controlled workflows pass their existing state into `open`; local workflows use `defaultOpen`. Nest a new `Root` rather than coordinating parent and child Escape handlers.
4. Remove each legacy implementation only after its product checks pass. The previous product component remains the rollback seam until all consumers use the released primitive.
5. After all three migrations, forbid private deep imports and delete duplicated focus/Escape utilities. Promote only demonstrated cross-product styling tokens into a separate styled layer; keep this primitive headless.

A future request such as adding a destructive `alertdialog` variant changes product composition and the `Content` role, not focus or layer ownership. Supporting non-modal dialogs would be a separate primitive because it changes the focus, isolation, and dismissal contract.
