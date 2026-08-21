**发现**

1. 严重: `dangerouslySetInnerHTML` 直接把用户正文写入 DOM，当前组件对信任边界没有任何本地约束。后端“过滤过输入”不能作为这里安全的充分条件，因为一旦后端规则回退、遗漏某类属性或 URL scheme、或另一条写入链路绕过过滤，这里就是直接执行点。受影响位置: 提供的组件，第 2 行。

2. 严重: 允许“有限 HTML 和链接”时，风险不只是不安全标签，还包括危险属性和 URL。即使后端移除了 `<script>`，仍需明确拦截 `on*` 事件属性、`javascript:`/`data:` URL、`srcdoc`、部分 SVG/MathML 向量，以及带副作用的嵌入标签。当前组件没有任何 allowlist 策略。

3. 中等: 现在的安全策略不可验证。组件没有把“允许哪些标签/属性/协议”固化为前端可测试契约，后续任何人都只能继续依赖口头约定，维护成本高且容易漂移。

**最小、可维护的修复方向**

不要去掉富文本；把“消毒”收敛到一个清晰边界，在渲染前做一次前端 allowlist 清洗，然后再进入 `dangerouslySetInnerHTML`。

推荐最小方案:

1. 引入一个成熟的 HTML sanitizer，例如 `dompurify`。
2. 在一个很小的封装里固定策略，而不是把配置散落在页面里。
3. 明确只允许产品需要的标签、属性、协议。
4. 对链接额外收口:
   - 仅允许 `http:`, `https:`, `mailto:`，如果产品确实需要再单独加入 `tel:`
   - 移除所有 `on*` 属性
   - 如允许 `target="_blank"`，统一补 `rel="noopener noreferrer"`

示意方向:

```tsx
import DOMPurify from 'dompurify'

const ARTICLE_HTML_POLICY = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a'],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
  ALLOWED_URI_REGEXP: /^(?:(https?|mailto|tel):|\/)/i,
}

export function ArticleBody({ html }: { html: string }) {
  const sanitizedHtml = DOMPurify.sanitize(html, ARTICLE_HTML_POLICY)
  return <article dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
}
```

如果这是 React 客户端组件，以上方向已经比“只信后端”安全得多，而且改动最小。更进一步但仍可维护的做法，是把它抽成 `sanitizeRichText(html)` 或 `SafeRichText`，让所有富文本入口共用一套策略。

**为什么这比“只靠后端过滤”更合适**

这是典型的双边防线问题。后端过滤负责持久化和跨客户端一致性；前端 sanitizer 负责在最终 DOM sink 前再次约束输出上下文。这里的 sink 是 HTML，不是普通文本，所以必须按 HTML 上下文处理，不能把“输入已经过滤”当作 sink 安全的替代品。

**CSP 的角色**

CSP 是防御加固，不是主修复。

它的价值:
- 降低某些 XSS 成功率
- 阻止内联脚本、限制脚本来源
- 帮你更快发现策略漏口

但它不能替代 sanitizer，原因是:
- 你仍然在把不可信 HTML 注入 DOM
- CSP 不会自动替你定义允许哪些标签、属性、链接协议
- 某些危险行为是导航、资源加载、钓鱼式链接，不一定依赖脚本执行

这里建议的 CSP 方向:
- 禁止内联脚本，避免 `unsafe-inline`
- 收紧 `script-src`
- 视浏览器支持情况逐步引入 Trusted Types，把危险 DOM sink 收口到受控策略
- 开启报告模式观察违规，再切强制

**验证方案**

最小验证集应直接覆盖可被利用的输入，而不是只测“正常文章能显示”:

1. 单元/组件测试:
   - `<script>alert(1)</script>` 被移除
   - `<img src=x onerror=alert(1)>` 的事件属性被移除
   - `<a href="javascript:alert(1)">x</a>` 的危险链接被移除或失效
   - 合法标签如 `<p><strong>ok</strong></p>` 保留
   - 合法链接 `https://example.com` 保留
   - `target="_blank"` 时自动带上 `rel="noopener noreferrer"`

2. 手工对抗用例:
   - SVG/MathML 载荷
   - 编码混淆的 `javascript:` 链接
   - 超长富文本和畸形 HTML，确认不会把页面打坏

3. 部署验证:
   - 上线前先开 CSP report-only，观察是否还有危险 sink 或意外内联脚本依赖
   - 如果后续引入 Trusted Types，确认该组件是通过受控策略进入 sink，而不是绕过

基于当前工作区事实，我没有发现现有项目代码、现成 sanitizer 封装或 CSP 配置可复用；仓库里只有题目说明和 `.frontend-architect` 参考文件，所以以上结论仅基于你给的组件片段。