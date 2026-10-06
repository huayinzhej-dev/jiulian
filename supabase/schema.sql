-- ============================================================
-- 玖联包装印刷 · Supabase 后端结构
-- 用法：Supabase 控制台 → 左侧 SQL Editor → 新建查询 → 粘贴全部 → Run
-- 可重复执行（幂等），报错不会影响已建好的部分。
-- ============================================================

-- ---------- 1. 业务数据表 ----------
-- 采用「一条记录一行 + jsonb 存字段」的文档式存储。
-- 原因：后台有 30 多个集合且字段会随功能增减，逐表建列会让每次改页面都要改数据库。
-- 查询示例：select payload->>'status', count(*) from jl_records where collection='leads' group by 1;
create table if not exists public.jl_records (
  id           text primary key,          -- 行集合为 'leads:LD-001'，文档集合直接用集合名
  collection   text not null,             -- 集合名：leads / quotes / pricebook / settings_site ...
  payload      jsonb not null,            -- 原始对象，后台直接读写
  updated_at   timestamptz not null default now()
);

create index if not exists jl_records_collection_idx
  on public.jl_records (collection, updated_at desc);

alter table public.jl_records enable row level security;

-- 1.1 已登录员工：读写全部
drop policy if exists "jl_staff_full_access" on public.jl_records;
create policy "jl_staff_full_access" on public.jl_records
  for all to authenticated
  using (true) with check (true);

-- 1.2 官网访客：只能「写入新线索」，读不到任何数据，也改不了已有记录
--     只校验姓名非空，与官网现有表单字段保持一致（表单没有电话/邮箱栏）
drop policy if exists "jl_public_insert_lead" on public.jl_records;
create policy "jl_public_insert_lead" on public.jl_records
  for insert to anon
  with check (
    collection = 'leads'
    and coalesce(payload->>'name', '') <> ''
  );

-- 显式不给 anon 任何 select/update/delete 权限（RLS 默认拒绝，这里只是留痕说明）


-- ---------- 2. 文件存储桶（模切图 / 媒体库 / 资质证件）----------
insert into storage.buckets (id, name, public)
values ('jl-uploads', 'jl-uploads', true)
on conflict (id) do update set public = true;

-- 公开读：官网和后台都要能显示图片
drop policy if exists "jl_uploads_read" on storage.objects;
create policy "jl_uploads_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'jl-uploads');

-- 仅登录员工可上传 / 覆盖 / 删除
drop policy if exists "jl_uploads_insert" on storage.objects;
create policy "jl_uploads_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'jl-uploads');

drop policy if exists "jl_uploads_update" on storage.objects;
create policy "jl_uploads_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'jl-uploads');

drop policy if exists "jl_uploads_delete" on storage.objects;
create policy "jl_uploads_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'jl-uploads');


-- ---------- 3. 员工账号 ----------
-- 登录凭据（邮箱+密码、密码哈希、会话）全部由 Supabase Auth 托管，
-- 数据库里不存明文密码，前端也拿不到 password 字段。
-- 后台「管理员列表」页只存档案信息：姓名 / 角色 / 是否启用。
--
-- 建第一个账号（把邮箱和密码换成你自己的，然后执行本段）：
--   insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
--                           email_confirmed_at, created_at, updated_at,
--                           confirmation_sent_at, recovery_sent_at,
--                           raw_app_meta_data, raw_user_meta_data,
--                           is_sso_user, aud_role)
--   select '00000000-0000-0000-0000-000000000000',
--          gen_random_uuid(), 'authenticated', 'authenticated',
--          'boss@jiulian.com',
--          crypt('换成一个强密码', gen_salt('bf')),
--          now(), now(), now(), now(), now(),
--          '{"provider":"email","providers":["email"]}',
--          '{"name":"老板"}', false, 'authenticated';
--
-- 更省事的做法：后台「系统设置 → 管理员列表 → 新增账号」直接建，不用写 SQL。


-- ---------- 4. 自检 ----------
-- 执行完跑下面这句，返回 0 行属正常（表刚建好是空的）。
-- select collection, count(*) from public.jl_records group by collection order by 2 desc;
