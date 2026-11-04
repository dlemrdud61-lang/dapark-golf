// ===== 이벤트 설정 (여기만 수정하면 됩니다) =====
const EVENT = {
  start: new Date('2026-11-10T00:00:00+09:00'),
  end:   new Date('2026-11-30T23:59:59+09:00'),
  total: 300,
  taken: 213, // 현재까지 신청 인원 (서버 연동 전 임시값)
};

const $ = id => document.getElementById(id);

// Header / sticky CTA on scroll
const header = $('evHeader'), sticky = $('stickyCta'), applySec = $('apply');
function onScroll() {
  header.classList.toggle('scrolled', scrollY > 30);
  const r = applySec.getBoundingClientRect();
  const nearForm = r.top < innerHeight && r.bottom > 0;
  sticky.classList.toggle('show', scrollY > innerHeight * 0.6 && !nearForm);
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Countdown
const pad = n => String(n).padStart(2, '0');
function tick() {
  let diff = Math.max(0, EVENT.end - Date.now());
  const d = Math.floor(diff / 864e5); diff -= d * 864e5;
  const h = Math.floor(diff / 36e5);  diff -= h * 36e5;
  const m = Math.floor(diff / 6e4);   diff -= m * 6e4;
  const s = Math.floor(diff / 1e3);
  $('cdD').textContent = pad(d); $('cdH').textContent = pad(h);
  $('cdM').textContent = pad(m); $('cdS').textContent = pad(s);
}
tick(); setInterval(tick, 1000);

// Remaining slots
function renderSlots() {
  const left = Math.max(0, EVENT.total - EVENT.taken);
  $('slotsLeft').textContent = left;
  $('stickyLeft').textContent = left;
  requestAnimationFrame(() => { $('slotsFill').style.width = (EVENT.taken / EVENT.total * 100) + '%'; });
}
renderSlots();

// Date limits: event period, not before today
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const dateIn = $('evDate');
dateIn.min = iso(new Date(Math.max(Date.now(), EVENT.start)));
dateIn.max = iso(EVENT.end);

// Phone auto-format
const form = $('applyForm');
const f = form.elements;
f.phone.addEventListener('input', e => {
  const v = e.target.value.replace(/\D/g, '').slice(0, 11);
  e.target.value = v.length < 4 ? v : v.length < 8 ? `${v.slice(0, 3)}-${v.slice(3)}` : `${v.slice(0, 3)}-${v.slice(3, v.length - 4)}-${v.slice(-4)}`;
});

// Modal
function openModal(title, html) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = html;
  $('modal').hidden = false;
  $('modalClose').focus();
}
const closeModal = () => { $('modal').hidden = true; };
$('modalClose').addEventListener('click', closeModal);
$('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

$('privacyBtn').addEventListener('click', () => openModal('개인정보 수집·이용 동의', `
  <ul>
    <li><b>수집 항목:</b> 이름, 연락처, 희망 일시·인원</li>
    <li><b>이용 목적:</b> 무료 이벤트 예약 확정 및 안내 문자 발송</li>
    <li><b>보유 기간:</b> 이벤트 종료 후 3개월 이내 파기</li>
    <li>동의를 거부할 수 있으나, 거부 시 이벤트 참여가 제한됩니다.</li>
  </ul>`));

const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Submit
form.addEventListener('submit', e => {
  e.preventDefault();
  const err = $('formErr');
  form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));

  const name = f.name.value.trim();
  const phone = f.phone.value.trim();
  const date = f.date.value;
  let msg = '', bad = null;
  if (!name) { msg = '이름을 입력해 주세요.'; bad = f.name; }
  else if (!/^01[016789]-\d{3,4}-\d{4}$/.test(phone)) { msg = '연락처를 정확히 입력해 주세요. (예: 010-1234-5678)'; bad = f.phone; }
  else if (!date || date < dateIn.min || date > dateIn.max) { msg = '이벤트 기간 내 날짜를 선택해 주세요.'; bad = f.date; }
  else if (!f.agree.checked) { msg = '개인정보 수집·이용에 동의해 주세요.'; }
  else if (EVENT.taken >= EVENT.total) { msg = '죄송합니다. 선착순 마감되었습니다.'; }

  if (msg) {
    err.textContent = msg;
    if (bad) { bad.classList.add('invalid'); bad.focus(); }
    return;
  }
  err.textContent = '';

  const data = {
    name, phone, date,
    people: +f.people.value,
    time: f.time.value,
    lesson: f.lesson.checked,
    createdAt: new Date().toISOString(),
  };
  // TODO: 실제 운영 시 서버/구글폼/카카오 알림톡 등으로 전송
  const list = JSON.parse(localStorage.getItem('dapark_event_apply') || '[]');
  list.push(data);
  localStorage.setItem('dapark_event_apply', JSON.stringify(list));

  EVENT.taken = Math.min(EVENT.total, EVENT.taken + data.people);
  renderSlots();
  form.reset();
  f.people.value = '2';

  openModal('🎉 신청이 완료되었습니다!', `
    <p><b>${esc(name)}</b>님, 무료 라운딩 신청 감사합니다.</p>
    <ul style="margin:14px 0">
      <li>날짜: <b>${date}</b> (${data.time})</li>
      <li>인원: <b>${data.people}명</b>${data.lesson ? ' · 초보 레슨 포함' : ''}</li>
      <li>연락처: <b>${esc(phone)}</b></li>
    </ul>
    <p>1일 이내 예약 확정 문자를 보내드립니다.</p>`);
});

// Fade-up on enter
const io = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target;
    // stagger siblings in the same grid
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('fade-up'));
    el.style.transitionDelay = (Math.max(0, sibs.indexOf(el)) * 0.1) + 's';
    el.classList.add('in');
    io.unobserve(el);
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.fade-up').forEach(el => io.observe(el));
