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

-- 1.1 已登录员工：读写全部（外勤 field_ 开头的集合除外，见 1.4）
--     ⚠️ 这里必须把 field_ 开头的集合排除掉。Postgres 的多条 permissive 策略是
--     「或」的关系：只要有一条 using(true) 命中，销售照样能读走全公司的客户名录和
--     别人的打卡记录。所以要做数据库级隔离，第一步就是把这条宽策略收窄。
--     ⚠️ 判前缀一律用 starts_with(collection, 'field_')，别用 left()：
--     left('field_trips',6) 是 'field_'、left(...,5) 才是 'field'，长度写错一位这条
--     排除条件就永远不成立，宽策略照样把外勤五个集合整个放行（本机真库测出来的）。
drop policy if exists "jl_staff_full_access" on public.jl_records;
create policy "jl_staff_full_access" on public.jl_records
  for all to authenticated
  using (not starts_with(collection, 'field_'))
  with check (not starts_with(collection, 'field_'));

-- 1.2 官网访客：可以「写入新线索」，但改不了已有记录
--     只校验姓名非空，与官网现有表单字段保持一致（表单没有电话/邮箱栏）
drop policy if exists "jl_public_insert_lead" on public.jl_records;
create policy "jl_public_insert_lead" on public.jl_records
  for insert to anon
  with check (
    collection = 'leads'
    and coalesce(payload->>'name', '') <> ''
  );

-- 除下面 1.3 的公开内容外，不给 anon 任何 select/update/delete 权限（RLS 默认拒绝）

-- 1.3 官网访客：只读「前台要展示的公开内容」
--     ⚠️ 这里必须是白名单枚举，绝不能写成 using(true)。
--     一旦放开整表读权限，任何人拿官网页面上的 publishable key 就能读走
--     全部客户线索、客户资料、报价、订单、付款记录和管理员账号。
--     清单与 js/main.js 里的 PUBLIC_COLS + DOC_COLS 一一对应：前台多渲染一个版块，
--     这里才多放一个集合，反过来砍掉前台版块时也要同步砍掉，别多给。
--     settings_* 只放首页真正读的那 5 个；其余 settings_*（通知模板、税率、
--     报价单模板、价格簿 pricebook 等）前台不读或含内部经营数据，绝不放开。
--     categories 是首页「产品中心」那排分类筛选标签要读的（只有分类名/层级，无经营数据）。
--     ⚠️ 改完这一段必须在 SQL Editor 里重跑一次本文件，前台才会读到新集合。
drop policy if exists "jl_public_read_content" on public.jl_records;
create policy "jl_public_read_content" on public.jl_records
  for select to anon
  using (
    collection in (
      'clients', 'products', 'testimonials', 'faqs', 'categories',
      'settings_banner', 'settings_advantages', 'settings_stats',
      'settings_about', 'settings_process'
    )
  );
-- 只读策略不写 with check，anon 依然改不了、删不掉任何一行
-- 登录员工由 1.1 的 jl_staff_full_access 覆盖，不需要在这里重复授权


-- ---------- 1.4 外勤数据（field_trips / field_checkins / field_customers / field_followups / field_dicts）----------
-- 规则：销售只看/只改自己那几行（按 payload->>'ownerId' 判），主管看全部。
-- 这套判断只写在数据库里，写在网页上不算数——手机改一下本地脚本就能越权。
-- 前台官网一个字段都不读这几个集合，所以 anon 在这里依然是完全无权限。
--
-- 谁是「主管」由下面这张名单决定，而不是由前端传什么 role 决定。
-- user_id 就是 Supabase Auth 的用户 id（登录令牌里的 auth.uid()）。
create table if not exists public.jl_field_supervisors (
  user_id    uuid primary key,
  email      text,
  note       text,
  created_at timestamptz not null default now()
);
alter table public.jl_field_supervisors enable row level security;
-- 故意不给这张表建任何策略：anon 和 authenticated 都不能通过 REST 读它，
-- 只有下面这个 security definer 函数（表所有者 postgres 身份运行）能查。
-- 顺手把 Supabase 默认给的表权限也收回来——RLS 已经拦住了，这层是防以后有人误建策略。
revoke all on table public.jl_field_supervisors from anon, authenticated;

-- 判断当前登录者是不是主管。security definer + 固定 search_path，
-- 免得策略里直接子查询那张表时被自己的 RLS 挡住（读不到就等于人人不是主管）。
create or replace function public.jl_is_field_supervisor()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.jl_field_supervisors s where s.user_id = auth.uid());
$$;
alter function public.jl_is_field_supervisor() owner to postgres;
grant execute on function public.jl_is_field_supervisor() to authenticated;

-- (a) 销售：只能读写自己名下的外勤记录（基础配置 field_dicts 除外，见 c）
--     with check 用同一条件，意味着「把 ownerId 写成别人的 id」也插不进去。
drop policy if exists "jl_field_owner_rw" on public.jl_records;
create policy "jl_field_owner_rw" on public.jl_records
  for all to authenticated
  using (
    collection <> 'field_dicts'
    and starts_with(collection, 'field_')
    and payload->>'ownerId' = auth.uid()::text
  )
  with check (
    collection <> 'field_dicts'
    and starts_with(collection, 'field_')
    and payload->>'ownerId' = auth.uid()::text
  );

-- (b) 主管：外勤五个集合全部可读可改可删（PC 后台的筛选、导出、改档案、删档都靠这条）
drop policy if exists "jl_field_supervisor_rw" on public.jl_records;
create policy "jl_field_supervisor_rw" on public.jl_records
  for all to authenticated
  using (starts_with(collection, 'field_') and public.jl_is_field_supervisor())
  with check (starts_with(collection, 'field_') and public.jl_is_field_supervisor());

-- (c) 基础配置（下拉选项）：全公司共享，任何登录员工都要能读到，否则手机端下拉框空白。
--     写权限仍由 (b) 限定为主管；销售改了也不会入库（下次拉取会被云端刷回来）。
drop policy if exists "jl_field_dicts_read" on public.jl_records;
create policy "jl_field_dicts_read" on public.jl_records
  for select to authenticated
  using (collection = 'field_dicts');

-- (d) 引导名单：把「系统设置 → 管理员列表」里角色写着主管/老板的那批人先放进名单，
--     这样跑完本文件他们立刻能在 PC 后台看到全部外勤数据，不用再手写 SQL。
--     那个 id 格式正则是必须的：名单里有本机时代留下的 U-01 这种旧 id，
--     没有正则挡一下，(payload->>'id')::uuid 会直接报错，整段都执行不了。
insert into public.jl_field_supervisors (user_id, email, note)
select distinct (r.payload->>'id')::uuid, r.payload->>'email', '由 schema.sql 按管理员名单角色自动提升'
from public.jl_records r
where r.collection = 'users'
  and r.payload->>'role' in ('超级管理员', '主管', '老板', '管理员')
  and r.payload->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
on conflict (user_id) do nothing;

-- (e) 如果 (d) 没把你认出来（比如名单里你的角色写的是「销售」，或你还没建过档案），
--     把下面这行的邮箱换成你登录后台用的邮箱，取消注释后单独执行一次：
-- insert into public.jl_field_supervisors (user_id, email, note)
-- select id, email, '手动加入' from auth.users where email = '你的登录邮箱'
-- on conflict (user_id) do nothing;
--
-- 查名单：select * from public.jl_field_supervisors;   移人：delete from public.jl_field_supervisors where email='...';
-- 查所有登录账号的 id 和邮箱：select id, email, created_at from auth.users order by created_at;


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
--
-- 想确认外勤隔离这版策略真的建上了（比看控制台靠谱），跑这两句：
--   1) 把每条策略的实际条件打印出来，重点看 jl_staff_full_access 那行
--      是不是带 not starts_with(collection, 'field_')，以及三条 jl_field_* 在不在：
--      select polname, pg_get_expr(polqual, polrelid) as using_条件,
--             pg_get_expr(polwithcheck, polrelid) as check_条件
--      from pg_policy where polrelid = 'public.jl_records'::regclass order by polname;
--   2) 确认主管名单里有没有你（空表 = 你只能看到自己的外勤记录）：
--      select user_id, email, note from public.jl_field_supervisors order by created_at;
