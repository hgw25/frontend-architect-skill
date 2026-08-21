工作区里除 `.git` 外没有其他项目文件，所以只能基于你给的组件做结论，不假设仓库里已有净化库、CSP 或服务端过滤实现。

**发现**

1. `[HIGH] (confidence: 10/10) 提供的组件第 2 行`
   `return <article dangerouslySetInnerHTML={{ __html: html }} />`
   这里把用户正文直接作为 HTML 注入 DOM。后端“已经过滤过输入”不能作为前端信任边界，因为只要后端规则有遗漏、回归、旁路接口、富文本白名单不一致，前端这里就是直接执行点。对 React 来说，`dangerouslySetInnerHTML` 本身就是 XSS escape hatch。

2. `[HIGH] (confidence: 9/10) 同一注入点对链接协议和属性没有本地约束`
   即使后端只想允许“有限 HTML 和链接”，如果没同时严格限制 `href/src` 协议、`target`、危险属性，常见绕过是 `javascript:`、`data:`、事件属性、SVG/MathML 载荷，以及 `target="_blank"` 引出的 tabnabbing。

**最小、可维护的修复方向**

不要去掉富文本，保留 `dangerouslySetInnerHTML`，但把它收口到“渲染前净化”这一层。最小方案是：

```tsx
import DOMPurify from 'dompurify'

const purifier = DOMPurify()

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a'
]

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel']

function sanitizeArticleHtml(html: string) {
  return purifier.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['style', 'script'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
    ALLOWED_URI_REGEXP: /^(?:(https?|mailto|tel):|\/|#)/i,
  })
}

export function ArticleBody({ html }: { html: string }) {
  const safeHtml = sanitizeArticleHtml(html)
  return <article dangerouslySetInnerHTML={{ __html: safeHtml }} />
}
```

决策上建议这样落：

- 前端把 `html` 视为不可信输入，始终本地净化后再渲染。
- 白名单只覆盖产品实际需要的标签和属性，不做“支持所有常见富文本”。
- 链接只允许 `http:`, `https:`, `mailto:`, `tel:`, 相对路径和锚点。
- 如果产品允许 `target="_blank"`，净化后统一补 `rel="noopener noreferrer"`；如果不需要新窗口，直接去掉 `target` 更省事。
- 服务端过滤继续保留，但前端再做一次。原因不是重复造轮子，而是把“最终执行点”的安全边界放在组件自身，避免后端规则漂移时前端裸奔。

**CSP 的角色**

CSP 是减伤，不是主修复。

- 有价值的地方：即使净化漏了一些 payload，严格 CSP 可以阻止一部分内联脚本和外部脚本加载，把 XSS 从“直接拿到 JS 执行”降成“部分 HTML 注入”。
- 不足的地方：CSP 不能可靠替代 HTML sanitizer。它通常拦不住所有富文本注入后果，比如恶意链接、钓鱼 UI、部分浏览器差异、业务属性滥用。
- 对这类页面，基线建议是至少有：
  - `script-src` 不允许任意内联脚本
  - `object-src 'none'`
  - `base-uri 'self'`
  - `frame-ancestors 'none'` 或按产品需要收紧
- 如果前端基础设施允许，Trusted Types 可以进一步约束 `innerHTML` 类 sink，但这属于增强项，不是这次“最小修复”的前置条件。

**验证方案**

先做组件级测试，再做浏览器级验证。

- 单元测试输入这些 payload，断言渲染结果中不存在可执行内容：
  - `<img src=x onerror=alert(1)>`
  - `<svg><script>alert(1)</script></svg>`
  - `<a href="javascript:alert(1)">x</a>`
  - `<a href="data:text/html,...">x</a>`
  - `<p><strong>正常富文本</strong></p>`
- 断言保留产品需要的格式：段落、列表、加粗、代码块、普通链接仍能正常显示。
- 如果允许外链新窗口，断言输出链接包含 `rel="noopener noreferrer"`。
- 浏览器侧用带 CSP 的环境跑一次手工/集成验证，确认恶意样例不会执行，且控制台没有意外的 CSP 违规噪音。
- 回归点放在“后端过滤规则变更时”，确保前端 sanitizer 测试仍然独立守住 sink。

结论很直接：这段代码当前应视为高风险 XSS 注入点。最小可维护修复不是砍掉富文本，而是在这个组件前加一层严格白名单净化，并用 CSP 做第二道防线。