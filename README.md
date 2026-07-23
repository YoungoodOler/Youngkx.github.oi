# Youngkx

Youngkx 的个人博客，使用 Next.js、React、Framer Motion 与 Three.js 构建，并部署在 Cloudflare Workers。

## 本地开发

```bash
npm install
npm run dev
```

开发地址为 `http://localhost:3000`。

## 检查与构建

```bash
npm run check
npm run build
```

Next.js 会将静态站点输出到 `out/`。Cloudflare Worker 负责提供静态资源，并将 `youngkx.cn` 永久重定向到 `www.youngkx.cn`。

## 文章维护

新文章推荐放在 `content/posts/`，直接使用 Markdown 编写。复制 `_template.md` 后，在文章顶部用 `card: ai`、`card: cs`、`card: vlog` 等字段选择主页动态卡片；不填写时会根据标签自动匹配。原有文章继续由 `content/articles.json` 兼容读取。

新增文章后，主页、全部文章页、标签分类、文章数量、发布日期排序和任意年份的文章路由都会在构建时自动更新。详细步骤见 `操作维护指南.md`。

## 部署

```bash
npx wrangler deploy
```

Cloudflare 项目名称为 `youngkxblog`，正式站点为 `https://www.youngkx.cn`。
