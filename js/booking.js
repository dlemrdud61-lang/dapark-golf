// 실시간 예약 + 결제
// 흐름: 날짜 고르기 → 남은 자리 불러오기(15초마다 자동 새로고침)
//      → 시간·코스·요금·인원 고르기 → [결제하기]
//      → DB에 '결제 대기' 예약 만들기(dapark_create_reservation: 자리 확인 + 금액 계산)
//      → 토스 결제창 → 결제 후 토스가 success.html / fail.html 로 보내줌

const params = new URLSearchParams(location.search);
const state = {
  date: todayKST(),
  slot: params.get('slot') || null,
  course: params.get('course') || null,
  plan: PLANS.some(p => p.id === params.get('plan')) ? params.get('plan') : 'normal18',
  people: Math.min(4, Math.max(1, Number(params.get('people')) || 4)),
  booked: {},      // { '09:00|A': 2 }
  capacity: 6,
};
const pd = params.get('date');
if (pd && pd >= todayKST() && pd <= todayKST(30)) state.date = pd;

let user = null;
let widgets = null;        // 토스 결제위젯 (한 번만 만들고 재사용)
let widgetsReady = false;
let currentOrder = null;   // 지금 결제창에 띄운 예약 { order_no, order_name, amount }

const $ = id => document.getElementById(id);

// ---------- 1. 날짜 ----------
function renderDates() {
  const box = $('dates');
  box.innerHTML = '';
  for (let i = 0; i <= 30; i++) {
    const ymd = todayKST(i);
    const [y, m, d] = ymd.split('-').map(Number);
    const wd = new Date(y, m - 1, d).getDay();
    const b = document.createElement('button');
    b.type = 'button';
    b.className = (wd === 0 ? 'sun ' : wd === 6 ? 'sat ' : '') + (ymd === state.date ? 'active' : '');
    b.innerHTML = `<small>${i === 0 ? '오늘' : m + '월'}</small><b>${d}</b><small>${WEEK[wd]}</small>`;
    b.addEventListener('click', () => {
      state.date = ymd;
      box.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      loadStatus();
    });
    box.appendChild(b);
  }
  const active = box.querySelector('.active');
  if (active) box.scrollLeft = active.offsetLeft - box.offsetLeft - 8;
}

// ---------- 2. 남은 자리 ----------
function isPast(slotId) {
  if (state.date !== todayKST()) return false;
  const nowKST = new Date(Date.now() + 9 * 3600e3).toISOString().slice(11, 16); // 'HH:MM'
  return slotId <= nowKST;
}
const remain = (slot, course) => state.capacity - (state.booked[slot + '|' + course] || 0);

async function loadStatus() {
  const { data, error } = await sb.rpc('dapark_slot_status', { p_date: state.date });
  if (error) {
    $('liveLabel').textContent = '연결 오류 · 잠시 후 다시 시도';
    return;
  }
  state.booked = {};
  (data || []).forEach(r => {
    state.booked[r.time_slot + '|' + r.course] = r.booked;
    state.capacity = r.capacity;
  });
  const t = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  $('liveLabel').textContent = `실시간 잔여 · ${t}`;

  // 고른 자리가 그 사이 마감되면 선택 해제
  if (state.slot && state.course && (isPast(state.slot) || remain(state.slot, state.course) <= 0)) {
    toast('선택하신 시간이 마감되어 선택을 해제했어요. 다른 시간을 골라 주세요.');
    state.slot = state.course = null;
  }
  renderTable();
  renderSummary();
}

function renderTable() {
  const t = $('slotTable');
  let html = '<div></div>' + COURSES.map(c => `<div class="th">${c.id} ${c.name}</div>`).join('');
  SLOTS.forEach(s => {
    html += `<div class="rh">${s.id}<small>${s.label.slice(8)}까지 · ${s.tag}</small></div>`;
    COURSES.forEach(c => {
      const left = remain(s.id, c.id);
      const past = isPast(s.id);
      const off = past || left <= 0;
      const active = state.slot === s.id && state.course === c.id;
      const label = past ? '마감' : left <= 0 ? '매진' : `${left}팀`;
      html += `<button type="button" class="cell${active ? ' active' : ''}${!off && left <= 2 ? ' few' : ''}"
        data-slot="${s.id}" data-course="${c.id}" ${off ? 'disabled' : ''}
        aria-label="${s.label} ${c.id} ${c.name} 코스 ${label}"><b>${label}</b>${off ? '' : '남음'}</button>`;
    });
  });
  t.innerHTML = html;
  t.querySelectorAll('.cell:not([disabled])').forEach(b => b.addEventListener('click', () => {
    state.slot = b.dataset.slot;
    state.course = b.dataset.course;
    renderTable();
    renderSummary();
  }));
}

// ---------- 3. 요금 · 인원 ----------
function renderPlans() {
  $('plans').innerHTML = PLANS.map(p => `
    <button type="button" class="plan${p.id === state.plan ? ' active' : ''}" data-plan="${p.id}">
      <b>${p.name}</b><strong>${won(p.price)}</strong><small>1인 · ${p.desc}</small>
    </button>`).join('');
  $('plans').querySelectorAll('[data-plan]').forEach(b => b.addEventListener('click', () => {
    state.plan = b.dataset.plan;
    renderPlans();
    renderSummary();
  }));
}
$('minus').addEventListener('click', () => { if (state.people > 1) { state.people--; renderSummary(); } });
$('plus').addEventListener('click', () => { if (state.people < 4) { state.people++; renderSummary(); } });

// ---------- 요약 ----------
function total() {
  return PLANS.find(p => p.id === state.plan).price * state.people;
}
function renderSummary() {
  $('peopleNum').textContent = state.people;
  $('sDate').textContent = formatPlayDate(state.date);
  $('sSlot').textContent = state.slot ? slotLabel(state.slot) : '선택해 주세요';
  $('sCourse').textContent = state.course ? courseName(state.course) + ' 코스' : '-';
  $('sPlan').textContent = planName(state.plan);
  $('sPeople').textContent = state.people + '명';
  $('sTotal').textContent = won(total());
  const btn = $('bookBtn');
  const ready = state.slot && state.course;
  btn.disabled = !ready;
  btn.textContent = !ready ? '시간·코스를 선택해 주세요'
    : user ? `${won(total())} 결제하기` : '로그인하고 결제하기';
}

// ---------- 결제 ----------
function payErrorText(e) {
  if (e.code === 'USER_CANCEL') return '결제를 취소했어요. 다시 시도하려면 결제 버튼을 눌러 주세요.';
  if (e.code === 'NEED_CARD_PAYMENT_DETAIL') return '카드사를 선택해 주세요.';
  if (e.code === 'NEED_AGREEMENT_WITH_REQUIRED_TERMS') return '필수 약관에 동의해 주세요.';
  if (e.code === 'NEED_REFUND_ACCOUNT_DETAIL') return '환불 받을 계좌 정보를 입력해 주세요.';
  return '결제 중 문제가 생겼어요: ' + (e.message || e);
}

function bookingQuery() {
  return `booking.html?date=${state.date}&slot=${encodeURIComponent(state.slot)}&course=${state.course}&people=${state.people}&plan=${state.plan}`;
}

$('bookBtn').addEventListener('click', async () => {
  const btn = $('bookBtn');
  $('bookMsg').className = 'msg';
  $('bookMsg').textContent = '';

  if (!user) {
    location.href = 'login.html?next=' + encodeURIComponent(bookingQuery());
    return;
  }

  btn.disabled = true;
  btn.textContent = '자리 확인 중…';

  // 1) 예약 만들기 (DB가 자리·금액을 직접 확인/계산)
  const { data: rows, error } = await sb.rpc('dapark_create_reservation', {
    p_date: state.date, p_slot: state.slot, p_course: state.course,
    p_people: state.people, p_plan: state.plan,
  });
  if (error || !rows || !rows.length) {
    $('bookMsg').className = 'msg msg-error';
    $('bookMsg').textContent = error ? error.message : '예약을 만들지 못했어요.';
    renderSummary();
    loadStatus();
    return;
  }
  currentOrder = rows[0];
  renderSummary();
  await openPayModal();
});

async function openPayModal() {
  $('payName').textContent = currentOrder.order_name;
  $('payAmount').textContent = won(currentOrder.amount);
  $('payMsg').className = 'msg';
  $('payMsg').textContent = '';
  $('payModal').hidden = false;
  document.body.style.overflow = 'hidden';

  const payBtn = $('payBtn');
  try {
    if (!widgets) {
      widgets = TossPayments(TOSS_CLIENT_KEY).widgets({ customerKey: user.id });
    }
    await widgets.setAmount({ currency: 'KRW', value: currentOrder.amount });
    if (!widgetsReady) {
      payBtn.disabled = true;
      await Promise.all([
        widgets.renderPaymentMethods({ selector: '#payment-method', variantKey: 'DEFAULT' }),
        widgets.renderAgreement({ selector: '#agreement', variantKey: 'AGREEMENT' }),
      ]);
      widgetsReady = true;
    }
    payBtn.disabled = false;
    payBtn.textContent = `${won(currentOrder.amount)} 결제하기`;
  } catch (e) {
    $('payMsg').className = 'msg msg-error';
    $('payMsg').textContent = '결제창을 불러오지 못했어요: ' + (e.message || e);
  }
}

$('payBtn').addEventListener('click', async () => {
  if (!currentOrder) return;
  const payBtn = $('payBtn');
  payBtn.disabled = true;
  $('payMsg').textContent = '';
  try {
    await widgets.requestPayment({
      orderId: currentOrder.order_no,
      orderName: currentOrder.order_name,
      customerEmail: user.email,
      customerName: (user.user_metadata && user.user_metadata.name) || undefined,
      successUrl: new URL('success.html', location.href).href,
      failUrl: new URL('fail.html', location.href).href,
    });
  } catch (e) {
    // 결제창이 닫혔거나 입력이 빠진 경우 → 같은 예약으로 다시 시도 가능
    $('payMsg').className = 'msg msg-error';
    $('payMsg').textContent = payErrorText(e);
    payBtn.disabled = false;
  }
});

// 결제하지 않고 창을 닫으면 → 잡아둔 자리 풀어주기
async function closePayModal() {
  $('payModal').hidden = true;
  document.body.style.overflow = '';
  if (currentOrder) {
    await sb.rpc('dapark_cancel_pending', { p_order_no: currentOrder.order_no });
    currentOrder = null;
    toast('결제를 취소했어요. 잡아둔 자리는 다시 풀렸어요.');
  }
  renderSummary();
  loadStatus();
}
$('payClose').addEventListener('click', closePayModal);
$('payModal').addEventListener('click', e => { if (e.target.id === 'payModal') closePayModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('payModal').hidden) closePayModal(); });

// ---------- 시작 ----------
(async function init() {
  user = await getUser();
  renderDates();
  renderPlans();
  renderSummary();
  await loadStatus();
  // 실시간: 15초마다, 그리고 다른 탭에 갔다가 돌아올 때 남은 자리 새로고침
  setInterval(() => { if (!document.hidden && $('payModal').hidden) loadStatus(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadStatus(); });
})();
