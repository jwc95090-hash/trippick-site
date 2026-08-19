# TRIPPICK HOST

TRIPPICK 고객 사이트와 연결되는 호스트센터 포트폴리오 데모입니다. 캠핑장 정보, 예약, 상담, 매출, 리뷰 운영 흐름을 한곳에서 확인할 수 있으며 별도 아이디와 비밀번호 없이 바로 둘러볼 수 있습니다.

- [호스트센터 바로가기](https://jwc95090-hash.github.io/trippick-site/trippick-host/admin-camp.html)
- [고객 사이트 바로가기](https://jwc95090-hash.github.io/trippick-site/)

> 공개 포트폴리오용 화면입니다. 운영 기능을 체험할 수 있지만 실제 관리자 권한과 민감한 데이터는 제공하지 않습니다. 비밀 상담글 본문은 숫자 비밀번호를 확인한 경우에만 열립니다.

## 주요 화면

| 페이지 | 기능 |
|---|---|
| `admin-camp.html` | 캠핑장 기본정보, 사진, 편의시설, 사이트별 가격·정원, 환불정책 |
| `admin-booking.html` | 예약 현황, 상태별 필터, 예약 상태 변경 |
| `admin-consult.html` | 고객 사이트의 공개 상담 데이터 연결, 문의 확인과 답변 UI |
| `admin-sales.html` | 매출·정산 현황과 정산 계좌 UI |
| `admin-review.html` | 리뷰 현황, 검색·필터, 호스트 답글 작성·수정 |

## 최신 데이터 연결

- 고객 상담게시판의 공개 문의를 호스트 상담 관리 화면에 표시
- 로그인·비로그인 사용자가 등록한 일반 상담글을 동일한 기준으로 조회
- 비밀글은 목록에 표시하되 본문은 숫자 비밀번호 확인 후 열람
- 공개 리뷰 데이터를 호스트 리뷰 관리 흐름과 연결
- 정적 데모 데이터가 필요할 때는 안전한 예시 데이터를 대체 표시
- 데이터 갱신 시 브라우저 캐시를 줄이기 위한 버전 쿼리 적용

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
- Supabase 공개 데이터/RPC 연결
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
├── admin-data.js            # 상담·리뷰 공개 데이터 연결
├── admin.js                 # 공통 인터랙션과 데이터 렌더링
├── admin.css                # 공통 레이아웃·컴포넌트 스타일
└── README.md
```

## 권한과 보안

호스트센터는 검토 편의를 위해 로그인 없이 열리지만, 이것이 실제 관리자 인증을 대신하지는 않습니다. 공개 화면은 읽기 중심으로 제한하며 비밀글 비밀번호 원문이나 서비스 키 같은 민감 정보는 클라이언트 코드에 포함하지 않습니다.

실서비스로 전환할 경우에는 별도 관리자 인증, 역할 기반 권한, Supabase RLS, 서버 측 비밀정보 관리가 필요합니다.
