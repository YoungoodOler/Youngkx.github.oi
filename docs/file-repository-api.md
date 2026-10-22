# 文件仓库接口与前端接入

后端入口是 `cloudflare/files.ts`，由现有 Worker 分发 `/api/files`。共享类型和工具函数在 `lib/file-repository.ts`，前端可直接导入。页面布局、路由、导航入口由前端对话实现；双方已约定公开页 `/repo/`，管理页 `/repo/manage/`。

## 鉴权

所有管理操作通过请求头传递 `Authorization: Bearer <manage token>`，复用现有 Worker secret `LINKS_ADMIN_TOKEN`，即 Links 管理页使用的 token。token 不进入 URL、静态页面、源码或公开响应。

前端复用现有 `sessionStorage` key `youngkx-links-token`，退出管理时清除。收到 `401` 时清除已解锁状态并提示重新输入。只隐藏管理按钮不能替代服务端鉴权。

## 接口一览

| 方法   | 路径                               | 权限                     | 成功返回                                     |
| ------ | ---------------------------------- | ------------------------ | -------------------------------------------- |
| GET    | `/api/files`                       | 公开                     | `RepositoryListing`                          |
| GET    | `/api/files/admin`                 | token                    | `RepositoryListing`，包括暂停公开时的文件    |
| POST   | `/api/files?name=<编码后的文件名>` | token                    | `201`，`{ file: RepositoryFile }`            |
| GET    | `/api/files/:id`                   | 公开下载开启时无需 token | 文件附件，支持单段 Range                     |
| HEAD   | `/api/files/:id`                   | 同下载                   | 文件大小、附件名、ETag，不返回正文           |
| DELETE | `/api/files/:id`                   | token                    | `{ deleted: true }`，幂等                    |
| PATCH  | `/api/files/:id`                   | token                    | `{ file: RepositoryFile }`，修改文件名和说明 |
| PUT    | `/api/files/settings`              | token                    | `{ settings: RepositorySettings }`           |
| POST   | `/api/files/folders`               | token                    | `201`，`{ folder: RepositoryFolder }`        |
| PATCH  | `/api/files/folders/:id`           | token                    | `{ folder: RepositoryFolder }`               |
| DELETE | `/api/files/folders/:id`           | token                    | `{ deleted: true }`，非空文件夹返回 `409`    |

路径不带尾斜杠。请求同源 `/api/...`，不需要额外的 R2 域名或浏览器端 Cloudflare 凭证。API 和附件返回 `Cache-Control: no-store`。

## 数据结构

```ts
type RepositorySettings = {
  title: string; // 1–80 字符，不能为空白
  description: string; // 0–300 字符
  publicEnabled: boolean;
  maxUploadMiB: number; // 整数，1–5120，新仓库默认 1024
};

type RepositoryFile = {
  id: string; // 不透明 ID，请直接使用，不从文件名推导
  name: string; // 上传的原始文件名（NFC、首尾去空白）
  description: string; // 文件说明，最多 400 字符，默认空字符串
  folderId: string | null; // 自建文件夹 ID；null 仅兼容已有未分类文件
  size: number; // 字节
  uploadedAt: string; // UTC ISO 时间
};

type RepositoryListing = {
  settings: RepositorySettings;
  folders: RepositoryFolder[]; // 全部自建文件夹；不受文件游标分页影响
  files: RepositoryFile[];
  cursor: string | null;
};

type RepositoryFolder = {
  id: string;
  name: string;
  createdAt: string; // UTC ISO 时间
};
```

默认设置：

```json
{
  "title": "File Repository",
  "description": "Notes, resources, and files to keep and share.",
  "publicEnabled": true,
  "maxUploadMiB": 1024
}
```

## 列表和分页

```ts
const response = await fetch('/api/files', { cache: 'no-store' });
if (!response.ok) throw new Error((await response.json()).error);
const page: RepositoryListing = await response.json();
```

每页最多 100 个文件，按上传时间从新到旧。`cursor` 非空时请求 `/api/files?cursor=${encodeURIComponent(cursor)}`，管理列表对应 `/api/files/admin?cursor=...` 并携带 token。R2 可能提前截断一页，必须以 `cursor` 判断是否还有后续文件。

前端追加分页时按 `id` 去重。文件名搜索、按名称或大小排序可以先在已加载文件中完成；有分页时说明搜索范围，或者先读完所有页面再进行完整搜索。

`publicEnabled: false` 时，公开列表仍返回设置，但 `files: []`、`folders: []`、`cursor: null`；公开直链返回 `403`。管理列表和上传、删除不受影响。暂停期间管理员也可以携带 token 请求下载接口。

## 自建文件夹

不预设任何文件夹，也不根据扩展名自动分组。`folders` 返回全部顶层文件夹，按名称排序；每页文件列表都带完整 `folders`。最多支持 200 个自建文件夹，名称为 1–80 个 UTF-16 码元，规范化为 NFC 并去除首尾空白，不允许路径分隔符或控制字符。名称不区分大小写检查重复，重名返回 `409`。

- 创建：`POST /api/files/folders`，JSON `{ "name": "我的资料" }`，返回 `201 { folder }`。
- 改名：`PATCH /api/files/folders/:id`，JSON `{ "name": "新名称" }`，返回 `{ folder }`，保留 ID 和 createdAt。
- 删除：`DELETE /api/files/folders/:id`，无正文。仅允许空文件夹，非空返回 `409`，不存在返回 `404`。非空检查会遍历全部文件元数据页，不只检查当前界面已加载的文件。
- 上传到文件夹：原上传 URL 必须追加 `&folderId=${encodeURIComponent(folderId)}`，且 ID 必须指向已存在的文件夹。省略、空字符串、null 或不存在的 ID 返回 `400`，不会自动创建文件夹或上传到根目录。
- 移动文件：`PATCH /api/files/:id`，JSON `{ "folderId": "folder-..." }`，目标必须为已有文件夹；传 null、空字符串或不存在的 ID 返回 `400`，禁止移回根目录。返回 `{ file }`，可同时传 name 和 description。

根目录只作为自建文件夹的容器，不再接受新文件。文件列表 API 仍返回所有文件并保持已有 cursor 语义，前端按 folderId 筛选，在名称栏切换文件夹并显示其中的文件。没有 folderId 的旧文件继续保留，仍可下载；PATCH 不传 folderId 时可以修改其名称或说明，也可以传真实 folderId 将其移入文件夹。不会自动迁移、删除旧文件或创建预设文件夹。引用已删除文件夹的旧记录在列表中仍以 folderId:null 返回以便管理页整理，文件内容和下载地址保留；这一兼容行为不代表允许新上传或主动移回根目录。

## 上传

仓库设置上限为 1–5120 MiB（最高 5 GiB），新仓库默认 1024 MiB（1 GiB）。已经保存的 50 MiB 等设置继续保留，不会自动改大；管理员可自行调整。共享常量为 `maximumUploadMiB = 5120`、`directUploadLimitMiB = 95`、`multipartPartSizeMiB = 32`，`formatFileSize` 支持 GiB。

下面的旧 POST 接口仅用于不超过 95 MiB 的文件，并同时受仓库设置限制。超过 95 MiB 返回 `413` 和 `code: MULTIPART_REQUIRED`，必须使用下方分片接口；前端建议超过 32 MiB 就走分片，避免单个 HTTP 请求过大。空文件继续走旧 POST。

发送原始 `File` 作为正文，**不要使用 FormData 或 multipart/form-data**。浏览器会自动生成 Content-Length，请勿在浏览器代码中手动设置该受限请求头。使用 Blob/File 发送，避免没有已知长度的浏览器 ReadableStream 上传。

```ts
const response = await fetch(
  `/api/files?name=${encodeURIComponent(file.name)}&description=${encodeURIComponent(description)}&folderId=${encodeURIComponent(folderId)}`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
    },
    body: file,
  },
);
const result = await response.json();
if (!response.ok) throw new Error(result.error);
// result.file 是新文件；可立即插入列表。
```

如果需要上传进度，使用 `XMLHttpRequest` 的 `upload.onprogress`，其他方法、URL、正文和鉴权头保持一致。多文件上传由前端逐个发送，一个请求对应一个文件。取消上传使用 `AbortController` 或 `xhr.abort()`；批量操作遇到失败时保留已成功的文件并允许重试。

`description` query 参数可省略，省略时为空字符串，最长 400 个 UTF-16 码元。同名文件生成独立 ID，不覆盖。支持空文件。文件名上限 180 个 UTF-16 码元，禁止斜杠、反斜杠和控制字符。超限、非法文件名、缺少长度均会被服务端拒绝。上传流使用 Workers 的 FixedLengthStream 校验字节数，不把整个文件读入 Worker 内存。

## 大文件分片上传

所有分片接口均需要管理 token（或用户明确授权的本地预览开关），使用真实 R2 multipart API，Worker 不缓冲完整文件。每片固定 32 MiB，只有最后一片可较短。创建、每片上传和完成阶段都会受当前仓库上限约束。

| 步骤 | 请求                                                                                          | 成功返回                                |
| ---- | --------------------------------------------------------------------------------------------- | --------------------------------------- |
| 创建 | `POST /api/files/uploads`，JSON `{ name, description?, folderId, size }`                      | `201 { id, uploadId, partSizeMiB: 32 }` |
| 分片 | `PUT /api/files/uploads/:id/:uploadId/parts/:partNumber`，原始 `File.slice()` Blob            | `{ partNumber, etag }`                  |
| 合并 | `POST /api/files/uploads/:id/:uploadId/complete`，JSON `{ parts: [{partNumber, etag}, ...] }` | `200 { file: RepositoryFile }`          |
| 取消 | `DELETE /api/files/uploads/:id/:uploadId`，无正文                                             | `{ aborted: true }`                     |

`size` 必须是正整数且为整个文件的精确字节数，不能超过当前设置和 5 GiB。folderId 必填且必须指向已有文件夹，省略、null、空字符串或不存在的 ID 返回 `400`。旧版本创建但尚未完成的根目录上传会话，在 complete 阶段也会返回 `409` 并中止、清理，不能绕过新规则。id 和 uploadId 用 `encodeURIComponent` 放入路径段，uploadId 是内部 R2 上传 ID，不能自行修改或从其他上传复用。

partNumber 从 1 开始；`partCount = Math.ceil(file.size / (32 * 1024 * 1024))`。第 n 片正文为 `file.slice((n-1)*partBytes, Math.min(n*partBytes, file.size))`，浏览器自动生成 Content-Length；客户端不应手设该受限头，也不要使用 FormData。后端同时检查声明长度和真实流的字节数。同一 partNumber 可以重传，以最后一次成功返回的 etag 为准。

合并时 parts 数组必须按 partNumber 升序排列，从 1 连续到 partCount，不可遗漏、重复或伪造 ETag。后端将客户端数组与每片的私有服务端回执比较，再调用 R2 complete，最后复核合并后的精确文件大小和目标文件夹；全部通过后才写入公开文件元数据。合并前不会出现在公开列表中，直接下载 ID 也返回 404。

客户端保存每片成功返回的 `{partNumber, etag}`，只有 complete 返回 `{file}` 后才插入文件列表。进度可按已完成字节数加当前分片的 XMLHttpRequest 进度计算。失败或取消时应停止后续分片并请求 DELETE；片数、实际长度、回执、当前上限、目标文件夹等终止错误会由服务端中止 R2 上传并清理私有数据。服务端中止后，再次上传分片会返回 404，应提示重新上传。

complete 和 cancel 用条件写入获取同一个锁，避免取消操作删除已完成的文件。正在完成或已经完成的上传不能取消，DELETE 返回 409；成功完成的重复 complete 返回同一个文件。完成后会删除分片回执，只保留小型私有 session/claim 作为幂等凭据，用户删除文件时一并清除。取消、损坏回执、合并大小不符或公开元数据写入失败时清理未发布的内容；存储故障导致清理失败时返回 500，保留会话供再次取消，不会谎报成功。过期会话返回 `410`，前端应重新创建上传会话。

未完成会话有效期 24 小时，下次访问过期会话时尝试中止并返回 410。浏览器意外关闭等没有发出取消的情况，R2 默认会在 7 天后中止未完成 multipart；生产可按需配置 bucket lifecycle 清理长期不用的私有 uploads 元数据。R2 的 multipart 行为依据 [Workers API 参考](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) 和 [上传对象文档](https://developers.cloudflare.com/r2/objects/upload-objects/)。

## 下载和分享

```tsx
import { fileDownloadPath } from '@/lib/file-repository';

<a href={fileDownloadPath(file.id)} download={file.name}>
  Download
</a>;
```

必须保留 `download` 属性，现有 `SiteExperience` 会据此跳过站内页面转场。分享链接用 `new URL(fileDownloadPath(file.id), window.location.origin).href`。链接中不带 token。

附件强制使用 `application/octet-stream`、`Content-Disposition: attachment` 和 `nosniff`；HTML、SVG 等也作为下载附件，不能直接在博客同源执行。中文附件名通过 `filename*` 返回。

支持单段 `Range: bytes=start-end`、`bytes=start-`、`bytes=-suffix`，成功返回 `206` 和 Content-Range；无效范围返回 `416`。`If-Range` 支持 ETag，不匹配时返回完整文件。

## 文件信息、设置和删除

`PATCH /api/files/:id` 使用 `Content-Type: application/json` 和 token，正文为 `{ name?: string, description?: string, folderId?: string }`，至少传一个字段；返回 `{ file: RepositoryFile }`。省略字段保持原值；传空字符串 description 可清除说明；显式传 folderId 时必须指向已有文件夹，禁止 null 或空字符串。已有未分类文件可省略 folderId 修改名称和说明，也可指定真实文件夹进行整理。修改保留 ID、下载链接、上传时间和文件内容，后续下载使用新文件名。更新只写小型元数据记录，不重传大文件；服务端使用条件写入防止并发修改或删除后复活，冲突返回 `409`，应刷新列表再重试。

`PUT /api/files/settings` 使用 `Content-Type: application/json` 和 token，正文为完整 `RepositorySettings` 对象。一次保存全部字段；保存成功后用服务端返回的设置更新界面。设置 JSON 限制为 8 KiB。

`DELETE /api/files/:id` 携带 token，无正文。前端在删除前确认；成功后从列表移除对应 ID。已删除文件的原分享地址返回 `404`。

## 错误处理

除附件 Range 的 `416` 外，错误响应格式是 `{ "error": "说明文本" }`。

| 状态码 | 含义                                        | 前端处理建议                                                   |
| ------ | ------------------------------------------- | -------------------------------------------------------------- |
| 400    | 文件名、正文或设置不合法；上传中断/长度不符 | 显示 error，保留可重试操作                                     |
| 401    | manage token 缺失或错误                     | 锁定管理界面，重新输入                                         |
| 403    | 已暂停公开下载                              | 显示暂停提示                                                   |
| 404    | 文件不存在、已删除或 ID 不合法              | 提示文件不存在并刷新列表                                       |
| 405    | 不支持的方法                                | 检查调用方法                                                   |
| 409    | 文件信息被另一个操作修改或删除              | 刷新列表后重试编辑                                             |
| 411    | 上传没有 Content-Length                     | 使用 File/Blob 发送已知长度正文                                |
| 413    | 文件超过当前上限                            | 提示单文件限制                                                 |
| 415    | 设置接口不是 JSON                           | 使用 application/json                                          |
| 416    | 无效下载范围                                | 重试完整下载                                                   |
| 500    | 存储故障或保存的数据异常                    | 显示重试提示，不伪装成空仓库                                   |
| 503    | 未配置文件存储绑定或管理 token              | 提示配置缺失；token 缺失时 code 为 MANAGE_TOKEN_NOT_CONFIGURED |
| 502    | 显式本机验证桥无法完成验证                  | 提示重试；code 为 LOCAL_TOKEN_VERIFICATION_UNAVAILABLE         |

## 本地联调与部署

生产配置在 `wrangler.jsonc`：`FILES` 绑定 R2 bucket `youngkx-files`，文件、文件元数据、文件夹和仓库设置均存入这个 bucket。`files/` 保存文件二进制，`file-records/` 保存可编辑信息（含 folderId），`folders/` 保存自建文件夹，`repository/settings.json` 保存仓库设置。列表只读取文件元数据前缀；下载也会检查元数据存在，内部设置和记录不会变成附件。无需公开 R2 bucket，也无需额外配置 CORS。

本地真实鉴权联调：在 Git 忽略的 `.dev.vars` 中自行配置 `LINKS_ADMIN_TOKEN`，构建前端后运行：

```powershell
npm.cmd run build
npx.cmd wrangler dev --local --port 8787 --local-upstream www.youngkx.cn
```

访问 `http://localhost:8787`，使用本地 token。所有数据写入本地模拟 R2，不会写入线上。单独 `next dev` 的 3000 端口不提供这些 Worker API；前端如需要热更新，应自行在开发模式配置到 8787 的同源 API 代理，或者构建后从 Wrangler 联调。

现有 `npm run preview:test` 会传入 `LINKS_LOCAL_PREVIEW:true`，沿用仓库原有的本地鉴权绕过，仅适合页面自动化预览，不能用来检验 token 是否正确，且不得配置到生产。新增 `tests/files-runtime.test.mjs` 使用隔离的真实 Workers 运行时、独立本地 R2 和测试 token，验证真正的鉴权与存储行为。

本次用户已明确允许本地直接打开 manage 页，所以当前演示预览可显式传入 `--var LINKS_LOCAL_PREVIEW:true`。这是本次本地预览选择，生产配置没有这个开关，线上仍校验 LINKS_ADMIN_TOKEN。

无本地 secret 又没有显式预览开关时，管理请求返回 `503`，错误 code 为 `MANAGE_TOKEN_NOT_CONFIGURED`，不会把配置缺失伪装成 `401` token 输入错误。Cloudflare 已保存的生产 secret 无法直接读回到本地；本地 `.dev.vars` 必须另行配置，不能认为登录 Cloudflare 后会自动同步。

另保留一种严格可选的本机验证方式：

```powershell
npx.cmd wrangler dev --local --ip 127.0.0.1 --port 8787 --local-upstream localhost --var LINKS_LOCAL_AUTH_ORIGIN:https://www.youngkx.cn
```

仅当请求 hostname 为 localhost、127.0.0.1 或 [::1]，且没有本地 LINKS_ADMIN_TOKEN 时，才会将用户输入的 Bearer token 发往固定 HTTPS `www.youngkx.cn/api/links/admin` 做只读验证。它不会写入生产文件、不会跟随重定向，不保存或记录 token，不回传远端正文，5 秒超时；错误 token 返回 `401`，远端故障返回 `502`。此方式必须显式使用 `--local-upstream localhost`：省略时 Wrangler 会根据 routes 第一项采用 youngkx.cn，导致 Worker 重定向到线上；设为 www.youngkx.cn 又会使严格本机检测拒绝启用验证桥。配置本地 secret 后优先使用本地 secret，不再向线上验证；任意其他 origin、生产或伪装为 localhost 的域名均不能使用此桥。当前演示预览使用上一段的直接管理方式，无需启用这个桥。

正式部署前需要确认 Cloudflare 账户已启用 R2，并创建或确认 `youngkx-files` bucket 存在；未启用 R2 的账户会返回 Cloudflare 错误 `10042`，需要先在控制台启用。`LINKS` 继续绑定现有 `youngkxblog-links` KV，已有 `LINKS_ADMIN_TOKEN` 不需要重新设值。本地预览文件不会随代码部署自动复制到线上 R2。R2 用法依据 [Cloudflare Workers API 文档](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)。

当前范围不含嵌套子文件夹、外部 S3 客户端、超过 5 GiB 的文件，以及 token 在网站内轮换；这些功能可在后续扩展，不应在前端显示为可用操作。
