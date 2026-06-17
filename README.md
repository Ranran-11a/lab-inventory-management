# 实验室库存管理系统

面向课题组少量成员协作使用的实验室试剂与耗材库存管理网站。项目目标是 0 元/月运行：Vercel Hobby 免费版部署前端，Supabase Free 免费版提供登录和 PostgreSQL 数据库，GitHub 免费仓库托管代码，使用 Vercel 自动生成的 `.vercel.app` 域名。

## 免费使用说明

- 设计目标：Vercel Hobby + Supabase Free 0 元/月运行。
- 不需要购买服务器、数据库、域名或邮件服务。
- 不使用自定义域名，直接使用 Vercel 自动生成的网址。
- 不使用 Supabase Storage，不上传试剂图片、PDF、发票、SDS 或说明书附件。
- 不使用 AI API、短信、OCR、付费搜索、付费邮件、付费 cron 或持续后台服务器。
- Supabase Free 有免费额度和项目数量限制；项目长时间不活跃可能暂停，需要到 Supabase 控制台恢复。
- 如果以后成员很多、访问量很大、数据量很大或需要上传大量文件，可能需要升级付费方案。
- 当前版本提供手动 CSV 导出作为免费备份方式，不做自动云备份任务。

## 当前数据接入状态

- `NEXT_PUBLIC_DATA_SOURCE=mock`：本地演示模式，使用 mock 数据，新增/编辑/出入库只存在于浏览器运行期间，刷新后会回到初始状态。
- `NEXT_PUBLIC_DATA_SOURCE=supabase`：真实数据库模式，使用 Supabase Auth + RLS + PostgreSQL。库存物品、批次、出入库记录和审计日志会写入 Supabase。
- 当前不需要 `SUPABASE_SERVICE_ROLE_KEY`。项目优先依赖 Supabase Auth 和 RLS，避免把高权限密钥用于 Vercel 前端。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

`npm run dev` 固定监听 `127.0.0.1:3000`。如果端口被占用，请关闭占用进程，或临时执行：

```bash
npx next dev -H 127.0.0.1 -p 3001
```

常用检查：

```bash
npm run lint
npm run build
```

生产模式本地预览：

```bash
npm run build
npm run start
```

## 0 元部署步骤

1. 创建 GitHub 免费仓库并推送本项目代码。
2. 创建 Supabase Free 项目。
3. 在 Supabase SQL Editor 中依次执行：
   - `sql/schema.sql`
   - `sql/seed.sql`
4. 在 Supabase Authentication 中启用 Email 登录。可按需要关闭邮箱确认，方便课题组内部注册。
5. 创建 Vercel Hobby 免费项目，导入 GitHub 仓库。
6. Vercel Framework Preset 选择 `Next.js`。
7. Vercel Build Command 使用 `npm run build`。
8. 在 Vercel Project Settings 的 Environment Variables 中配置：

```bash
NEXT_PUBLIC_DATA_SOURCE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

9. 点击 Deploy。部署完成后使用 Vercel 自动生成的 `.vercel.app` 地址访问。

## Supabase 配置

复制 `.env.example` 为 `.env.local`：

```bash
NEXT_PUBLIC_DATA_SOURCE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

本地没有 Supabase 时，可使用：

```bash
NEXT_PUBLIC_DATA_SOURCE=mock
```

## 创建第一个 admin 用户

1. 在网站注册第一个账号。
2. 打开 Supabase SQL Editor。
3. 执行以下 SQL，把邮箱替换成你的注册邮箱：

```sql
update profiles
set role = 'admin'
where email = 'your-email@example.com';
```

之后 admin 可以通过 SQL 或后续管理界面调整其他成员角色。新注册用户默认是 `viewer`。

角色说明：

- `viewer`：查看、搜索、筛选、导出 CSV。
- `editor`：新增物品、编辑物品、入库、出库、导入 CSV。
- `admin`：editor 的能力，加上软删除、恢复、分类管理、审计日志查看。

数据库 RLS 会限制写入权限，不只依赖前端隐藏按钮。

## 功能概览

- 仪表盘：总物品、总批次、低库存、即将过期、已过期、本月新增采购批次。
- 库存列表：关键词搜索、类型/功能分类/位置/状态/厂家/负责人筛选，分页默认 25 条，最多 100 条。
- 详情页：基本信息、库存汇总、批次列表、出入库记录。
- 新增/编辑/软删除物品。
- 入库：创建库存批次并写入 `stock_movements`。
- 出库：支持指定批次出库，也支持按最快过期批次自动扣减。
- CSV：浏览器端解析和导出，不上传到服务器，不使用文件存储。建议定期手动导出 CSV 作为免费备份。

## 免费版资源控制

- 不启用 Supabase Realtime。
- 列表页默认分页，避免一次渲染过多数据。
- Supabase 初始加载限制为免费友好的数量；大量数据时应继续扩展为数据库端分页查询。
- 列表页只显示汇总信息；详情页才展示单个物品的批次和出入库记录。
- CSV 导出在浏览器端生成，请不要一次导出过大数据。

## 数据表

SQL 文件位于：

- `sql/schema.sql`
- `sql/seed.sql`

主要表：

- `profiles`
- `function_categories`
- `inventory_items`
- `inventory_batches`
- `stock_movements`
- `audit_logs`

删除采用 `deleted_at` 软删除，不做物理删除。

## 后续建议

- 增加 admin 角色管理界面。
- 将库存列表进一步改为严格数据库端分页和数据库端汇总视图。
- 增加恢复已删除物品页面。
- 增加审计日志页面。
