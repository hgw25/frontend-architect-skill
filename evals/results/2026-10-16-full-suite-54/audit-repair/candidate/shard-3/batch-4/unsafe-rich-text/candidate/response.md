结论：当前实现不能据此判定安全。第 2 行把普通 `string` 直接送入 HTML sink，绕过了 React 的默认转义；“后端过滤过”只有在过滤策略、覆盖路径和测试均可核验时才构成安全契约。React 官方也明确指出，向 `dangerouslySetInnerHTML` 传入用户数据可能造成 XSS。[React 文档](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html)

### 评审发现

**高风险：潜在存储型 XSS，建议阻断上线直至完成下面的边界修复。**

触发条件是服务端遗漏危险标签、事件属性或 URL，例如：

```html
<img src=x onerror=alert(document.domain)>
<a href="javascript:alert(1)">查看详情</a>
<iframe srcdoc="..."></iframe>
```

是否实际可利用取决于未提供的后端策略；当前仓库没有应用源码、依赖或测试，无法验证其声明。

### 最小、可维护的修复

保留富文本，但把净化集中在唯一的富文本渲染边界：

```tsx
const ARTICLE_HTML_POLICY = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em',
    'ul', 'ol', 'li', 'blockquote',
    'pre', 'code', 'a',
  ],
  ALLOWED_ATTR: ['href', 'title'],
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
} as const;

function sanitizeArticleHtml(rawHtml: string): string {
  return maintainedSanitizer.sanitize(rawHtml, ARTICLE_HTML_POLICY);
}

export function ArticleBody({ html }: { html: string }) {
  const safeHtml = sanitizeArticleHtml(html);

  return <article dangerouslySetInnerHTML={{ __html: safeHtml }} />;
}
```

具体决定：

- 复用项目已有的成熟、持续维护、基于 DOM 解析和 allowlist 的净化库；若没有，可评估 DOMPurify。不要用正则、自制标签替换或黑名单。[DOMPurify](https://github.com/cure53/DOMPurify)
- 链接只允许产品明确需要的协议，例如相对 URL、`https:`，以及确实需要时的 `mailto:`；拒绝 `javascript:`、`data:` 等。URL 策略必须使用库支持的协议控制或解析后的 URL 判断，不能用字符串前缀猜测。
- 当前需求没有要求新窗口，因此最小策略是不允许 `target`。若必须允许 `_blank`，同时强制 `rel="noopener noreferrer"`。
- 默认不允许 `style`、事件属性、图片、表单、`iframe`、SVG、MathML、自定义元素；以后新增能力时只修改这一个策略和对应测试。
- 服务端仍应在所有发布、编辑和导入路径执行同等或更严格的净化。要求后端给出库及版本、标签/属性/协议清单和覆盖测试，不能只接受“过滤过”的口头保证。
- 若存在 SSR，应使用服务端受支持的净化方式，并验证服务端与浏览器输出一致，避免 hydration 前后策略不同。

### 验证方案

1. 策略单测：确认允许的段落、列表、强调、代码块和安全链接保持不变。
2. 恶意样例测试：覆盖事件属性、`javascript:`/`data:`、大小写和实体编码变体、畸形标签、SVG、`iframe srcdoc`、表单、`style` 及 `_blank`。
3. 浏览器集成测试：真实渲染组件，断言危险节点/属性不存在、链接行为正确，并用哨兵函数确认没有代码执行。仅比较字符串快照不够。
4. 服务端契约测试：分别从创建、编辑、批量导入等实际入口提交恶意正文，再读取并渲染，避免旁路。
5. 将 `dangerouslySetInnerHTML` 限制在这一封装中；静态检查其他使用点，新增使用必须经过同一策略。
6. 升级净化库时重复上述攻击语料和合法内容回归，确认安全性及富文本体验均未退化。

### CSP 的角色

CSP 是第二道防线，不是净化器。严格 CSP 可以在净化遗漏时阻止许多内联脚本、事件处理器和未授权脚本资源执行，但无法阻止所有恶意 HTML 行为，例如欺骗性链接、界面覆盖或策略允许范围内的资源请求。[MDN CSP 指南](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/CSP)

建议通过 HTTP 响应头部署 nonce/hash 型严格 CSP，避免 `script-src 'unsafe-inline'`，并考虑 `object-src 'none'`、`base-uri 'none'`。先以 `Content-Security-Policy-Report-Only` 收集违规，再切换强制模式。条件允许时可进一步启用 Trusted Types，限制 HTML sink 只能接收经过指定策略创建的值；它同样不能代替 allowlist 净化。

本次是只读评审，未修改文件或运行应用测试；仓库中没有可供验证的组件实现、依赖或后端过滤契约。