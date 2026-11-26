# Youngkx

这是我的个人博客。我在这里写 OI、C/C++ 和 Web 学习笔记，也把一些想弄明白的东西做成可以动手试的网页实验。

[博客首页](https://www.youngkx.cn/) · [全部文章](https://www.youngkx.cn/articles/) · [文章分类](https://www.youngkx.cn/categories/) · [常用链接](https://www.youngkx.cn/links/) · [文件仓库](https://www.youngkx.cn/repo/)

## 可以从这几篇读起

- **算法竞赛中的数据结构**。从数组、链表一路讲到树状数组、线段树和平衡树。每个专题都有图解、C++ 实现和练习题。[阅读手册](https://www.youngkx.cn/2026/11/25/algorithm-competition-data-structure/)
- **从一台简单计算机理解计算机科学基础**。从二进制和逻辑门讲到 CPU，在三维实验台上可以单步观察取指、译码和执行。[打开文章和实验](https://www.youngkx.cn/2026/11/10/simple-computer-lab/)
- **贪心算法入门**。从买笔和凑零钱讲起，再用洛谷 P4995「跳跳！」练习怎么选贪心策略、怎么证明它有效。[阅读题解](https://www.youngkx.cn/2026/11/03/greedy-algorithm/)

## 网站怎么搭的

文章用 Markdown 写，Next.js 和 React 在构建时生成页面，输出到 `out/`。Cloudflare Worker 提供静态页面和 API。文章的点赞、评论和回复存进 D1，回复邮件通过 Resend 发送。常用链接存进 KV，文件放在 R2。

## 本地运行

使用 Node.js 22 和 npm 11。克隆仓库后，在项目目录执行下面两条命令。

```bash
npm ci
npm run dev
```

打开 `http://localhost:3000` 即可预览页面。文章源码在 [`content/posts/`](content/posts/)，新文章可以从 [`_template.md`](content/posts/_template.md) 开始写。

`npm run validate` 会运行类型检查、Lint、单元测试、生产构建和性能预算检查。评论、常用链接和文件下载的 API 由 Worker 提供，本地联调需要启动 Worker 预览。

- 发布文章、本地预览与部署见[操作维护指南](操作维护指南.md)。
- 评论和邮件通知见[文章互动文档](docs/article-interactions.md)，文件存储和下载见[文件仓库 API](docs/file-repository-api.md)。
- 站点的功能变更见[更新记录](CHANGELOG.md)。

## 文章许可

除另有说明外，博客原创文字采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans) 许可。分享时请署名 Youngkx，并附上原文链接。
