## 评审结论

**高危：当前组件存在存储型 XSS 风险。**

`html` 来自用户，而 `dangerouslySetInnerHTML` 会绕过 React 的默认转义。后端“过滤过”不足以构成可验证的安全契约：只要后端规则遗漏危险属性、URL scheme、SVG/MathML 或 HTML 解析边界，恶意内容就会进入浏览器执行。

不需要取消富文本；最小修复是在唯一的富文本渲染边界使用成熟、基于 allowlist 的 HTML sanitizer。

## 建议修复

使用项目现有包管理器引入并锁定类似 DOMPurify 的成熟库，不要自行用正则过滤 HTML：

```tsx
import DOMPurify, { type Config } from "dompurify";

const ARTICLE_HTML_POLICY: Config = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "em",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a",
  ],
  ALLOWED_ATTR: ["href", "title"],
  ALLOW_DATA_ATTR: false,
};

function sanitizeArticleHtml(html: string): string {
  return DOMPurify.sanitize(html, ARTICLE_HTML_POLICY);
}

export function ArticleBody({ html }: { html: string }) {
  const safeHtml = sanitizeArticleHtml(html);

  return <article dangerouslySetInnerHTML={{ __html: safeHtml }} />;
}
```

这里保留 `dangerouslySetInnerHTML` 是合理的：危险 sink 被收敛在一个组件中，并且输入在紧邻 sink 的明确边界完成净化。

还需明确以下策略，而不能沿用“有限 HTML”这样的口头约定：

- 哪些标签和属性确实属于产品能力。
- 链接是否只允许相对地址、HTTP 和 HTTPS；是否允许 `mailto:` 或 `tel:`。
- 默认不要允许 `style`、事件属性、`iframe`、`object`、`svg`、`math`、表单元素和资源加载标签。
- 若允许 `target="_blank"`，组件必须统一补充 `rel="noopener noreferrer"`；更小的初始方案是不允许 `target`。
- 后端继续在写入或输出边界净化，并把 allowlist、URL 规则和策略版本变成明确契约。前端净化是浏览器 sink 的保障，不应成为后端放弃治理的理由。
- 若应用包含 SSR，必须选用项目运行环境支持的 sanitizer 接入方式，确保首屏服务端输出已经净化，不能等 hydration 后才处理。

不要通过类型断言把普通字符串伪装成 `SafeHtml`；类型不能证明运行时内容安全。

## 验证方案

先为 sanitizer 策略建立表驱动测试：

- 合法的段落、强调、列表和链接被保留。
- `<script>`、事件属性和不允许的标签被移除。
- `javascript:`、`data:`、实体编码或混合大小写形式的危险链接不能保留可点击能力。
- 覆盖 `<img onerror>`, `<svg>`, `<math>`, `<iframe>`, `<base>`, `style` 和畸形嵌套 HTML。
- 若允许外链新窗口，验证最终 DOM 上的 `rel`，而不是只比较输入字符串。

再做一个真实浏览器测试：

1. 渲染上述攻击样本。
2. 用哨兵变量或测试回调确认脚本、事件处理器均未执行。
3. 点击保留下来的链接，验证实际导航 scheme 和新窗口行为。
4. 确认合法富文本仍然按产品要求显示。

DOM 模拟器适合检查净化后的结构，但不能单独证明浏览器中不会执行恶意内容。sanitizer 升级时应重复运行这组攻击语料。

## CSP 的角色

CSP 是第二道防线，不是 sanitizer 的替代品。建议通过 HTTP 响应头部署，并先用 Report-Only 收集违规，再切换到强制模式。适配现有资源来源后的基线通常包括：

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-<每次响应随机值>';
  object-src 'none';
  base-uri 'none';
  frame-ancestors 'none'
```

避免 `script-src 'unsafe-inline'` 和 `'unsafe-eval'`。条件允许时，再引入 Trusted Types，把原始 HTML sink 限制到命名策略。

CSP 可以降低遗漏脚本、内联事件和外部脚本注入的可利用性，但它不会定义允许的富文本格式，也不能可靠解决恶意链接、内容欺骗或所有浏览器解析问题。因此正确顺序是：**明确 allowlist → sanitizer 守住 sink → CSP/Trusted Types 提供纵深防御**。

工作区没有应用源码、依赖清单或测试环境，除所给片段外无法执行补丁和验证；本次未修改任何文件。