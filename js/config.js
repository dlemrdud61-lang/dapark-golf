// 공개돼도 괜찮은 값만 여기에 둡니다.
// (service_role 키, 토스 "시크릿" 키는 절대 여기에 넣지 마세요! → Supabase secret 에만 보관)
const SUPABASE_URL = 'https://ldwubqhmsfxbblojutep.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxkd3VicWhtc2Z4YmJsb2p1dGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNTA3NzcsImV4cCI6MjEwOTYyNjc3N30.O58HZgDclMGEAFzzdsOTkHCvD0FuxKqlVIBj9CESuK8';

// 토스페이먼츠 결제위젯 "테스트" 클라이언트 키 (토스 공식 문서용 공개 테스트 키)
// 테스트 모드라 실제 돈은 나가지 않습니다.
// 본인 토스 계정 키로 바꾸려면 이 값과 Supabase secret TOSS_SECRET_KEY 를 함께 바꾸세요.
const TOSS_CLIENT_KEY = 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm';

// 예약 기본 정보 (가격은 DB 함수 dapark_create_reservation 에서도 똑같이 계산 → 화면 조작해도 소용없음)
const SLOTS = [
  { id: '06:00', label: '06:00 ~ 09:00', tag: '조조' },
  { id: '09:00', label: '09:00 ~ 12:00', tag: '오전' },
  { id: '12:00', label: '12:00 ~ 15:00', tag: '오후' },
  { id: '15:00', label: '15:00 ~ 18:00', tag: '오후' },
  { id: '18:00', label: '18:00 ~ 21:00', tag: '야간' },
];
const COURSES = [
  { id: 'A', name: '오션' },
  { id: 'B', name: '포레스트' },
  { id: 'C', name: '가든' },
  { id: 'D', name: '레이크' },
];
const PLANS = [
  { id: 'normal18', name: '일반 18홀', price: 15000, desc: '주중·주말 동일' },
  { id: 'normal36', name: '일반 36홀', price: 25000, desc: '4개 코스 중 2개' },
  { id: 'senior18', name: '경로·우대 18홀', price: 10000, desc: '만 65세↑·장애인·유공자 (현장 확인)' },
];
