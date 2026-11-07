// 로그인 / 회원가입
// Supabase 설정에서 이메일 인증을 꺼 두었기 때문에, 가입하면 바로 로그인돼요.

const params = new URLSearchParams(location.search);
let mode = params.get('mode') === 'signup' ? 'signup' : 'login';

const form = document.getElementById('authForm');
const msg = document.getElementById('msg');
const submitBtn = document.getElementById('submitBtn');
const pw = document.getElementById('password');
const pw2 = document.getElementById('password2');

function showMsg(text, type = 'error') {
  msg.className = 'msg msg-' + type;
  msg.textContent = text;
}

// 로그인 후 돌아갈 페이지 (우리 사이트 안의 페이지만 허용 → 이상한 사이트로 튕기는 것 방지)
function nextPage(isAdmin) {
  const next = params.get('next') || '';
  if (/^[a-z-]+\.html(\?[\w=&%.:-]*)?$/.test(next) && !next.startsWith('login.html')) return next;
  return isAdmin ? 'admin.html' : 'booking.html';
}

function setMode(m) {
  mode = m;
  const signup = mode === 'signup';
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  document.querySelectorAll('[data-signup]').forEach(el => { el.hidden = !signup; });
  submitBtn.textContent = signup ? '회원가입하고 시작하기' : '로그인';
  pw.autocomplete = signup ? 'new-password' : 'current-password';
  document.getElementById('modeHint').innerHTML = signup
    ? '이미 회원이신가요? 위의 <b>로그인</b> 탭을 눌러 주세요.'
    : '처음이신가요? 위의 <b>회원가입</b> 탭을 눌러 주세요.';
  showMsg('');
}
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
setMode(mode);

// 영어 오류를 쉬운 한국어로
function friendlyError(error) {
  const m = (error && error.message) || '';
  if (m.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 맞지 않아요.';
  if (m.includes('already registered')) return '이미 가입된 이메일이에요. 로그인 탭에서 로그인해 주세요.';
  if (m.includes('Password should be')) return '비밀번호는 6자 이상이어야 해요.';
  if (m.toLowerCase().includes('email') && m.toLowerCase().includes('invalid')) return '이메일 형식이 올바르지 않아요.';
  if (m.includes('rate limit')) return '잠시 후 다시 시도해 주세요. (요청이 너무 많아요)';
  return '문제가 생겼어요: ' + m;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = pw.value;
  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();

  if (!email || !password) return showMsg('이메일과 비밀번호를 입력해 주세요.');
  if (mode === 'signup') {
    if (!name) return showMsg('이름을 입력해 주세요.');
    if (password.length < 6) return showMsg('비밀번호는 6자 이상이어야 해요.');
    if (password !== pw2.value) return showMsg('비밀번호 확인이 일치하지 않아요.');
  }

  submitBtn.disabled = true;
  showMsg('');

  const { error } = mode === 'signup'
    ? await sb.auth.signUp({ email, password, options: { data: { name, phone } } })
    : await sb.auth.signInWithPassword({ email, password });

  if (error) {
    showMsg(friendlyError(error));
    submitBtn.disabled = false;
    return;
  }

  showMsg(mode === 'signup' ? '가입 완료! 이동할게요…' : '로그인 성공! 이동할게요…', 'ok');
  location.href = nextPage(await checkAdmin());
});

if ((params.get('next') || '').startsWith('admin.html')) {
  showMsg('관리자 계정으로 로그인해 주세요.', 'info');
}

// 이미 로그인한 상태로 들어오면 바로 이동
getUser().then(async user => {
  if (user) location.href = nextPage(await checkAdmin());
});
