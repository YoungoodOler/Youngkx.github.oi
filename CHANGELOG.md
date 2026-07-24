# 更新日志

本文件记录 Youngkx Blog 的主要功能与架构变更。早期 Hexo 自动生成提交不逐条展开，仅保留阶段性记录。

## [2.4.4] - 2026-07-24

### 首页内容衔接

- 将引句、说明和按钮的退出区间统一为与 `Youngkx Blog` 相同的最后一段滚动进度，使四组内容同步完成清晰的上移淡出。
- 移除首屏与“文章”区之间由顶部留白和延迟触发叠加形成的滚动空档；第二阶段淡出完成时，“文章”标题立即从视口下方接续浮入。

## [2.4.3] - 2026-07-24

### 首页第二阶段

- 延长引句、说明与按钮从下方上浮至最终位置的滚动区间，使各文字层更缓慢地依次进入。
- 移除文字层进入和退出时的景深模糊，改为保持清晰的上移淡入与上移淡出。
- 将 `Youngkx` 与 `Blog` 拆分为独立标题层；退出时 `Blog` 从下方向上缓慢压叠至 `Youngkx` 下半部，保留两层可辨识轮廓后标题整体淡出。
- 将首页星球的文章区转场改为在第二阶段末段才触发；文字全部就位时，星球保持放大并占据右半屏，不再提前向左漂移或缩小。

### 发布

- Git 提交：`991c8c7`（`Refine home stage motion and planet position`）、`25e9eb3`（`Animate split home title exit`）
- Cloudflare Worker：`youngkxblog`
- Cloudflare 版本：`8128ccf1-832d-4ef7-b2f9-c6438b5d3bc9`

## [2.4.2] - 2026-07-24

### 首页滚动

- 延长首页第二阶段的完整同屏停留与分层退出距离，使 `Youngkx Blog`、引句、说明和按钮在继续滚动时更舒缓地向上虚化消失。
- 放大手机端第二阶段的 `Youngkx Blog`，并继续根据实际标题宽度计算位置，保持与下方文字内容左对齐。

### 发布

- Git 提交：`a3c6e7e`（`Slow home hero exit and enlarge mobile title`）
- Cloudflare Worker：`youngkxblog`
- Cloudflare 版本：`7f5998a4-b68c-4dce-8cdc-b4b8a2eb382b`

## [2.4.1] - 2026-07-24

### 文章阅读

- Markdown 围栏代码块和历史 Hexo 代码块统一显示语言名称与复制按钮。
- 语言识别优先读取 `language-*`、`lang-*` 或历史高亮类名；未声明语言时根据代码特征自动识别常见编程语言和文本格式。
- 复制内容保留代码换行、缩进和特殊字符，并自动排除工具栏与历史代码块行号。
- 复制成功后显示短暂状态反馈；Clipboard API 不可用时自动使用兼容复制方式。
- 代码工具栏适配亮暗主题、横向滚动和手机窄屏。

### 发布

- Git 提交：`d83ac41`（`Add code block language and copy tools`）
- Cloudflare Worker：`youngkxblog`
- Cloudflare 版本：`6c34b1ca-e2bc-4c25-a662-3357ba485756`

## [2.4.0] - 2026-07-24

### 首页与滚动叙事

- 首屏只显示大号 `Youngkx Blog` 标题和交互星尘，不显示星球；标题随滚动保持清晰地缩小并迁移到第二阶段左侧。
- 第二阶段标题采用放大后的稳定尺寸并略微下移，横向位置根据实际标题宽度动态计算，左边缘与下方引句内容栏对齐。
- 星球在滚动后从屏幕右上边缘沿非线性弧线旋转飞入，第二阶段形成左侧标题与文字、右侧星球的布局。
- 引句、说明和操作入口作为独立文字层依次从下方带景深上浮，完整同屏停留后随继续滚动分层向上虚化退出。
- 两条轮播引句使用从左向右的横向扫入与滑出；文章区、分类区及各内页大标题使用由模糊到清晰的景深浮入。

### 星空与界面切换

- Three.js 交互星尘作为全站固定背景：主页同时显示滚动星球，文章列表、分类、文章正文及其他页面仅显示粒子场。
- 常驻星尘使用冷白、蓝白、钢蓝和少量暖白的真实星空色板，支持呼吸闪烁、滚动漂移、鼠标涡流、移动光尘和轻量点击扰动。
- 主题与跨页面切换使用独立全屏 Canvas：高密度星尘沿随机非线性轨迹高速乱飞，以多方向、大曲线偏移和长拖尾形成短暂遮盖，界面更新后继续逸散消失。
- 切换层与常驻 Three.js 粒子场互相独立；主题变化通过原地颜色插值完成，不暂停、修改或重建背景场景。

### 主题与性能

- 亮色主题下的首页文章卡片在悬停时变为半透明，使背景星尘透出。
- 桌面端点击只产生轻量粒子扰动和少量光尘，不显示大尺寸扩散圆环。
- 手机端采用较低的几何细分和设备像素比，并关闭触摸轨迹与点击反馈，同时保留背景漂移和完整界面过渡。

### 发布

- Git 提交：`a7f58e6`（`Refine cosmic transitions and global particles`）
- Cloudflare Worker：`youngkxblog`
- Cloudflare 版本：`f5f4e7bd-a311-46b0-bb60-878e1406243e`

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
