# Youngkx

Youngkx 的个人博客，使用 Next.js、React、Framer Motion 与 Three.js 构建，并部署在 Cloudflare Workers。

## 从这里开始

| 想做的事情             | 入口位置               |
| ---------------------- | ---------------------- |
| 修改页面与路由         | `app/`                 |
| 修改首页、文章页内容     | `components/pages/`    |
| 修改页头页脚或全站动画 | `components/shell/`     |
| 发布 Markdown 文章     | `content/posts/`       |
| 调整文章读取与分类逻辑 | `lib/`                 |
| 修改 Cloudflare Worker | `cloudflare/`          |
| 查看测试配置           | `config/`              |
| 运行维护与发布流程     | `docs/操作维护指南.md` |

根目录只保留 Next.js、npm、TypeScript、ESLint 和 Wrangler 必须自动发现的配置，以及 `README.md` 与 `CHANGELOG.md`。构建缓存和测试产物可以用 `npm run clean` 统一清理。

## 本地开发

```bash
npm install
npm run dev
```

开发地址为 `http://localhost:3000`。

## 检查与构建

```bash
npm run format:check
npm run check
npm run lint
npm run test
npm run build
```

日常提交前也可以直接执行 `npm run validate`，它会依次完成类型检查、代码规范、单元测试和生产构建。Next.js 会将静态站点输出到 `out/`。

仓库使用 Prettier 统一 TypeScript、组件和配置文件格式，ESLint 负责 Next.js 与 React 规则，Vitest 覆盖文章解析、路由生成和 Worker 行为。网站与 Worker 使用独立的 TypeScript 配置，防止两套运行时类型互相污染。推送及合并请求还会在 GitHub Actions 中重复这些检查。

## 文章维护

新文章推荐放在 `content/posts/`，直接使用 Markdown 编写。复制 `_template.md` 后，在文章顶部用 `card: ai`、`card: cs`、`card: vlog` 等字段选择主页动态卡片；不填写时会根据标签自动匹配。原有文章继续由 `content/articles.json` 兼容读取。

新增文章后，主页、全部文章页、标签分类、文章数量、发布日期排序和任意年份的文章路由都会在构建时自动更新。详细步骤见 [`docs/操作维护指南.md`](docs/操作维护指南.md)。

## 部署

```bash
npm run deploy:dry
npm run deploy
```

`deploy:dry` 只验证构建产物和 Worker 配置，不会发布。正式部署前必须先通过 `npm run validate`。Cloudflare 项目名称为 `youngkxblog`，正式站点为 `https://www.youngkx.cn`。

Cloudflare Worker 负责提供静态资源、将 `youngkx.cn` 永久重定向到 `www.youngkx.cn`，并阻止 workers.dev 镜像被搜索引擎收录。修改 `wrangler.jsonc` 后需要重新执行 `npm run worker:types`，同步 `cloudflare/worker-configuration.d.ts`。

## 性能约束

- Three.js 场景按需加载，不应重新并入所有页面的首屏公共包。
- Framer Motion 通过 `LazyMotion` 加载 DOM 动画功能；新增动画优先使用 `m` 组件。
- 字体由 Next.js 在构建时自托管，避免恢复浏览器端的 Google Fonts 外链。
- 背景粒子在页面不可见时暂停，恢复可见后继续；移动端不额外降低动态效果数量。
- `/_next/static/` 的带哈希资源使用一年不可变缓存，HTML 继续由平台按正常规则更新。
