## 评审结论

**高风险：当前组件把字符串直接送入 HTML sink。**

```tsx
dangerouslySetInnerHTML={{ __html: html }}
```

React 不会对这里的内容做转义或过滤。只要后端过滤存在遗漏、配置回退、历史脏数据或绕过，攻击者就可能执行存储型 XSS。仅凭“后端过滤过”的口头保证，无法判定当前实现安全；需要明确其 sanitizer、允许列表及测试证据。

## 最小、可维护的修复

保留富文本，但在这个唯一的渲染边界使用项目已有的成熟 HTML sanitizer；如果项目没有，可采用 DOMPurify。不要自行用正则或黑名单过滤。

客户端渲染时可采用类似结构：

```tsx
import DOMPurify from "dompurify";
import { useMemo } from "react";

const ARTICLE_HTML_POLICY = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "em",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
    "a",
  ],
  ALLOWED_ATTR: ["href", "title"],
  ALLOW_DATA_ATTR: false,
} satisfies DOMPurify.Config;

function sanitizeArticleHtml(input: string): string {
  return DOMPurify.sanitize(input, ARTICLE_HTML_POLICY);
}

export function ArticleBody({ html }: { html: string }) {
  const sanitizedHtml = useMemo(() => sanitizeArticleHtml(html), [html]);

  return (
    <article dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
  );
}
```

关键决策：

- 允许列表应来自产品需求，而不是 DOMPurify 默认集合；上例仅为最小候选，需要确认真实格式。
- 链接协议也必须有明确策略，例如只允许相对 URL、`https:`，以及确实需要时的 `mailto:`。不要打开 `ALLOW_UNKNOWN_PROTOCOLS`，也不要随意自定义宽松正则。
- 当前例子不允许 `target`，因此没有反向 tabnabbing 问题。如果产品要求新窗口打开链接，应由清洗边界统一增加 `target="_blank"` 和 `rel="noopener noreferrer"`，不能信任正文提供的属性。
- 如果允许图片，应另行限制图片协议和来源，同时考虑第三方图片的追踪与隐私风险。
- 后端仍应采用解析器驱动、允许列表式的清洗。前端清洗不是替代后端，而是保护这个高风险 DOM sink，避免单个上游回归直接成为 XSS。
- 如果页面参与 SSR，必须在服务器输出 HTML 之前用同一策略清洗；只在 hydration 后由浏览器清洗已经太晚。具体同构方案取决于项目现有 SSR 和依赖，当前仓库没有这些信息。
- 可进一步让组件接收 `sanitizedHtml` 或不透明的 `SanitizedHtml` 类型，使信任契约可见；但类型标记本身不是安全措施，值仍必须只能由清洗函数产生。

## 验证方案

为清洗策略增加表驱动单元测试：

- 合法的段落、列表、强调、代码和 `https`/相对链接能够保留。
- 删除 `onclick`、`onerror` 等事件属性。
- 拒绝 `javascript:`、大小写或实体编码变体以及未知协议。
- 删除 `script`、`style`、`iframe`、`object`、`embed`、`form`、`base`。
- 覆盖 SVG、MathML、畸形嵌套标签等常见解析器绕过载荷。
- 确认 `data-*`、`style` 和未允许属性不会意外保留。

再用真实浏览器做一条集成测试：渲染恶意正文，通过哨兵变量、弹窗、导航和网络请求断言没有代码执行或意外外联，同时确认合法富文本仍可读、链接仍可用。若有 SSR，应直接检查首次响应 HTML，而不只是 hydration 后的 DOM。

## CSP 的角色

CSP 是第二道防线，不是 sanitizer：

- 使用响应头部署严格的 `script-src`，基于动态 nonce 或 hash，并避免 `unsafe-inline`、`unsafe-eval`。
- 通常同时设置 `object-src 'none'`、`base-uri 'none'`，并按产品需要配置 `form-action`、`frame-ancestors`、`img-src` 和 `connect-src`。
- 先以 `Content-Security-Policy-Report-Only` 在测试或灰度环境观察违规，再转为强制策略。
- CSP 能降低部分漏网 XSS 的可利用性，但不会清除危险 HTML，也不能阻止钓鱼链接或在策略过宽时的数据外传。
- Trusted Types 可作为后续硬化，集中限制 `innerHTML` 类 sink；它同样不能替代内容清洗，并需要验证当前 React、SSR 和第三方代码兼容性。

工作区没有应用源码、依赖清单或测试配置，因此本次没有修改文件，也无法执行项目测试；以上结论仅针对提供的组件及明确的“用户正文”信任边界。