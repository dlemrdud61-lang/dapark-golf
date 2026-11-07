// 관리자 페이지: 모든 회원의 예약/결제 내역
// 관리자 여부는 DB 함수 is_admin() 으로 확인하고,
// DB 보안 규칙(RLS)도 관리자에게만 전체 내역을 보여주므로 화면을 조작해도 남의 내역은 안 보임.

let all = [];
const $ = id => document.getElementById(id);

function render() {
  const q = $('q').value.trim().toLowerCase();
  const st = $('fStatus').value;
  const d = $('fDate').value;

  const rows = all.filter(r =>
    (!st || r.status === st) &&
    (!d || r.play_date === d) &&
    (!q || [r.user_name, r.user_email, r.user_phone, r.order_no].join(' ').toLowerCase().includes(q)));

  const sum = rows.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
  $('countLabel').textContent = `${rows.length}건 표시 · 이 목록의 결제완료 합계 ${won(sum)}`;

  $('rows').innerHTML = rows.length ? rows.map(r => `
    <tr>
      <td>${formatDateTime(r.paid_at || r.created_at)}<span class="sub">${esc(r.order_no.slice(-12))}</span></td>
      <td><b>${esc(r.user_name || '(이름 없음)')}</b><span class="sub">${esc(r.user_email)}</span>${r.user_phone ? `<span class="sub">${esc(r.user_phone)}</span>` : ''}</td>
      <td>${formatPlayDate(r.play_date)}<span class="sub">${esc(slotLabel(r.time_slot))} · ${esc(courseName(r.course))}</span></td>
      <td>${esc(planName(r.plan))}<span class="sub">${r.people}명</span></td>
      <td>${esc(r.method || '-')}${r.receipt_url ? `<span class="sub"><a href="${esc(r.receipt_url)}" target="_blank" rel="noopener" style="color:var(--sea)">영수증</a></span>` : ''}</td>
      <td>${statusBadge(r.status)}</td>
      <td class="num">${won(r.amount)}</td>
    </tr>`).join('')
    : '<tr><td colspan="7" class="empty">조건에 맞는 내역이 없어요.</td></tr>';
}

function renderStats() {
  const paid = all.filter(r => r.status === 'paid');
  const today = todayKST();
  const paidToday = paid.filter(r => r.paid_at && new Date(new Date(r.paid_at).getTime() + 9 * 3600e3).toISOString().slice(0, 10) === today);
  $('stTotal').textContent = won(paid.reduce((s, r) => s + r.amount, 0));
  $('stCount').textContent = paid.length + '건';
  $('stToday').textContent = won(paidToday.reduce((s, r) => s + r.amount, 0));
  $('stTeams').textContent = paid.filter(r => r.play_date === today).length + '팀';
}

async function load() {
  const { data, error } = await sb
    .from('dapark_reservations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) {
    $('liveLabel').textContent = '불러오기 실패: ' + error.message;
    return;
  }
  all = data;
  renderStats();
  render();
  $('liveLabel').textContent = '실시간 · ' + new Date().toLocaleTimeString('ko-KR') + ' 갱신 (30초마다 자동)';
}

['q', 'fStatus', 'fDate'].forEach(id => $(id).addEventListener('input', render));
$('resetBtn').addEventListener('click', () => {
  $('q').value = ''; $('fStatus').value = 'paid'; $('fDate').value = '';
  render();
});
$('adminLoginBtn').addEventListener('click', async () => {
  await sb.auth.signOut();
  location.href = 'login.html?next=admin.html';
});

(async function init() {
  const user = await requireLogin();
  if (!user) return;
  if (!(await checkAdmin())) {
    $('denied').hidden = false;
    $('liveLabel').hidden = true;
    return;
  }
  $('adminArea').hidden = false;
  await load();
  setInterval(() => { if (!document.hidden) load(); }, 30000);
})();
