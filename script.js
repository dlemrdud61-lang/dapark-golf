// Header scroll state + floating booking button
const header = document.getElementById('header');
const floatBtn = document.querySelector('.float-book');
const onScroll = () => {
  const y = window.scrollY;
  header.classList.toggle('scrolled', y > 40);
  floatBtn.classList.toggle('show', y > 700);
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Mobile menu
const nav = document.getElementById('nav');
document.getElementById('menuToggle').addEventListener('click', () => nav.classList.toggle('open'));
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

// Toast
const toastEl = document.getElementById('toast');
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3000);
}

// Booking form
const bDate = document.getElementById('bDate');
const today = new Date();
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
bDate.min = iso(today);
bDate.max = iso(new Date(today.getTime() + 30 * 864e5));
bDate.value = iso(today);

const people = document.getElementById('bPeople');
document.querySelectorAll('[data-step]').forEach(btn =>
  btn.addEventListener('click', () => {
    const v = Math.min(4, Math.max(1, +people.value + +btn.dataset.step));
    people.value = v;
  })
);

document.getElementById('bookingForm').addEventListener('submit', e => {
  e.preventDefault();
  const time = document.getElementById('bTime').value;
  const course = document.getElementById('bCourse').value;
  toast(`${bDate.value} ${time.split(' (')[0]} · ${course} · ${people.value}명 — 예약 가능합니다!`);
});

// Course data
const courses = [
  { name: 'A 오션 코스', level: '★★☆', len: '480m', color: ['#a9d8ea', '#3a9b5c'],
    desc: '기장 바다를 정면으로 바라보며 라운딩하는 시그니처 코스. 바닷바람을 읽는 재미가 있습니다.',
    holes: [3,4,3,5,4,3,4,4,3] },
  { name: 'B 포레스트 코스', level: '★★★', len: '520m', color: ['#cfe8c4', '#1f6b3a'],
    desc: '울창한 소나무 숲길을 따라 이어지는 코스. 그늘이 많아 여름철에도 시원합니다.',
    holes: [4,3,5,4,3,4,3,4,3] },
  { name: 'C 가든 코스', level: '★☆☆', len: '430m', color: ['#fde8c8', '#5aa86a'],
    desc: '계절 꽃이 가득한 정원형 코스. 평탄한 지형으로 입문자와 가족 단위 고객에게 추천합니다.',
    holes: [3,3,4,3,4,4,3,5,4] },
  { name: 'D 레이크 코스', level: '★★★', len: '505m', color: ['#bfe3f2', '#2e8b57'],
    desc: '연못과 수변 해저드가 어우러진 전략형 코스. 정확한 샷이 필요한 상급자 코스입니다.',
    holes: [4,4,3,3,5,4,3,3,4] },
];

function courseSVG(c, seed) {
  // simple stylised course map: fairway path with 9 numbered holes
  const pts = [];
  for (let i = 0; i < 9; i++) {
    const x = 60 + (i % 3) * 140 + ((Math.floor(i / 3) % 2) ? 40 : 0) + ((seed * 17 + i * 23) % 30);
    const y = 60 + Math.floor(i / 3) * 110 + ((seed * 11 + i * 31) % 40);
    pts.push([x, y]);
  }
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p.join(' ')).join(' ');
  const water = seed === 0 ? '<path d="M0 330 Q120 300 240 330 T520 320 V400 H0Z" fill="#6fb8d9" opacity=".7"/>'
    : seed === 3 ? '<ellipse cx="260" cy="200" rx="70" ry="40" fill="#6fb8d9" opacity=".75"/>' : '';
  const trees = Array.from({ length: 14 }, (_, i) => {
    const x = (i * 97 + seed * 41) % 500 + 10, y = (i * 61 + seed * 29) % 360 + 20;
    return `<circle cx="${x}" cy="${y}" r="${seed === 1 ? 14 : 9}" fill="#1f6b3a" opacity="${seed === 1 ? .55 : .3}"/>`;
  }).join('');
  const holes = pts.map((p, i) =>
    `<g><circle cx="${p[0]}" cy="${p[1]}" r="15" fill="#fff"/><text x="${p[0]}" y="${p[1] + 5}" text-anchor="middle" font-size="13" font-weight="700" fill="#14532d">${i + 1}</text></g>`
  ).join('');
  return `<svg viewBox="0 0 520 400" preserveAspectRatio="xMidYMid slice">${water}${trees}
    <path d="${path}" fill="none" stroke="#9fdc8a" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>
    <path d="${path}" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="6 8"/>${holes}</svg>`;
}

const map = document.getElementById('courseMap');
function showCourse(i) {
  const c = courses[i];
  document.getElementById('cTitle').textContent = c.name;
  document.getElementById('cDesc').textContent = c.desc;
  document.getElementById('cLen').textContent = c.len;
  document.getElementById('cLevel').textContent = c.level;
  document.getElementById('cHoles').innerHTML = c.holes.map((p, n) => `<span>${n + 1}H<b>P${p}</b></span>`).join('');
  map.style.background = `linear-gradient(160deg, ${c.color[0]}, ${c.color[1]})`;
  map.innerHTML = courseSVG(c, i);
}
document.querySelectorAll('[data-course]').forEach(btn =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-course]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    showCourse(+btn.dataset.course);
  })
);
showCourse(0);

// Community board
const boards = {
  notice: [
    ['공지', '11월 동절기 운영시간 변경 안내 (06:30 ~ 20:00)', '2026.11.01', true],
    ['공지', 'B 포레스트 코스 잔디 보수 작업 안내', '2026.10.27'],
    ['공지', '셔틀버스 시간표 개편 안내', '2026.10.15'],
    ['공지', '모바일 예약 시스템 리뉴얼 오픈', '2026.10.02'],
    ['공지', '추석 연휴 정상 운영 안내', '2026.09.20'],
  ],
  event: [
    ['이벤트', '그랜드 오픈 기념 무료 라운딩 이벤트 (선착순 300명)', '2026.11.03', true, 'event.html'],
    ['이벤트', '가족 라운딩 인증샷 이벤트 — 상품권 증정', '2026.10.20'],
    ['이벤트', '제1회 다파크배 파크골프 대회 참가자 모집', '2026.10.10', true],
    ['이벤트', '친구 추천하면 둘 다 1회 무료!', '2026.09.28'],
    ['이벤트', '야간 라운딩 오픈 기념 음료 증정', '2026.09.15'],
  ],
  join: [
    ['조인', '11/8(토) 오전 9시 A코스 2명 구합니다', '2026.11.04', true],
    ['조인', '평일 오전 정기 모임 함께 하실 분', '2026.11.03'],
    ['조인', '초보 환영! 주말 오후 C코스 라운딩', '2026.11.02'],
    ['조인', '11/10(월) 야간 D코스 1명 모집', '2026.11.01'],
    ['조인', '기장 파크골프 동호회 신규 회원 모집', '2026.10.30'],
  ],
};
const boardEl = document.getElementById('board');
function renderBoard(key) {
  boardEl.innerHTML = boards[key].map(([badge, title, date, hot, href]) =>
    `<li><a href="${href || "#"}"><span class="badge${hot ? ' hot' : ''}">${hot ? 'HOT' : badge}</span><span class="title">${title}</span><time>${date}</time></a></li>`
  ).join('');
}
document.querySelectorAll('[data-board]').forEach(btn =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-board]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderBoard(btn.dataset.board);
  })
);
renderBoard('notice');

// Count-up stats
const counters = document.querySelectorAll('[data-count]');
const countObs = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target, target = +el.dataset.count, start = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - start) / 1400);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    countObs.unobserve(el);
  });
});
counters.forEach(c => countObs.observe(c));

// Scroll reveal
const revealEls = document.querySelectorAll('.section-head, .about-visual, .about-text, .course-panel, .price-card, .rules, .fac, .member-inner, .community-grid, .loc-grid');
revealEls.forEach(el => el.classList.add('reveal'));
const revObs = new IntersectionObserver(entries => {
  entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); revObs.unobserve(en.target); } });
}, { threshold: .15 });
revealEls.forEach(el => revObs.observe(el));
