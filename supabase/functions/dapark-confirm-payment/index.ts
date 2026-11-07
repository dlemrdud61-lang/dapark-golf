// =========================================================
// dapark-confirm-payment : 다파크 예약 결제 "최종 승인" 서버 함수
// 결제 성공 화면(success.html)이 paymentKey, orderId, amount 를 보내면
// 1) 로그인한 본인의 예약인지, 2) 금액이 DB 금액과 같은지 확인하고
// 3) 토스에 최종 승인 요청 → 성공하면 예약을 paid(결제 완료)로 바꾼다.
// 토스 시크릿 키는 Supabase secret(TOSS_SECRET_KEY)에만 있어 화면에 노출되지 않는다.
// =========================================================
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ message: "POST only" }, 405);

  try {
    const { paymentKey, orderId, amount } = await req.json();
    if (!paymentKey || !orderId || !amount) {
      return json({ message: "결제 정보가 부족합니다." }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) 요청한 사람 확인
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData.user) return json({ message: "로그인이 필요합니다." }, 401);

    // 2) 예약 확인
    const { data: r, error: rErr } = await admin
      .from("dapark_reservations")
      .select("*")
      .eq("order_no", orderId)
      .maybeSingle();
    if (rErr || !r) return json({ message: "예약을 찾을 수 없습니다." }, 404);
    if (r.user_id !== userData.user.id) return json({ message: "본인 예약이 아닙니다." }, 403);
    if (r.status === "paid") return json({ message: "이미 결제가 완료된 예약입니다.", reservation: r });
    if (r.status !== "pending") return json({ message: "취소되었거나 만료된 예약입니다. 다시 예약해 주세요." }, 400);
    if (Number(amount) !== r.amount) {
      return json({ message: "결제 금액이 예약 금액과 다릅니다." }, 400);
    }

    // 3) 토스에 최종 승인 요청
    const secret = Deno.env.get("TOSS_SECRET_KEY")!;
    const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(secret + ":"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount: r.amount }),
    });
    const toss = await tossRes.json();

    if (!tossRes.ok) {
      await admin.from("dapark_reservations").update({ status: "failed" }).eq("id", r.id);
      return json({ message: toss.message ?? "결제 승인에 실패했습니다.", code: toss.code }, 400);
    }

    // 4) 결제 완료로 변경
    const { data: updated } = await admin
      .from("dapark_reservations")
      .update({
        status: "paid",
        payment_key: paymentKey,
        method: toss.method ?? null,
        receipt_url: toss.receipt?.url ?? null,
        paid_at: toss.approvedAt ?? new Date().toISOString(),
      })
      .eq("id", r.id)
      .select()
      .single();

    return json({ message: "결제가 완료되었습니다.", reservation: updated });
  } catch (e) {
    return json({ message: "서버 오류: " + (e as Error).message }, 500);
  }
});
