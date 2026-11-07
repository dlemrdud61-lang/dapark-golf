// 결제 성공 페이지
// 토스가 ?paymentKey=...&orderId=...&amount=... 를 붙여서 이 페이지로 보내줌.
// 이때는 아직 "승인 전"이라, 서버 함수(dapark-confirm-payment)에 최종 승인을 요청해야 결제가 끝남.

const box = document.getElementById('result');

function render(icon, title, text, r) {
  box.innerHTML = `
    <div class="result-icon">${icon}</div>
    <h1>${esc(title)}</h1>
    <p>${esc(text)}</p>
    ${r ? `
      <table class="kv">
        <tr><th>라운딩</th><td>${formatPlayDate(r.play_date)} · ${esc(slotLabel(r.time_slot))}</td></tr>
        <tr><th>코스</th><td>${esc(courseName(r.course))} 코스</td></tr>
        <tr><th>요금 · 인원</th><td>${esc(planName(r.plan))} · ${r.people}명</td></tr>
        <tr><th>결제 금액</th><td>${won(r.amount)}</td></tr>
        <tr><th>결제 수단</th><td>${esc(r.method || '-')}</td></tr>
        <tr><th>결제 일시</th><td>${formatDateTime(r.paid_at)}</td></tr>
        <tr><th>예약번호</th><td>${esc(r.order_no)}</td></tr>
      </table>` : ''}
    <div class="actions">
      <a href="mypage.html" class="btn btn-primary">내 결제내역 보기</a>
      ${r && r.receipt_url ? `<a href="${esc(r.receipt_url)}" target="_blank" rel="noopener" class="btn btn-line">영수증</a>` : ''}
      <a href="booking.html" class="btn btn-line">${r ? '추가 예약' : '다시 예약하기'}</a>
    </div>`;
}

(async function confirmPayment() {
  const user = await requireLogin();
  if (!user) return;

  const p = new URLSearchParams(location.search);
  const paymentKey = p.get('paymentKey');
  const orderId = p.get('orderId');
  const amount = Number(p.get('amount'));

  if (!paymentKey || !orderId || !amount) {
    render('⚠️', '결제 정보가 없어요', '예약 페이지에서 다시 시도해 주세요.');
    return;
  }

  const { data, error } = await sb.functions.invoke('dapark-confirm-payment', {
    body: { paymentKey, orderId, amount },
  });

  if (error) {
    let message = error.message;
    try { message = (await error.context.json()).message || message; } catch (_) { /* 무시 */ }
    render('😢', '결제 승인에 실패했어요', message);
    return;
  }

  // 새로고침해도 같은 승인 요청이 다시 가지 않도록 주소창 정리
  history.replaceState(null, '', 'success.html');
  render('🎉', '예약이 확정되었어요!', '라운딩 당일 프런트에서 성함을 말씀해 주세요.', data.reservation);
})();
