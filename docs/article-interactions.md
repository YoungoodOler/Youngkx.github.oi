# 文章点赞、评论与回复

每篇文章末尾都有点赞、评论和回复区。访客无需注册或登录，发布评论和回复时须填写有效邮箱。访客邮箱仅登录后的站长可见。

- 点赞按匿名浏览器标识去重，再次点击可以取消；刷新后保留状态。
- 评论和回复都可以在发送时填写自己的用户名，每次可修改；留空显示“匿名访客”。用户名是显示名称，不代表经过身份验证。
- 回复显示在原评论下，也可以回复某条回复；界面显示被回复人的名字。
- 访客发布的新评论和回复都会通知站长。访客或站长的回复都会通知被直接回复且留下邮箱的人，包括对某条回复的回复。
- 评论即时公开，一级评论及每条评论下的回复都按发布先后从上到下排列；新消息显示在后面，分页加载也保持该顺序。评论和回复各自每页 20 条。
- 内容按纯文本展示，支持换行；用户名最多 32 字，评论或回复最多 2000 字。
- 同一匿名访客每 15 秒可发一条评论或回复，同一地址每分钟最多 5 条；点赞每分钟最多 60 次。包含隐藏防垃圾字段、同源检查和请求体大小限制。
- 重试同一条已成功发送的内容不会重复发布；请求失败时保留输入框内容。

## 存储

Cloudflare D1 绑定为 `ARTICLE_INTERACTIONS`，数据库为 `youngkx-article-interactions`。与 Links 的 KV 和文件仓库的 R2 相互独立。

`article_likes` 保存文章与匿名标识，唯一约束避免并发重复点赞。`article_comments` 保存评论、回复及目标关系。`article_rate_limits` 保存短期限流状态，并在写入时清理过期记录。浏览器标识使用第一方 HttpOnly Cookie，数据库只保存其 SHA-256 摘要；限流地址使用服务器密钥加盐后的摘要，接口不公开这些内部字段。

评论入库时同时写入待发通知，Worker 发布后通过 Resend 尝试立即发送。Cloudflare 的定时触发器每 5 分钟检查待重试的通知，通知保留 24 小时。重试使用同一个 Resend 幂等键。发件人通过 `COMMENT_EMAIL_FROM` 配置，站长收件地址保存为 Worker secret `COMMENT_EMAIL_OWNER`。在 Resend 验证发件域，并将该域的发信密钥保存为 Worker secret `RESEND_API_KEY`。本地预览可省略发信配置，此时仅验证评论和待发通知的写入。

两类邮件共用 `cloudflare/comment-email-template.ts` 的品牌头、样式和页脚，并同时提供 HTML 与纯文本版本。Worker 从 D1 读取留言和被回复者信息，从构建生成的 `/article-titles.json` 获取真实文章标题。评论者邮箱只出现在站长通知中。邮件的 `#comment-<ID>` 链接会加载对应讨论并定位到留言。

文章以规范化路径关联数据，重新构建、部署或修改文章正文不会清空互动数据。修改文章的日期或 slug 会改变文章路径，需要单独迁移对应数据。接口只接受已部署且存在的文章地址，新 Markdown 文章无需手动登记。

## 本地运行与部署

```bash
npm run build
npx wrangler d1 migrations apply ARTICLE_INTERACTIONS --local
npm run preview:test
```

完整互动功能在 Worker 预览地址 `http://localhost:8787` 中运行。`next dev` 只提供前端，不提供 Worker 接口。浏览器测试会自动为独立的 `.wrangler/e2e-state` 应用本地迁移，不读取或写入线上互动数据。

数据库结构变更先备份，再应用迁移和部署：

```bash
npx wrangler d1 export ARTICLE_INTERACTIONS --remote --output .wrangler/article-interactions-backup.sql
npx wrangler d1 migrations apply ARTICLE_INTERACTIONS --remote
npm run validate
npm run test:e2e
npm run deploy:dry
npm run deploy
```

## 接口与评论维护

点击页脚 Youngkx 旁边的小锁，输入现有管理口令。评论、友链和 Repo 共用一个站长会话。登录后，小锁变为“站长操作”，可前往友链管理、Repo 管理或退出登录。默认使用浏览器会话 Cookie，服务端最长保留 24 小时。勾选“保持登录”后，同一浏览器可跨重启登录，90 天内再次访问会自动续期，最多每 7 天续期一次。

站长发布的评论和回复显示 Youngkx、网站头像和“站长”标识，填写正文即可发布。站长也能查看访客邮箱和删除留言。没有邮箱的旧留言会显示“未填写”。站长标识从以站长身份发布的留言开始生效。

删除前会显示确认提示；删除一级评论会提示其回复数量并一并删除，删除单条回复会保留其他回复。操作成功后会立即更新列表和数量，口令失效时自动退出管理。

站长会话使用 `/api/admin`。GET 查看登录状态，POST 携带管理口令 Bearer 请求头和 JSON `{ "remember": true }` 或 `false` 登录，DELETE 退出。浏览器通过 HttpOnly Cookie 使用会话。评论接口位于 `/api/articles/`，`article` 是以 `/` 开头和结尾的完整文章路径。所有 API 响应均禁止缓存。

| 方法   | 路径                                       | 功能                                                                                           |
| ------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| GET    | `admin`                                    | 验证管理员权限                                                                                 |
| GET    | `admin/comment-emails?article=...&id=...`  | 管理员查询评论和回复邮箱，每次最多传 50 个 `id`                                                |
| GET    | `interactions?article=...&after=...`       | 点赞数、当前浏览器状态、评论总数、一级评论列表                                                 |
| PUT    | `like?article=...`                         | JSON `{ "liked": true }` 或 `false`                                                            |
| POST   | `comments?article=...`                     | 传入 `content` 和 UUID v4 `requestId`。回复另传 `replyToId`。访客传入 `email`，可选 `nickname` |
| GET    | `replies?article=...&parent=...&after=...` | 原评论下的回复列表                                                                             |
| DELETE | `comments/:id?article=...`                 | 管理员删除评论                                                                                 |

脚本可继续使用 `Authorization: Bearer <现有管理口令>` 验证管理员权限。浏览器使用站长会话发布时可传入 `asOwner: true`，会话失效时接口会要求重新登录。删除一级评论会连同其所有回复一起删除，删除单条回复会清除相关的用户名引用。`LINKS_LOCAL_PREVIEW=true` 仅供本地预览，不得作为生产变量配置。
