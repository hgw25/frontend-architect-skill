Read .frontend-architect/SKILL.md completely and use only that skill and its routed local references for this task. Do not read global skills. Only supplied artifacts are in scope; do not inspect the source repository or evaluation criteria. Do not edit implementation. Save your final Chinese review to response.md in this workspace.

请审查下列社区功能变更是否满足已批准的需求，只报告问题和验证范围，不修改代码。 这是本次新增文件的完整快照。此前有人检查过 PostRow 的正常数据截图； 本轮结构测试通过，流程覆盖表各状态均已登记。没有可运行的应用或浏览器环境。

docs/community.md（当前已批准版本）
§4.1 没有 activityId 的发布行保留标题，无详情入口，并禁用“获取”；有 ID 时两处均可用。
§4.2 回前台时刷新 feed 和 creatorDirectory；本地 draft 不参与刷新。
§4.3 修订：取消作者详情入口，作者名称显示为纯文本。旧版要求作者链接已被替代。

src/PostRow.tsx
type Post = { title: string; author: string; activityId: string | null };
type Props = { post: Post; acquire: (id: string) => void };
export function PostRow({ post, acquire }: Props) {
  const href = post.activityId ? `/activities/${post.activityId}` : undefined;
  return <article>
    {href ? <a href={href}>{post.title}</a> : <span>{post.title}</span>}
    <span>{post.author}</span>
    <button onClick={() => {
      if (post.activityId) acquire(post.activityId);
    }}>获取</button>
  </article>;
}

src/lifecycle.ts
type Refreshable = { refresh: () => Promise<void> };
export function onForeground(resources: {
  feed: Refreshable;
  creatorDirectory: Refreshable;
  draft: { text: string };
}) {
  return Promise.all([resources.feed.refresh()]);
}

test/architecture.test.ts（完整断言，已通过）
import { expect, test } from 'vitest';
import { onForeground } from '../src/lifecycle';
import { PostRow } from '../src/PostRow';
test('entry points are functions', () => {
  expect(typeof onForeground).toBe('function');
  expect(typeof PostRow).toBe('function');
});

docs/coverage.md
社区流程 disabled：创建页标题为空时提交按钮禁用；已有测试通过。
其他流程状态已登记；发布行截图使用 activityId="a1" 的数据。
