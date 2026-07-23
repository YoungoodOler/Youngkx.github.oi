# 更新日志

本文件记录 Youngkx Blog 的主要功能与架构变更。早期 Hexo 自动生成提交不逐条展开，仅保留阶段性记录。

## [未发布]

暂无。

## [2.3.1] - 2026-07-23

### 调整

- 移除自动播放的四象限首屏遮罩，避免产生与内容无关的开场等待。
- 首页改为滚动驱动的标题层：标题先占满视口，向下滚动时上移淡出，简介与操作入口随后展开。
- 首屏滚动只跟随用户操作，不再通过定时器自动播放或触发中心粒子爆发。
- 粒子、光尘、交互环、星球材质和光源统一为冷白、蓝白、钢蓝与少量暖白的真实星空色板。
- 保留鼠标涡流、移动光尘和点击或触摸扩散交互，同时减少不必要的彩色光源。

## [2.3.0] - 2026-07-23

### 新增

- 新增首页四象限宇宙展开动画，星体遮罩从中心向四角打开。
- 展开过程中新增中心能量环、品牌签名和首页内容分阶段入场。
- 粒子支持鼠标附近涡流、移动光尘轨迹以及点击或触摸扩散波。
- 首屏展开与 Three.js 粒子爆发通过 `youngkx:cosmic-reveal` 事件联动。

### 优化

- 桌面端和手机端分别调整粒子数量、光尘数量及爆发规模。
- 提高背景粒子的层次、尺寸和可见度，同时在正文区域自动降低亮度。
- 为亮色和暗色主题分别配置展开遮罩、粒子、光尘及交互环配色。
- 开启 `prefers-reduced-motion` 时跳过首屏展开和粒子交互动画。
- 完善动态粒子、交互环、事件监听器和 Three.js 资源的清理处理。

### 相关提交

- `03c47f4` Enhance interactive particle reveal

## [2.2.0] - 2026-07-23

### 新增

- 新增 Three.js 分层背景粒子场，包括远景星尘与近景光点。
- 粒子支持呼吸闪烁、滚动漂移和鼠标视差。
- 手机端自动降低粒子数量。
- 支持 `prefers-reduced-motion`，减少持续动画。

### 优化

- 进入文章区域时自动降低粒子亮度，避免影响文字辨识度。
- 为亮色和暗色主题分别配置粒子配色。
- 完善 Three.js 几何体、材质和渲染器的销毁处理。

### 相关提交

- `6b2a90e` Add layered background particles

## [2.1.0] - 2026-07-23

### 新增

- 新增 Markdown 文章系统，新文章存放在 `content/posts/`。
- 新增文章模板 `content/posts/_template.md`。
- 新增 `code`、`cs`、`ai`、`vlog`、`talk`、`web`、`network`、`timeline` 八种动态文章卡片。
- Markdown 可通过 Front Matter 的 `card` 字段选择卡片动画。
- 未填写 `card` 时，根据文章标签自动匹配。
- 新增 Markdown 标题锚点，兼容文章目录。

### 优化

- 新文章自动参与首页排序、文章统计、分类统计和静态路由生成。
- 保留 `content/articles.json`，继续兼容历史文章。
- 补充 Markdown 代码块、图片及正文样式。
- 更新 README、文章模板和《操作维护指南》。

### 相关提交

- `698543a` Add selectable animated article cards

## [2.0.0] - 2026-07-21

### 架构调整

- 使用 Next.js、React、TypeScript、Framer Motion 和 Three.js 重写网站。
- 移除旧 Hexo 主题、旧静态页面和无效代码。
- 停用 GitHub Pages，迁移至 Cloudflare Workers。
- 将正式本地项目迁移至 `D:\youngkx`。

### 首页与交互

- 重写首页及响应式布局。
- 新增固定顶部导航栏和亮暗主题切换。
- 新增 Three.js 星球背景及滚动形态变化。
- 新增鼠标跟随、磁性按钮和卡片倾斜效果。
- 首页按发布日期展示最新三篇文章。
- 新增全部文章页面和独立分类页面。
- 使用 GitHub 头像作为导航头像及浏览器图标。

### 文章系统

- 重写文章详情页，保留原有正文结构。
- 新增目录、复制链接和返回顶部等快捷功能。
- 自动生成文章编号、链接、分类、发布日期及统计数据。
- 支持任意年份的文章静态路由。
- 每个主要页面新增网站运行时间和最近更新时间。

### 部署

- Cloudflare Worker：`youngkxblog`
- `youngkx.cn` 使用 308 永久重定向至 `www.youngkx.cn`。
- 同时绑定根域名和 `www` 域名。

### 相关提交

- `000715e` Redesign blog with Next.js
- `bc00c08` Fix custom domain asset paths
- `cb51bf2` Add interactive blog navigation and site details
- `ff8b991` Add Cloudflare deployment config
- `3c6cfa2` Canonicalize domain and remove legacy deployment
- `5ff768e` Automate article and category metadata
- `9043ab3` Document D drive project path

## [1.x] - 2023-10-20 至 2026-07-19

- 使用 Git、Node.js、Hexo 和 GitHub Pages 构建个人博客。
- 发布 OI、C/C++、HTTP/Web 等学习文章。
- 使用 Hexo 自动生成静态页面。
- 旧技术栈于 2026-07-21 停用，历史文章数据已经迁移并保留。

---

- 正式网站：<https://www.youngkx.cn>
- GitHub：<https://github.com/YoungoodOler/Youngkx.github.oi>
