-- =========================================================
-- 다파크골프 실시간 예약 + 결제
-- (같은 Supabase 프로젝트를 goods-shop 과 함께 쓰므로 이름 앞에 dapark_ 를 붙임)
-- 관리자 판별은 goods-shop 이 만든 admins 테이블 + is_admin() 함수를 그대로 사용
--
-- dapark_reservations        : 예약/결제 내역 (본인 것만, 관리자는 전체)
-- dapark_slot_status(date)   : 날짜별 남은 자리 (누구나 조회, 개인정보 없음)
-- dapark_create_reservation  : 예약 만들기 (가격·자리수는 DB가 직접 계산)
-- dapark_cancel_pending      : 결제 안 하고 나간 예약 취소
-- =========================================================

create table if not exists public.dapark_reservations (
  id          uuid primary key default gen_random_uuid(),
  order_no    text not null unique,
  user_id     uuid not null references auth.users(id) on delete cascade,
  user_email  text not null,
  user_name   text not null default '',
  user_phone  text not null default '',
  play_date   date not null,
  time_slot   text not null check (time_slot in ('06:00','09:00','12:00','15:00','18:00')),
  course      text not null check (course in ('A','B','C','D')),
  people      integer not null check (people between 1 and 4),
  plan        text not null check (plan in ('normal18','normal36','senior18')),
  order_name  text not null,
  amount      integer not null check (amount > 0),
  status      text not null default 'pending'
              check (status in ('pending','paid','failed','canceled')),
  payment_key text,
  method      text,
  receipt_url text,
  paid_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists dapark_res_user_idx on public.dapark_reservations(user_id);
create index if not exists dapark_res_slot_idx on public.dapark_reservations(play_date, time_slot, course);

alter table public.dapark_reservations enable row level security;

drop policy if exists "dapark read own or admin" on public.dapark_reservations;
create policy "dapark read own or admin"
  on public.dapark_reservations for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
-- insert/update 정책 없음 = 화면에서 직접 만들거나 바꿀 수 없음.
-- 만들기는 dapark_create_reservation(), 결제완료는 Edge Function(dapark-confirm-payment)만 가능.

-- 한 코스·한 시간대에 받을 수 있는 최대 팀 수
create or replace function public.dapark_capacity() returns integer
language sql immutable set search_path = public as $$ select 6 $$;

-- 자리를 차지하는 예약: 결제완료 + 결제 진행 중(15분 이내)
create or replace function public.dapark_slot_status(p_date date)
returns table (time_slot text, course text, booked integer, capacity integer)
language sql
stable
security definer
set search_path = public
as $$
  select r.time_slot, r.course, count(*)::int, public.dapark_capacity()
  from public.dapark_reservations r
  where r.play_date = p_date
    and (r.status = 'paid'
         or (r.status = 'pending' and r.created_at > now() - interval '15 minutes'))
  group by r.time_slot, r.course;
$$;

grant execute on function public.dapark_slot_status(date) to anon, authenticated;

create or replace function public.dapark_create_reservation(
  p_date date, p_slot text, p_course text, p_people integer, p_plan text)
returns table (order_no text, order_name text, amount integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today  date := (now() at time zone 'Asia/Seoul')::date;
  v_nowt   time := (now() at time zone 'Asia/Seoul')::time;
  v_price  integer;
  v_label  text;
  v_used   integer;
  v_user   auth.users%rowtype;
  v_no     text;
  v_name   text;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;
  if p_slot not in ('06:00','09:00','12:00','15:00','18:00') then
    raise exception '시간대를 다시 선택해 주세요';
  end if;
  if p_course not in ('A','B','C','D') then
    raise exception '코스를 다시 선택해 주세요';
  end if;
  if p_people is null or p_people < 1 or p_people > 4 then
    raise exception '인원은 1~4명만 가능합니다';
  end if;
  if p_date is null or p_date < v_today or p_date > v_today + 30 then
    raise exception '예약은 오늘부터 30일 이내만 가능합니다';
  end if;
  if p_date = v_today and p_slot::time <= v_nowt then
    raise exception '이미 시작된 시간대는 예약할 수 없습니다';
  end if;

  case p_plan
    when 'normal18' then v_price := 15000; v_label := '일반 18홀';
    when 'normal36' then v_price := 25000; v_label := '일반 36홀';
    when 'senior18' then v_price := 10000; v_label := '경로·우대 18홀';
    else raise exception '요금 종류를 다시 선택해 주세요';
  end case;

  -- 같은 자리에 동시에 여러 명이 예약해도 순서대로 처리 (초과 예약 방지)
  perform pg_advisory_xact_lock(hashtext('dapark:' || p_date || p_slot || p_course));

  if (select count(*) from public.dapark_reservations r
      where r.user_id = auth.uid() and r.status = 'pending'
        and r.created_at > now() - interval '15 minutes') >= 3 then
    raise exception '결제 대기 중인 예약이 너무 많습니다. 잠시 후 다시 시도해 주세요';
  end if;

  select count(*) into v_used from public.dapark_reservations r
  where r.play_date = p_date and r.time_slot = p_slot and r.course = p_course
    and (r.status = 'paid'
         or (r.status = 'pending' and r.created_at > now() - interval '15 minutes'));
  if v_used >= public.dapark_capacity() then
    raise exception '방금 마감되었습니다. 다른 시간대나 코스를 선택해 주세요';
  end if;

  select * into v_user from auth.users where id = auth.uid();
  v_no := 'DAPARK-' || replace(gen_random_uuid()::text, '-', '');
  v_name := to_char(p_date, 'MM/DD') || ' ' || p_slot || ' ' || p_course || '코스 '
            || v_label || ' ' || p_people || '명';

  insert into public.dapark_reservations
    (order_no, user_id, user_email, user_name, user_phone,
     play_date, time_slot, course, people, plan, order_name, amount)
  values
    (v_no, v_user.id, v_user.email,
     coalesce(v_user.raw_user_meta_data->>'name', ''),
     coalesce(v_user.raw_user_meta_data->>'phone', ''),
     p_date, p_slot, p_course, p_people, p_plan, v_name, v_price * p_people);

  return query select v_no, v_name, v_price * p_people;
end;
$$;

revoke execute on function public.dapark_create_reservation(date, text, text, integer, text) from public, anon;
grant execute on function public.dapark_create_reservation(date, text, text, integer, text) to authenticated;

-- 결제창을 닫거나 실패했을 때: 본인의 '결제 대기' 예약만 취소 처리
create or replace function public.dapark_cancel_pending(p_order_no text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.dapark_reservations
     set status = 'failed'
   where order_no = p_order_no and user_id = auth.uid() and status = 'pending';
$$;

revoke execute on function public.dapark_cancel_pending(text) from public, anon;
grant execute on function public.dapark_cancel_pending(text) to authenticated;
