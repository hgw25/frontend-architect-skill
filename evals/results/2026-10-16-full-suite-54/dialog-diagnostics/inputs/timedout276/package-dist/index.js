import { jsx as d } from "react/jsx-runtime";
import { createContext as K, useState as v, useId as N, useRef as T, useCallback as O, useMemo as $, forwardRef as y, useEffect as R, useContext as j, useLayoutEffect as G } from "react";
import { createPortal as U } from "react-dom";
const X = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])'
].join(","), b = [], C = /* @__PURE__ */ new Map();
let S = "";
function V(e) {
  const t = window.getComputedStyle(e);
  return t.visibility !== "hidden" && t.display !== "none" && e.getClientRects().length > 0;
}
function H(e) {
  return Array.from(e.querySelectorAll(X)).filter(
    (n) => !n.closest("[inert]") && V(n)
  ).sort((n, o) => {
    const r = n.tabIndex > 0 ? n.tabIndex : Number.MAX_SAFE_INTEGER, s = o.tabIndex > 0 ? o.tabIndex : Number.MAX_SAFE_INTEGER;
    return r - s;
  });
}
function D(e) {
  e?.focus({ preventScroll: !0 });
}
function P(e) {
  const t = e.initialFocus();
  if (t && e.content.contains(t)) {
    D(t);
    return;
  }
  D(H(e.content)[0] ?? e.content);
}
function p() {
  return b.at(-1);
}
function k(e) {
  const t = p();
  if (!t) return;
  if (e.key === "Escape") {
    t.onEscapeKeyDown?.(e), e.defaultPrevented || (e.preventDefault(), t.dismiss()), e.stopPropagation();
    return;
  }
  if (e.key !== "Tab") return;
  const n = H(t.content);
  if (n.length === 0) {
    e.preventDefault(), D(t.content);
    return;
  }
  const o = document.activeElement, r = n[0], s = n[n.length - 1];
  e.shiftKey && (o === r || !t.content.contains(o)) ? (e.preventDefault(), D(s)) : !e.shiftKey && (o === s || !t.content.contains(o)) && (e.preventDefault(), D(r));
}
function M(e) {
  const t = p();
  !t || t.content.contains(e.target) || P(t);
}
function q(e, t) {
  e.inert = t.inert, t.ariaHidden === null ? e.removeAttribute("aria-hidden") : e.setAttribute("aria-hidden", t.ariaHidden);
}
function F() {
  const e = p();
  if (!e) {
    for (const [n, o] of C) q(n, o);
    C.clear(), document.body.style.overflow = S;
    return;
  }
  for (const [n, o] of C) q(n, o);
  let t = e.content.closest("[data-dialog-portal]") ?? e.content;
  for (; t.parentElement; ) {
    const n = t.parentElement;
    for (const o of Array.from(n.children))
      !(o instanceof HTMLElement) || o === t || (C.has(o) || C.set(o, {
        ariaHidden: o.getAttribute("aria-hidden"),
        inert: o.inert
      }), o.inert = !0, o.setAttribute("aria-hidden", "true"));
    if (n === document.body) break;
    t = n;
  }
}
function z(e) {
  return b.length === 0 && (S = document.body.style.overflow, document.body.style.overflow = "hidden", document.addEventListener("keydown", k, !0), document.addEventListener("focusin", M, !0)), b.push(e), F(), queueMicrotask(() => {
    p() === e && P(e);
  }), () => {
    const t = p() === e, n = b.indexOf(e);
    n !== -1 && b.splice(n, 1), F(), b.length === 0 && (document.removeEventListener("keydown", k, !0), document.removeEventListener("focusin", M, !0)), t && queueMicrotask(() => {
      if (e.restoreFocus?.isConnected) D(e.restoreFocus);
      else {
        const o = p();
        o && !o.content.contains(document.activeElement) && P(o);
      }
    });
  };
}
function J(e) {
  return e !== null && p()?.content === e;
}
const Q = typeof window > "u" ? R : G, _ = K(null);
function g(e) {
  const t = j(_);
  if (!t) throw new Error(`${e} must be rendered inside Dialog.Root`);
  return t;
}
function W(...e) {
  return O(
    (t) => {
      for (const n of e)
        typeof n == "function" ? n(t) : n && (n.current = t);
    },
    e
  );
}
function Y({ children: e, defaultOpen: t = !1, onOpenChange: n, open: o }) {
  const [r, s] = v(t), [l, c] = v(0), [m, i] = v(0), u = N(), L = T(null), E = o !== void 0, f = E ? o : r, h = T(f), I = T(n);
  h.current = f, I.current = n;
  const w = O(
    (a) => {
      h.current !== a && (E || s(a), I.current?.(a));
    },
    [E]
  ), x = O(() => (c((a) => a + 1), () => c((a) => Math.max(0, a - 1))), []), A = O(() => (i((a) => a + 1), () => i((a) => Math.max(0, a - 1))), []), B = $(
    () => ({
      contentElement: L,
      contentId: `dialog-${u}`,
      descriptionId: `dialog-description-${u}`,
      descriptionCount: m,
      open: f,
      registerDescription: A,
      registerTitle: x,
      requestOpenChange: w,
      titleId: `dialog-title-${u}`,
      titleCount: l
    }),
    [
      f,
      m,
      u,
      A,
      x,
      w,
      l
    ]
  );
  return /* @__PURE__ */ d(_.Provider, { value: B, children: e });
}
const Z = y(function({ disabled: t, onClick: n, type: o = "button", ...r }, s) {
  const { contentId: l, open: c, requestOpenChange: m } = g("Dialog.Trigger");
  return /* @__PURE__ */ d(
    "button",
    {
      ...r,
      ref: s,
      "aria-controls": c ? l : void 0,
      "aria-expanded": c,
      "aria-haspopup": "dialog",
      "data-state": c ? "open" : "closed",
      disabled: t,
      type: o,
      onClick: (i) => {
        n?.(i), !i.defaultPrevented && !t && m(!0);
      }
    }
  );
});
function ee({ children: e, container: t }) {
  const { open: n } = g("Dialog.Portal"), [o, r] = v(!1);
  return R(() => r(!0), []), !o || !n ? null : U(/* @__PURE__ */ d("div", { "data-dialog-portal": "", children: e }), t ?? document.body);
}
const te = y(function({ onPointerDown: t, ...n }, o) {
  const { contentElement: r, open: s, requestOpenChange: l } = g("Dialog.Overlay");
  return s ? /* @__PURE__ */ d(
    "div",
    {
      ...n,
      ref: o,
      "data-state": "open",
      onPointerDown: (c) => {
        t?.(c), !c.defaultPrevented && c.target === c.currentTarget && J(r.current) && (c.preventDefault(), l(!1));
      }
    }
  ) : null;
}), ne = y(function({
  "aria-describedby": t,
  "aria-label": n,
  "aria-labelledby": o,
  initialFocusRef: r,
  onEscapeKeyDown: s,
  tabIndex: l = -1,
  ...c
}, m) {
  const i = g("Dialog.Content"), [u, L] = v(null), E = W(m, L), f = T(s), h = T(r);
  return f.current = s, h.current = r, Q(() => {
    if (!i.open || !u) return;
    i.contentElement.current = u;
    const I = document.activeElement instanceof HTMLElement ? document.activeElement : null, w = z({
      content: u,
      dismiss: () => i.requestOpenChange(!1),
      initialFocus: () => h.current?.current ?? null,
      onEscapeKeyDown: (x) => f.current?.(x),
      restoreFocus: I
    });
    return () => {
      i.contentElement.current === u && (i.contentElement.current = null), w();
    };
  }, [i.contentElement, i.open, i.requestOpenChange, u]), i.open ? /* @__PURE__ */ d(
    "div",
    {
      ...c,
      ref: E,
      "aria-describedby": t ?? (i.descriptionCount > 0 ? i.descriptionId : void 0),
      "aria-label": n,
      "aria-labelledby": o ?? (!n && i.titleCount > 0 ? i.titleId : void 0),
      "aria-modal": "true",
      "data-state": "open",
      id: i.contentId,
      role: "dialog",
      tabIndex: l
    }
  ) : null;
}), oe = y(function(t, n) {
  const { registerTitle: o, titleId: r } = g("Dialog.Title");
  return R(o, [o]), /* @__PURE__ */ d("h2", { ...t, ref: n, id: r });
}), re = y(function(t, n) {
  const { descriptionId: o, registerDescription: r } = g("Dialog.Description");
  return R(r, [r]), /* @__PURE__ */ d("p", { ...t, ref: n, id: o });
}), ie = y(function({ disabled: t, onClick: n, type: o = "button", ...r }, s) {
  const { requestOpenChange: l } = g("Dialog.Close");
  return /* @__PURE__ */ d(
    "button",
    {
      ...r,
      ref: s,
      disabled: t,
      type: o,
      onClick: (c) => {
        n?.(c), !c.defaultPrevented && !t && l(!1);
      }
    }
  );
}), le = {
  Close: ie,
  Content: ne,
  Description: re,
  Overlay: te,
  Portal: ee,
  Root: Y,
  Title: oe,
  Trigger: Z
};
export {
  le as Dialog,
  ie as DialogClose,
  ne as DialogContent,
  re as DialogDescription,
  te as DialogOverlay,
  ee as DialogPortal,
  Y as DialogRoot,
  oe as DialogTitle,
  Z as DialogTrigger
};
