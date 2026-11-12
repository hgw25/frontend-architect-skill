# Order form rules

This existing headless order form uses the project's `forms.js` capability.
`validateOrder(draft)` supplies field feedback; `submitOrder(draft, send)` validates
the same fields, sends once on success and propagates transport rejection.
Run `npm run check`; no dependencies, rendered application or external service exist.

The supported customer types are `personal` and `business`. Existing fields are
customerType, companyName, taxId and note. customerType is required; companyName is
required for business orders. The new product requirement makes taxId required
for business orders while keeping it optional for personal orders. There is no
new tax-ID format rule. Required emptiness remains undefined, null or ''; whitespace
keeps its existing meaning. Switching to personal must remove the business-only
required errors. All four owned fields, including optional values, still go into
the payload; unknown fields do not. Validation errors are `{ errors }` with the
message `Required`; successful submission returns `{ sent: true }`.

The existing form engine already supports boolean or draft-dependent required
rules and owns error/payload processing. Preserve these public operations and
their rejection behavior, source draft and supported field contract. Existing
manifests and test files are acceptance inputs; add separate tests if useful.
