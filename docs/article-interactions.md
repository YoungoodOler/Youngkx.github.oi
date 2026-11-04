# 文章点赞、评论与回复

每篇文章末尾都有点赞、评论和回复区。所有访客都可以使用，无需注册、登录或填写邮箱。

- 点赞按匿名浏览器标识去重，再次点击可以取消；刷新后保留状态。
- 评论和回复都可以在发送时填写自己的用户名，每次可修改；留空显示“匿名访客”。用户名是显示名称，不代表经过身份验证。
- 回复显示在原评论下，也可以回复某条回复；界面显示被回复人的名字。
- 评论即时公开，按发布时间倒序排列，评论和回复各自每页 20 条。
- 内容按纯文本展示，支持换行；用户名最多 32 字，评论或回复最多 2000 字。
- 同一匿名访客每 15 秒可发一条评论或回复，同一地址每分钟最多 5 条；点赞每分钟最多 60 次。包含隐藏防垃圾字段、同源检查和请求体大小限制。
- 重试同一条已成功发送的内容不会重复发布；请求失败时保留输入框内容。

## 存储

Cloudflare D1 绑定为 `ARTICLE_INTERACTIONS`，数据库为 `youngkx-article-interactions`。与 Links 的 KV 和文件仓库的 R2 相互独立。

`article_likes` 保存文章与匿名标识，唯一约束避免并发重复点赞。`article_comments` 保存评论、回复及目标关系。`article_rate_limits` 保存短期限流状态，并在写入时清理过期记录。浏览器标识使用第一方 HttpOnly Cookie，数据库只保存其 SHA-256 摘要；限流地址使用服务器密钥加盐后的摘要，接口不公开这些内部字段。

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

接口均位于 `/api/articles/`，查询参数 `article` 是以 `/` 开头和结尾的完整文章路径；无需登录。所有响应禁止缓存。

| 方法   | 路径                                        | 功能                                                                                   |
| ------ | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| GET    | `interactions?article=...&before=...`       | 点赞数、当前浏览器状态、评论总数、一级评论列表                                         |
| PUT    | `like?article=...`                          | JSON `{ "liked": true }` 或 `false`                                                    |
| POST   | `comments?article=...`                      | JSON 中传入 `nickname`、`content`、UUID v4 `requestId`；回复再传目标评论的 `replyToId` |
| GET    | `replies?article=...&parent=...&before=...` | 原评论下的回复列表                                                                     |
| DELETE | `comments/:id?article=...`                  | 使用现有 `LINKS_ADMIN_TOKEN` 删除垃圾评论                                              |

维护时先用公开接口找到评论 ID。删除操作要求 `Authorization: Bearer <现有管理口令>`，口令不得写入源码或文章。删除一级评论会连同其所有回复一起删除；删除一条回复会保留其他回复，但不再显示已删除回复的用户名引用。`LINKS_LOCAL_PREVIEW=true` 仅供本地预览，不得作为生产变量配置。
