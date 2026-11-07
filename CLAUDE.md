# 다파크골프 해운대 (dapark)

파크골프장 홈페이지 + **회원가입/로그인 · 실시간 예약 · 토스페이먼츠 테스트 결제 · 내 결제내역 · 관리자** 페이지.

## 사용자 안내 원칙
- 사이트 주인은 **코딩 입문자**. 설명·질문은 쉬운 한국어로, 전문용어는 풀어서 설명할 것.

## 기술 스택
- 화면: 순수 **HTML / CSS / JS** (빌드 도구 없음). **GitHub Pages**가 `main` 브랜치 루트를 그대로 배포.
- 회원·DB·서버함수: **Supabase** (프로젝트 ref `ldwubqhmsfxbblojutep`, goods-shop 과 **같은 프로젝트를 공유**)
  - 이 사이트의 DB 객체는 모두 `dapark_` 로 시작 → goods-shop 의 `orders`, `products` 와 섞이지 않게.
  - 관리자 판별은 goods-shop 이 만든 `admins` 테이블 + `is_admin()` 함수를 함께 사용.
  - Auth 설정: **이메일 인증 꺼짐**(`mailer_autoconfirm=true`) → 가입 즉시 로그인. (프로젝트 공용 설정)
- 결제: `js/config.js` 의 `PAYMENT_MODE` 로 선택.
  - **현재 `'instant'`** (사용자 요청): [결제하기] 누르면 결제창 없이 DB 함수 `dapark_test_pay` 가 바로 `paid` 처리 (method='테스트 결제'). 실제 돈 이동 없음.
  - `'toss'`: 토스페이먼츠 결제위젯 v2 테스트 모드. 클라이언트 키는 `js/config.js`, 시크릿 키는 Supabase secret `TOSS_SECRET_KEY` (goods-shop 과 공용).
  - 실제 운영 전에는 `'toss'` 로 바꾸고 `dapark_test_pay` 함수를 삭제해야 함 (누구나 무료로 결제완료 처리 가능하므로).

## 페이지
| 파일 | 내용 | 로그인 |
|---|---|---|
| `index.html` | 홈 (빠른 예약 폼 → booking.html 로 이동) | 불필요 |
| `event.html` | 무료 라운딩 이벤트 | 불필요 |
| `login.html` | 로그인 / 회원가입 (이름·전화는 user_metadata) | - |
| `booking.html` | 실시간 예약 + 결제 (남은 자리 15초마다 갱신) | 결제 시 필요 |
| `success.html` / `fail.html` | 결제 결과 | 필요 / - |
| `mypage.html` | 내 결제내역 | 필요 |
| `admin.html` | 전체 예약·결제 내역 (관리자) | 관리자 |

## 예약·결제 흐름
1. `dapark_slot_status(date)` — 코스·시간대별 차지된 팀 수 (누구나, 개인정보 없음)
2. `dapark_create_reservation(...)` — 자리 확인 + **금액을 DB가 계산** → `pending` 예약 생성 (15분간 자리 잡아둠)
3. 토스 결제창 → `success.html` → Edge Function `dapark-confirm-payment` 가 금액 검증 후 토스 승인 → `paid`
4. 결제창을 닫거나 실패 → `dapark_cancel_pending(order_no)` 로 `failed` 처리
- 한 코스·시간대 정원: `dapark_capacity()` = 6팀. 요금: 일반18홀 15,000 / 일반36홀 25,000 / 경로·우대18홀 10,000 (1인)
- 요금을 바꾸려면 **`js/config.js`의 PLANS 와 DB 함수 `dapark_create_reservation` 둘 다** 바꿔야 함.

## 계정
- 관리자: `admin@admin.com` / `superadmin` (goods-shop 과 같은 계정) — **테스트용 쉬운 비밀번호, 실제 운영 전 변경.**

## 테스트 결제
- 결제위젯에서 아무 카드사 선택 → 테스트 모드라 실제 돈은 나가지 않음.

## 파일 위치
- DB 구조: `supabase/migrations/001_dapark_reservations.sql`
- 서버 함수: `supabase/functions/dapark-confirm-payment/index.ts`
- 토큰·시크릿 키는 **절대 이 저장소에 넣지 말 것.**
