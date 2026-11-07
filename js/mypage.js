// 내 결제내역: 로그인한 본인의 예약만 보임 (DB 보안 규칙 RLS 가 자동으로 걸러줌)
let all = [];
let filter = 'paid';
const listEl = document.getElementById('list');

function render() {
  const today = todayKST();
  const rows = all.filter(r =>
    filter === 'all' ? true
      : filter === 'upcoming' ? r.status === 'paid' && r.play_date >= today
      : r.status === 'paid');

  if (!rows.length) {
    listEl.innerHTML = `<div class="card empty">
      <p>${filter === 'all' ? '아직 예약 내역이 없어요.' : filter === 'upcoming' ? '다가오는 라운딩이 없어요.' : '결제 완료된 예약이 없어요.'}</p>
      <a href="booking.html" class="btn btn-primary">지금 예약하기</a></div>`;
    return;
  }

  listEl.innerHTML = rows.map(r => `
    <article class="card res-item${r.play_date < today ? ' past' : ''}">
      <div>
        <h3>${formatPlayDate(r.play_date)} · ${esc(slotLabel(r.time_slot))}</h3>
        <p class="meta">${esc(courseName(r.course))} 코스 · ${esc(planName(r.plan))} · ${r.people}명</p>
        <p class="meta">결제 ${formatDateTime(r.paid_at || r.created_at)} · ${esc(r.method || '-')} · 예약번호 ${esc(r.order_no.slice(-8))}</p>
      </div>
      <div class="side">
        ${statusBadge(r.status)}
        <span class="amt">${won(r.amount)}</span>
        ${r.receipt_url ? `<a class="small" style="color:var(--sea)" href="${esc(r.receipt_url)}" target="_blank" rel="noopener">영수증 보기 →</a>` : ''}
      </div>
    </article>`).join('');
}

document.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
  filter = b.dataset.f;
  document.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('active', x === b));
  render();
}));

(async function init() {
  const user = await requireLogin();
  if (!user) return;
  const name = (user.user_metadata && user.user_metadata.name) || '';
  document.getElementById('who').textContent = `${name ? name + '님 · ' : ''}${user.email}`;

  const { data, error } = await sb
    .from('dapark_reservations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    listEl.innerHTML = `<div class="card empty">내역을 불러오지 못했어요: ${esc(error.message)}</div>`;
    return;
  }
  all = data;
  const paidSum = all.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
  if (paidSum) document.getElementById('who').textContent += ` · 총 결제 ${won(paidSum)}`;
  render();
})();
