## 评审结论

**高危：当前组件存在存储型 XSS 风险。**

`html` 来自用户，而 `dangerouslySetInnerHTML` 会绕过 React 的自动转义，直接写入 HTML sink。后端“过滤过”不是可验证的安全契约：未知允许哪些标签、属性和 URL scheme，也未知历史内容、导入及编辑路径是否执行同一策略。

典型攻击面包括：

- `<img onerror=...>` 等事件属性
- `<a href="javascript:...">`
- `<script>`、`iframe`、`object`、`form`
- SVG/MathML、畸形嵌套和编码后的危险 URL
- `style` 或其他属性造成内容伪装和 UI 欺骗

不能用正则、黑名单或简单替换解决。

## 最小、可维护的修复

保留富文本，但把“允许什么”集中在一个边界中。前端使用维护中的 allowlist sanitizer，例如 DOMPurify；所有文章正文只通过该组件进入原始 HTML sink。

```tsx
import { useMemo } from "react";
import DOMPurify from "dompurify";

const ARTICLE_HTML_POLICY = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "em",
    "s",
    "blockquote",
    "ul",
    "ol",
    "li",
    "code",
    "pre",
    "a",
  ],
  ALLOWED_ATTR: ["href", "title"],
  ALLOW_DATA_ATTR: false,
} satisfies Parameters<typeof DOMPurify.sanitize>[1];

function sanitizeArticleHtml(untrustedHtml: string): string {
  return DOMPurify.sanitize(untrustedHtml, ARTICLE_HTML_POLICY);
}

export function ArticleBody({ html }: { html: string }) {
  const safeHtml = useMemo(() => sanitizeArticleHtml(html), [html]);

  return <article dangerouslySetInnerHTML={{ __html: safeHtml }} />;
}
```

关键决定：

- 标签和属性按产品需求明确列举；不要直接采用 sanitizer 较宽的默认 HTML 集合。
- 不允许 `style`、事件属性、`target`、`src`、SVG/MathML。若产品确实需要它们，应逐项设计策略。
- DOMPurify 会处理危险 URL scheme，但仍应把 `http`、`https`、相对链接，以及是否允许 `mailto`/`tel` 写成测试契约。
- 默认不允许 `target="_blank"`。若必须新窗口打开，由组件统一补充 `rel="noopener noreferrer"`，不要接受用户提供的任意 `target`/`rel`。
- 不提供 `alreadySanitized`、`skipSanitize` 之类绕过入口。
- 若存在 SSR，应使用项目支持的服务端 DOM 实现，或在后端按同一策略生成稳定结果；服务端与客户端策略不一致会产生 hydration 差异。

后端仍应把净化作为权威内容契约：所有创建、编辑和导入入口使用同一套有版本的 allowlist，并明确历史数据在策略收紧后如何重新净化。前端这层保护的是实际 DOM sink，不应因为一句“过滤过”而移除；同时不要在多个页面复制不同 sanitizer 配置。

## 验证方案

为 `sanitizeArticleHtml` 建立一组固定回归样本，至少验证：

- `p`、列表、强调、代码块和正常链接被保留。
- `script`、`iframe`、`object`、`form`、SVG/MathML 被移除。
- `onclick`、`onerror`、`style`、未知属性被移除。
- `javascript:`、`data:`、`vbscript:` 及大小写、空白、实体编码变体不能留下可点击危险链接。
- `https:`、`http:`、相对链接和锚点按约定保留；`mailto:`/`tel:` 根据产品决定。
- 被允许标签中的危险嵌套不会逃逸净化。

再用真实浏览器做一个组件级检查：

1. 通过组件渲染攻击样本。
2. 断言 DOM 中不存在禁用标签、事件属性和危险 `href`。
3. 点击保留的合法链接，确认导航行为符合约定。
4. 监听弹窗、意外导航和网络请求；但不能只以“没有弹窗”作为安全证明。

服务端应增加一条贯穿创建/编辑、持久化、读取的集成测试，证明每个写入入口执行相同策略。

## CSP 的角色

CSP 是第二道防线，不是 sanitizer：

- 它可以降低漏网 XSS 执行脚本的概率。
- 它不能从 DOM 中移除恶意 HTML，也不能充分阻止钓鱼式 UI、危险导航或允许能力下的滥用。
- 如果策略包含宽泛的 `'unsafe-inline'`、`'unsafe-eval'` 或不受控域名，其保护会明显减弱。

生产环境应通过 HTTP 响应头部署，并根据实际资源收紧，例如：

```text
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-<每响应随机值>';
  object-src 'none';
  base-uri 'none';
  frame-ancestors 'none';
```

`connect-src`、`img-src`、`style-src` 应按应用真实依赖补齐，不能机械照抄。建议先用 `Content-Security-Policy-Report-Only` 收集违规，再切换为强制模式，并验证响应头而非只测页面源码。Trusted Types 可作为后续对 HTML sink 的额外约束，但需要确认 React 版本和现有 sink 的兼容性，不应阻塞上述 sanitizer 修复。

工作区没有应用源码、依赖清单或测试配置，因此本次仅能审查给定片段，未执行项目构建或自动化测试，也无法确认现有 CSP。