-- 테스트용 즉시 결제: 본인의 '결제 대기' 예약을 바로 '결제 완료'로 바꿈 (실제 돈 이동 없음)
-- js/config.js 의 PAYMENT_MODE 가 'instant' 일 때 사용. 실제 운영 시 'toss' 로 바꾸고 이 함수는 삭제할 것.
create or replace function public.dapark_test_pay(p_order_no text)
returns setof public.dapark_reservations
language sql
security definer
set search_path = public
as $$
  update public.dapark_reservations
     set status = 'paid',
         method = '테스트 결제',
         payment_key = 'TEST-' || order_no,
         paid_at = now()
   where order_no = p_order_no and user_id = auth.uid() and status = 'pending'
  returning *;
$$;

revoke execute on function public.dapark_test_pay(text) from public, anon;
grant execute on function public.dapark_test_pay(text) to authenticated;
