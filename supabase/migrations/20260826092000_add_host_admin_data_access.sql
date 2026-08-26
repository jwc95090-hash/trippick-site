-- Applied to production as Supabase migration: add_host_admin_data_access.
-- Host data is exposed only through admin-checked RPCs; no direct public table access.

create or replace function public.is_host_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'); $$;
create or replace function public.host_list_members() returns table (display_name text, masked_email text, signup_provider text, joined_at timestamptz) language sql stable security definer set search_path = public as $$ select coalesce(nullif(p.display_name, ''), '회원'), pm.masked_email, pm.signup_provider, pm.joined_at from public.portfolio_members pm left join public.profiles p on p.id = pm.user_id where public.is_host_admin() order by pm.joined_at desc; $$;
create or replace function public.host_list_board_posts() returns table (id bigint, author_name text, category text, title text, body text, is_secret boolean, admin_answer text, status text, created_at timestamptz) language sql stable security definer set search_path = public as $$ select b.id, b.author_name, b.category, b.title, b.body, b.is_secret, b.admin_answer, b.status, b.created_at from public.board_posts b where public.is_host_admin() order by b.created_at desc; $$;
create or replace function public.host_answer_board_post(p_post_id bigint, p_answer text) returns void language plpgsql security definer set search_path = public as $$ begin if not public.is_host_admin() then raise exception '관리자 권한이 필요합니다.'; end if; if char_length(trim(coalesce(p_answer, ''))) < 1 or char_length(trim(p_answer)) > 4000 then raise exception '답변은 1~4000자로 입력해 주세요.'; end if; update public.board_posts set admin_answer = trim(p_answer), status = 'answered', updated_at = now() where id = p_post_id; if not found then raise exception '상담글을 찾을 수 없습니다.'; end if; end; $$;
revoke all on function public.is_host_admin() from public;
revoke all on function public.host_list_members() from public;
revoke all on function public.host_list_board_posts() from public;
revoke all on function public.host_answer_board_post(bigint, text) from public;
revoke execute on function public.is_host_admin() from anon;
revoke execute on function public.host_list_members() from anon;
revoke execute on function public.host_list_board_posts() from anon;
revoke execute on function public.host_answer_board_post(bigint, text) from anon;
grant execute on function public.is_host_admin() to authenticated;
grant execute on function public.host_list_members() to authenticated;
grant execute on function public.host_list_board_posts() to authenticated;
grant execute on function public.host_answer_board_post(bigint, text) to authenticated;
