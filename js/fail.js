// 결제 실패 페이지: 토스가 ?code=...&message=...&orderId=... 를 붙여서 보내줌
const p = new URLSearchParams(location.search);
const code = p.get('code');
const message = p.get('message');
const orderId = p.get('orderId');

if (code === 'PAY_PROCESS_CANCELED') {
  document.getElementById('reason').textContent = '결제를 취소했어요. 언제든 다시 예약할 수 있어요.';
} else if (message) {
  document.getElementById('reason').textContent = message + (code ? ` (${code})` : '');
}

// 잡아둔 자리 풀어주기 (본인 '결제 대기' 예약만 바뀜)
if (orderId) {
  getUser().then(user => {
    if (user) sb.rpc('dapark_cancel_pending', { p_order_no: orderId });
  });
}
