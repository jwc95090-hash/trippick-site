# TRIPPICK

> **초보 캠퍼가 캠핑장 탐색부터 비교·예약·준비까지 한 흐름에서 해결하도록 설계한 반응형 캠핑 플랫폼입니다.**  
> UX 기획, UI 디자인, HTML/CSS/JavaScript 구현과 외부 서비스 연결까지 직접 진행한 신입 UI/UX 디자이너 포트폴리오 프로젝트입니다.

[고객 사이트](https://jwc95090-hash.github.io/trippick-site/) · [UX 포트폴리오](https://jwc95090-hash.github.io/trippick-site/portfolio/) · [호스트센터 데모](https://jwc95090-hash.github.io/trippick-site/trippick-host/admin-camp.html) · [서비스 정책](https://jwc95090-hash.github.io/trippick-site/pages/policy.html)

<img src="./images/og-desktop.jpg" alt="TRIPPICK 고객 사이트 대표 화면" width="900">

## 프로젝트 한눈에 보기

| 구분 | 내용 |
|---|---|
| 프로젝트 | 캠핑 탐색·예약·가이드 서비스 + 호스트 운영 콘솔 |
| 대상 | 정보 탐색과 예약 과정이 낯선 초보 캠퍼 |
| 담당 | UX 구조 설계, UI 디자인, 반응형 퍼블리싱, 프론트엔드 구현 |
| 핵심 기술 | HTML5, CSS3, Vanilla JavaScript |
| 서비스 연결 | 고캠핑 공공데이터, Supabase, Toss Payments, Cloudflare Worker |
| 배포 | GitHub Pages |

## 문제와 해결 방향

캠핑 정보는 여러 채널에 흩어져 있고, 초보자는 시설·가격·준비물을 같은 기준으로 비교하기 어렵습니다. TRIPPICK은 다음 세 가지 경험을 하나의 흐름으로 연결했습니다.

1. **탐색 부담 줄이기** — 지역·유형·시설 필터, 지도, 상세정보와 최대 3곳 비교
2. **예약 불안 줄이기** — 예약·결제 흐름, 정책과 데이터 출처, 오류·빈 상태 안내
3. **첫 캠핑 준비 돕기** — 1분 취향 추천, 준비도 체크리스트, 자체 제작 가이드 영상

## 주요 기능

- 캠핑·글램핑·카라반·차박 및 테마별 캠핑장 탐색
- 고캠핑 공공데이터 기반 검색·필터·지도·상세정보
- 최대 3곳 비교, 예약·결제 화면과 Toss Payments 테스트 연동
- Supabase 이메일/Google 로그인, 쿠폰, 리뷰, 상담, 마이페이지
- 비회원 상담과 숫자 비밀번호로 보호되는 비밀 상담글
- 캐릭터 중심의 자체 제작 H.264 MP4 캠핑 가이드 6편
- 24시간 AI 상담 UI와 Cloudflare Worker 프록시
- 예약·상담·매출·리뷰를 확인하는 공개 호스트센터 데모

> 호스트센터는 채용 검토용 공개 데모입니다. 실제 관리자 권한이나 민감한 데이터는 제공하지 않으며, 실서비스 전환 시 별도의 관리자 인증과 역할 기반 권한이 필요합니다.

## 디자인 의사결정

### 같은 기준으로 비교할 수 있게

캠핑장 카드와 상세 화면에서 가격·시설·위치·후기 정보를 같은 순서로 배치했습니다. 사용자가 기억에 의존하지 않고 최대 3곳을 직접 비교하도록 설계했습니다.

### 초보자에게 다음 행동을 명확하게

검색, 비교, 예약, 준비 단계마다 핵심 CTA를 하나씩 강조했습니다. 모바일에서는 하단 탭과 퀵메뉴를 사용해 엄지손가락 접근 범위 안에서 주요 기능을 찾도록 구성했습니다.

### 감성과 정보 신뢰를 함께

숲과 캠핑의 감성을 살린 이미지·컬러에 공공데이터 출처, 실시간 재고 여부, AI의 역할과 한계를 명확히 표시했습니다. 캐릭터는 장식보다 준비·안전 정보를 쉽게 전달하는 가이드 역할로 사용했습니다.

## 반응형·접근성 구현

- 360px 모바일부터 1920px 와이드 화면까지 유동형 타이포와 카드 밀도 적용
- 시맨틱 HTML, 본문 바로가기, 명시적 폼 레이블과 이미지 대체텍스트
- 키보드 `:focus-visible`, ESC 닫기, 모달 포커스 순환·복귀
- `prefers-reduced-motion` 대응과 44px 수준의 터치 영역
- 페이지별 title, description, canonical, Open Graph, sitemap, robots 설정

접근성은 WCAG 2.1 AA 주요 기준 적용을 목표로 했으며, 공식 준수 인증을 의미하지 않습니다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| UI 구현 | HTML5, CSS3, Vanilla JavaScript, jQuery |
| 데이터 | Supabase Auth, Postgres, RLS, RPC |
| 외부 연동 | 고캠핑 공공데이터, Toss Payments |
| AI 프록시 | Cloudflare Worker |
| 콘텐츠 제작 | Python, Pillow, FFmpeg |
| 배포 | GitHub Pages |

프레임워크와 번들러 없이 정적 파일을 직접 구성해 HTML 구조, CSS 반응형 설계, JavaScript 인터랙션 역량이 드러나도록 구현했습니다.

## 폴더 구조

```text
trippick-site/
├── index.html                 # 고객 사이트 홈
├── pages/                     # 검색·상세·예약·회원·커뮤니티·정책
├── css/styles.css             # 디자인 토큰과 공통 반응형 스타일
├── js/
│   ├── script.js              # 공통 UI와 탐색 인터랙션
│   ├── supabase-app.js        # 인증·쿠폰·리뷰·상담 연결
│   ├── ai-chat.js             # AI 상담 클라이언트
│   └── toss-payment.js        # 결제 흐름
├── trippick-host/             # 공개 호스트센터 데모
├── assets/, images/, videos/  # 브랜드·이미지·영상 에셋
├── design-system/             # 디자인 시스템 문서
├── docs/                      # UX 실행 기준
├── worker/                    # Cloudflare Worker
└── tools/                     # 영상 제작 보조 스크립트
```

### 저장소 정리 기준

- 실제 사용되는 히어로 영상은 `videos/hero-video.mp4`로 통일하고 루트 중복 파일을 제거했습니다.
- 어떤 페이지에서도 불러오지 않던 jQuery 사본 3개를 제거했습니다.
- 개인 편집기 설정인 `.vscode/`를 제거하고 `.gitignore`에 추가했습니다.
- 현재 실제 사용 경로는 `index.html`, `pages/`, `css/`, `js/`, `trippick-host/`입니다.
- 루트의 일부 HTML/CSS/JS와 `admin/`은 기존 공개 URL 호환을 위해 유지합니다.

## 트러블슈팅과 배운 점

| 문제 | 해결 | 배운 점 |
|---|---|---|
| 화면마다 카드와 버튼 스타일이 달라짐 | CSS 변수와 공통 버튼·카드 클래스로 통합 | 디자인 토큰이 구현 속도와 일관성을 함께 높임 |
| 모바일에서 퀵메뉴가 콘텐츠를 가림 | 세로 메뉴를 하단 가로 도크로 전환 | 반응형은 축소가 아니라 사용 맥락 재설계가 필요함 |
| 외부 데이터의 재고·요금 한계 | 데이터 출처와 실시간 여부를 정책 페이지에 명시 | 기능 구현만큼 정보의 신뢰 범위를 설명하는 UX가 중요함 |
| API 키 노출 위험 | 공개 키와 비밀 키를 분리하고 비밀 값은 Worker Secret으로 관리 | 클라이언트와 서버의 책임 경계를 이해함 |
| 자동재생 영상의 접근성 | 가이드 영상을 무음 처리하고 포스터·대체 설명 제공 | 콘텐츠 연출도 사용자의 제어권을 우선해야 함 |

## 한계와 다음 단계

- 공공데이터에는 실시간 잔여 객실과 최종 요금이 포함되지 않을 수 있습니다.
- 결제와 AI 상담은 포트폴리오용 테스트 흐름이며 운영 서비스가 아닙니다.
- 대용량 영상·이미지 최적화와 중복 파일 정리는 다음 개선 과제입니다.
- 실제 운영 시 관리자 인증, 서버 검증, 모니터링과 보안 정책이 추가로 필요합니다.

## 로컬 실행과 배포

```bash
python -m http.server 8000
```

브라우저에서 `http://localhost:8000`을 엽니다. `main` 브랜치가 GitHub Pages의 루트로 설정되어 있어 병합 후 자동으로 공개 사이트에 반영됩니다.

## 관련 문서

- [고객 사이트 UX 실행 기준](docs/UX_EXECUTION_PLAN.md)
- [서비스 정책·데이터 안내](pages/policy.html)
- [호스트센터 상세 안내](trippick-host/README.md)
- [디자인 시스템](design-system/trippick/MASTER.md)
