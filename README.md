# Youngkx Digital Garden

一个使用 Next.js、React、Framer Motion 与 Three.js 重写的沉浸式个人博客首页。设计语言以深色数字花园为核心，包含实时 3D 星体、鼠标视差、滚动揭示、阅读进度与完整移动端适配。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。生产构建使用 `npm run build`，静态文件会输出到 `out/`；构建完成后可用 `npm start` 预览。

## 内容修改

- 页面文案和文章数据：`components/HomePage.tsx`
- Three.js 场景：`components/Scene.tsx`
- 视觉样式和响应式布局：`app/globals.css`
- SEO 标题与描述：`app/layout.tsx`

## GitHub Pages

项目已包含自动部署流程。将代码推送到 `main` 或 `master` 后，在仓库 Settings → Pages 中将 Source 设为 **GitHub Actions**。站点按自定义域名 `youngkx.cn` 的根路径构建。
