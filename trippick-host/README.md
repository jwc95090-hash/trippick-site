# TRIPPICK HOST

TRIPPICK 고객 사이트와 연결되는 호스트센터 포트폴리오 데모입니다. 캠핑장 정보, 예약, 상담, 매출, 리뷰 운영 흐름을 한곳에서 확인할 수 있으며 별도 아이디와 비밀번호 없이 바로 둘러볼 수 있습니다.

- [호스트센터 바로가기](https://jwc95090-hash.github.io/trippick-site/trippick-host/admin-camp.html)
- [고객 사이트 바로가기](https://jwc95090-hash.github.io/trippick-site/)

> 공개 포트폴리오용 정적 화면입니다. 모든 회원·예약·상담·매출·리뷰는 예시이며 Supabase나 실제 운영 데이터와 연결되지 않습니다.

## 주요 화면

| 페이지 | 기능 |
|---|---|
| `admin-camp.html` | 캠핑장 기본정보, 사진, 편의시설, 사이트별 가격·정원, 환불정책 |
| `admin-booking.html` | 예약 현황, 상태별 필터, 예약 상태 변경 |
| `admin-consult.html` | 예시 문의 확인과 답변 UI |
| `admin-sales.html` | 매출·정산 현황과 정산 계좌 UI |
| `admin-review.html` | 리뷰 현황, 검색·필터, 호스트 답글 작성·수정 |
| `admin-members.html` | 예시 회원의 마스킹 아이디·이메일, 가입 방법·가입일 표시 |

## 데모 데이터 원칙

- 실제 고객 사이트 데이터와 호스트센터 공개 데모를 완전히 분리
- 예시 데이터만 HTML에 포함해 개인정보 노출 가능성 제거
- 저장·답변·상태 변경은 화면 시연용이며 새로고침하면 초기 상태로 복원
- 검색엔진에 관리 화면이 수집되지 않도록 `noindex` 적용

## 핵심 인터랙션

- 예약 상태 변경 시 배지 색상과 텍스트 즉시 반영
- 상담 항목 선택과 답변 입력 UI
- 사이트 타입별 가격·정원 정보 추가·삭제
- 리뷰 답글 작성·수정 폼 토글
- 모바일 사이드바와 반응형 레이아웃
- 키보드로 조작 가능한 주요 버튼과 상담 항목

## 기술 구성

- HTML5 / CSS3
- Vanilla JavaScript
- GitHub Pages
- Pretendard / Noto Serif KR / Jost

## 폴더 구조

```text
trippick-host/
├── index.html               # admin-camp.html 진입 연결
├── admin-camp.html          # 캠핑장 정보 관리
├── admin-booking.html       # 예약 관리
├── admin-consult.html       # 상담 관리
├── admin-sales.html         # 매출 관리
├── admin-review.html        # 리뷰 관리
├── admin-members.html       # 개인정보 보호형 회원 관리
├── admin.js                 # 공통 정적 데모 인터랙션
├── admin.css                # 공통 레이아웃·컴포넌트 스타일
└── README.md
```

## 권한과 보안

호스트센터는 검토 편의를 위해 로그인 없이 열리며 실제 관리자 앱이 아닙니다. 공개 화면은 실제 데이터베이스를 호출하지 않고 서비스 키나 고객 데이터를 포함하지 않습니다.

실서비스로 전환할 경우에는 별도 관리자 인증, 역할 기반 권한, Supabase RLS, 서버 측 비밀정보 관리가 필요합니다.
