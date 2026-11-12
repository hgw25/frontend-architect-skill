# Security and Trust Boundaries

Use this reference when frontend work handles untrusted data, HTML or URL sinks,
authentication, authorization, secrets, tokens, uploads, third-party code,
telemetry, or other security-sensitive browser capabilities.

## Trace data from source to sink

Scale defenses to the actual source, sink and protected capability. Reuse the
project's established boundary checks; internal consumers of validated data can
rely on that contract until a new trust boundary or mutation invalidates it.
Do not add repeated validation, generic sanitizers or catch-and-default wrappers
merely because a value could hypothetically be wrong. Preserve necessary boundary
checks and context-specific output safety; fix the responsible boundary when its
contract is insufficient rather than distributing compensating checks everywhere.

Identify:

- untrusted sources such as network responses, URLs, storage, messages, files,
  user content, and third-party scripts;
- validation and normalization boundaries;
- output contexts such as text, HTML, attributes, URLs, CSS, script, and DOM APIs;
- privileged capabilities such as navigation, clipboard, camera, payments, and
  account mutations;
- which server decision is authoritative.

Runtime validation establishes that data has the expected shape and domain.
Output safety depends on the destination context. Generic input sanitization is
not a substitute for safe rendering APIs and context-appropriate handling.

## Prefer safe output paths

- Render untrusted content as text through framework escaping or `textContent`
  when rich HTML is not required.
- Treat raw HTML APIs, dynamic script execution, HTML string construction, and
  unsafe URL schemes as high-risk sinks.
- When a product genuinely requires user-authored HTML, use a maintained,
  allowlist-based sanitizer at a clear boundary and test the configured policy.
- Validate navigation and resource URLs against allowed schemes and, when
  required, origins. Prevent attacker-controlled open redirects.
- Treat JSON serialization as data serialization, not automatic HTML or script
  output encoding.

Content Security Policy and Trusted Types can reduce exploitability, but they
are defense in depth. They do not justify unsafe sinks or replace correct output
handling.

## Separate presentation from authorization

Client-side route guards and hidden buttons improve the interface; they do not
protect data or mutations. Enforce authentication, authorization, tenancy, and
resource ownership at the authoritative server boundary for every privileged
operation.

This security requirement does not expand a frontend task into unauthorized
backend work. When the authoritative server is outside the requested scope,
define the required server contract, keep the client behavior non-authoritative,
and report the unresolved enforcement boundary instead of simulating it in the
browser.

Return the minimum data required by the interface. Do not fetch a full record and
hide sensitive fields only during rendering. Treat identifiers, role claims,
prices, permissions, and mutation payloads from the browser as untrusted.

## Keep secrets and sessions in the right environment

- Never place private keys, service credentials, or privileged tokens in browser
  bundles, public environment variables, rendered payloads, logs, or source maps.
- Choose session storage and cookie attributes from the actual XSS, CSRF,
  subdomain, lifetime, and deployment model. Do not recommend `localStorage` or
  cookies as universally secure.
- `HttpOnly`, `Secure`, and `SameSite` cookie policy must be set by the server and
  paired with appropriate CSRF defenses when the browser sends credentials
  automatically.
- Clear sensitive state on logout and account changes without assuming that
  clearing UI state revokes a server session.

## Bound third-party and supply-chain risk

Before adding a script, SDK, widget, or dependency, check:

- what data and browser capabilities it can access;
- whether it runs before consent or on sensitive pages;
- bundle, performance, maintenance, and incident history;
- whether it can be isolated, delayed, self-hosted, integrity-checked, or
  restricted by CSP;
- how it is disabled during an incident.

Do not expose DOM nodes, access tokens, full user objects, or unrestricted event
payloads to analytics and embedded code by default.

## Treat uploads as untrusted workflows

Client file names, MIME types, extensions, dimensions, and previews are hints,
not authoritative validation. Bound size and count early for feedback, but
require the receiving service to validate content, storage identity, access, and
processing. Avoid rendering active content in unsafe contexts; isolate previews
when necessary. Model progress, cancellation, retry, partial completion, and
duplicate submission, and revoke temporary object URLs or resources when their
owner is disposed. Do not log file contents or sensitive names by default.

## Verify abuse paths proportionately

Relevant checks may include:

- hostile rich text, attributes, and URL schemes at dangerous sinks;
- direct unauthorized requests even when the UI hides the action;
- cross-tenant identifiers and stale permission state;
- CSRF behavior for cookie-authenticated mutations;
- secrets in generated client assets, logs, telemetry, and source maps;
- third-party failure, blocking, and disabled-consent paths;
- CSP or Trusted Types reports where the project uses them.

Add focused regression tests for plausible high-impact failures. Do not invent a
security framework for a low-risk local display change, but do not downgrade a
trust-boundary issue to a styling concern.

## Primary references

- OWASP,
  [Cross-Site Scripting Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html):
  output handling depends on context and safe sinks.
- OWASP,
  [DOM-based XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html):
  prefer safe DOM APIs and keep untrusted values out of executable contexts.
- OWASP,
  [Content Security Policy](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html):
  CSP is a defense-in-depth control rather than the only XSS defense.
