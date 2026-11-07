// 모든 페이지가 함께 쓰는 기능
// - sb: Supabase 연결 객체
// - 상단 메뉴의 로그인/내 예약/관리자/로그아웃 표시
// - 로그인 확인, 관리자 확인, 금액·날짜 표시

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getUser() {
  const { data } = await sb.auth.getSession();
  return data.session ? data.session.user : null;
}

// 관리자 여부는 DB 함수(is_admin)로 확인 → 화면 조작으로 속일 수 없음
async function checkAdmin() {
  const { data, error } = await sb.rpc('is_admin');
  return !error && data === true;
}

// 로그인 안 했으면 로그인 페이지로 보내고, 로그인 후 원래 페이지로 돌아오게 함
async function requireLogin() {
  const user = await getUser();
  if (!user) {
    const here = location.pathname.split('/').pop() + location.search;
    location.href = 'login.html?next=' + encodeURIComponent(here);
    return null;
  }
  return user;
}

const won = n => Number(n).toLocaleString('ko-KR') + '원';

function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
// '2026-11-08' → '11월 8일 (일)'
function formatPlayDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${m}월 ${d}일 (${WEEK[new Date(y, m - 1, d).getDay()]})`;
}

// 한국 시간 기준 오늘 날짜 'YYYY-MM-DD'
function todayKST(offsetDays = 0) {
  const t = new Date(Date.now() + 9 * 3600e3 + offsetDays * 864e5);
  return t.toISOString().slice(0, 10);
}

// 사용자 입력/DB 글자를 화면에 넣을 때 HTML로 해석되지 않게 막기
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const STATUS_LABEL = { paid: '결제 완료', pending: '결제 대기', failed: '결제 실패', canceled: '취소' };
const statusBadge = s => `<span class="st st-${esc(s)}">${STATUS_LABEL[s] || esc(s)}</span>`;

const courseName = id => { const c = COURSES.find(c => c.id === id); return c ? `${c.id} ${c.name}` : id; };
const slotLabel = id => { const s = SLOTS.find(s => s.id === id); return s ? s.label : id; };
const planName = id => { const p = PLANS.find(p => p.id === id); return p ? p.name : id; };

// ---------- 상단 메뉴: 로그인 상태 표시 ----------
async function renderAuthNav() {
  const box = document.getElementById('authNav');      // PC 화면 오른쪽
  const mBox = document.getElementById('authNavM');    // 모바일 메뉴 안
  if (!box && !mBox) return;
  const user = await getUser();

  const draw = (isAdmin) => {
    const links = user
      ? `<a href="mypage.html">내 결제내역</a>${isAdmin ? '<a href="admin.html">관리자</a>' : ''}<button type="button" data-logout>로그아웃</button>`
      : `<a href="login.html">로그인</a><a href="login.html?mode=signup">회원가입</a>`;
    if (box) box.innerHTML = links;
    if (mBox) mBox.innerHTML = links;
    document.querySelectorAll('[data-logout]').forEach(b => b.addEventListener('click', async () => {
      await sb.auth.signOut();
      location.href = 'index.html';
    }));
  };
  draw(false);
  if (user && await checkAdmin()) draw(true);
}

// ---------- 하위 페이지 공통: 모바일 메뉴 열고 닫기 ----------
function bindSubpageMenu() {
  if (document.querySelector('.hero')) return; // 홈은 script.js 가 처리
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('menuToggle');
  if (nav && toggle) toggle.addEventListener('click', () => nav.classList.toggle('open'));
}

// ---------- 알림 토스트 ----------
let _toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

document.addEventListener('DOMContentLoaded', () => {
  renderAuthNav();
  bindSubpageMenu();
});
