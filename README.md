# TRIPPICK

초보 캠퍼를 위한 감성 캠핑 탐색·예약 포트폴리오입니다. 정적 HTML/CSS/JavaScript를 중심으로 만들고, 회원·커뮤니티 데이터는 Supabase, AI 상담 프록시는 Cloudflare Worker 구조로 연결했습니다.

- [고객 사이트](https://jwc95090-hash.github.io/trippick-site/)
- [호스트센터 데모](https://jwc95090-hash.github.io/trippick-site/trippick-host/admin-camp.html)
- [상담게시판](https://jwc95090-hash.github.io/trippick-site/pages/community-qna.html)
- [리뷰게시판](https://jwc95090-hash.github.io/trippick-site/pages/community-reviews.html)

> 호스트센터는 포트폴리오 검토를 위해 로그인 없이 열리는 공개 데모입니다. 일부 입력·상태 변경 인터랙션은 화면에서 체험할 수 있지만 실제 관리자 권한과 민감한 데이터는 제공하지 않으며, 비밀 상담글 본문은 숫자 비밀번호 확인 후에만 열립니다.

## 주요 기능

- 캠핑·글램핑·카라반·차박 및 테마별 캠핑장 탐색
- 한국관광공사 고캠핑 공공데이터 기반 검색·상세정보
- 예약·결제 화면과 Toss Payments 연동 구조
- Supabase 이메일/Google 로그인 및 마이페이지
- 신규 회원 첫 예약 10% 할인 쿠폰
- 공개 리뷰 열람과 로그인 회원 리뷰 작성
- 로그인 여부와 관계없는 상담글 목록·비회원 상담 작성
- 숫자 비밀번호로 보호되는 비밀 상담글
- 24시간 AI 상담 UI와 Cloudflare Worker 프록시 구조
- 로그인 없이 확인 가능한 공개 호스트센터와 고객 사이트 간 왕복 동선
- 호스트 상담·리뷰 화면의 공개 데이터 연결 및 안전한 예시 데이터 대체 표시
- 반응형 레이아웃, 모바일 하단 탭, 퀵메뉴, 팝업

## 기술 구성

- HTML5
- CSS3
- Vanilla JavaScript
- Supabase Auth / Postgres / Row Level Security
- Cloudflare Worker
- Toss Payments
- GitHub Pages

별도 프레임워크나 번들 과정 없이 정적 파일을 직접 배포합니다. 로컬에서는 정적 서버로 실행하는 편이 좋습니다.

```bash
python -m http.server 8000
```

## 폴더 구조

```text
index.html                 홈
404.html                   예외 페이지
pages/                     검색·예약·회원·마이페이지·커뮤니티 페이지
css/styles.css             고객 사이트 공통 스타일과 디자인 토큰
js/script.js               공통 UI, 검색, 팝업, 퀵메뉴, 접근성 동작
js/supabase-app.js         회원·쿠폰·리뷰·상담 데이터 연결
js/ai-chat.js              AI 상담 클라이언트
trippick-host/             공개 포트폴리오용 호스트센터
  admin-data.js            상담·리뷰 공개 데이터 연결
  admin.js                 호스트 공통 인터랙션·렌더링
worker/                    AI 상담용 Cloudflare Worker
images/, videos/           이미지·영상 에셋
sitemap.xml, robots.txt    검색엔진 노출 설정
```

루트에 남아 있는 일부 동일 이름 HTML/CSS/JS 파일은 초기 버전 호환용입니다. 현재 GitHub Pages의 주 사용 경로는 `index.html`, `pages/`, `css/`, `js/`, `trippick-host/`입니다.

## 커뮤니티 권한

| 기능 | 비로그인 | 로그인 |
|---|---:|---:|
| 공개 상담글 목록·본문 열람 | 가능 | 가능 |
| 비밀 상담글 목록 확인 | 가능 | 가능 |
| 비밀 상담글 본문 열람 | 숫자 비밀번호 필요 | 숫자 비밀번호 필요 |
| 상담글 작성 | 가능 | 가능 |
| 공개 리뷰 열람 | 가능 | 가능 |
| 리뷰 작성 | 불가 | 가능 |

비밀글 비밀번호는 원문으로 저장하지 않고 서버에서 해시를 비교합니다. Supabase의 익명 권한은 필요한 조회 및 제한된 상담 등록 함수에만 부여합니다.

## SEO

- 공개 페이지별 `title`, `meta description`, canonical URL, Open Graph 적용
- 홈에 Twitter Card, `theme-color`, WebSite/Organization JSON-LD 적용
- `sitemap.xml`과 `robots.txt` 제공
- 예약·결제·마이페이지 등 개인 흐름은 `noindex` 처리
- 데스크톱·모바일 공유 이미지 제공
- 각 페이지에 하나의 `h1`과 한국어 `lang` 설정

## 접근성

- 본문 바로가기(skip link)
- 키보드 `:focus-visible` 링
- 팝업 `role="dialog"`, `aria-modal`, ESC 닫기, 포커스 순환·복귀
- `prefers-reduced-motion` 대응
- 아이콘 버튼의 접근 가능한 이름과 44px 수준 터치 영역
- 이미지 대체텍스트와 게시판 폼의 명시적 레이블
- 현재 메뉴의 `aria-current="page"`
- 임시 링크의 비활성 상태 표시

## 버튼·인터랙션 시스템

`css/styles.css`의 공통 토큰을 사용합니다.

- Primary: `.btn`
- Secondary: `.btn-outline`, `.btn-ghost`, `.quick-book-btn`
- Icon: `.icon-btn`, `.account-btn`
- Controls: 스테퍼, 정렬, 페이지네이션, 필터 칩
- 공통 전환: `--btn-transition`
- 공통 눌림 피드백: `--btn-scale-press*`

공통 스크립트는 `type`이 빠진 버튼에 안전한 기본값을 지정하고, 팝업 및 메뉴의 키보드 상호작용을 보완합니다.

## 유틸리티 클래스

반복 스타일은 다음 유틸리티를 사용합니다.

```css
.mt-18, .mt-20, .mb-24
.text-mute, .text-brass, .text-ember
.btn-block
.skip-link, .sr-only
```

화면 고유의 복합 레이아웃은 의미 있는 컴포넌트 클래스를 사용하고, 단발성 값만 제한적으로 인라인 스타일로 유지합니다.

## 배포

`main` 브랜치 변경 사항은 GitHub Pages에 반영됩니다. 정적 자산을 변경한 경우 HTML의 버전 쿼리(`?v=`)를 함께 올려 브라우저 캐시를 갱신합니다.
