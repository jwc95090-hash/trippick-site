# TRIPPICK

초보 캠퍼를 위한 감성 캠핑 예약 서비스 프론트엔드. 프레임워크 없이 순수 HTML/CSS/JS로 만든 정적 사이트다.

- **라이브**: https://jwc95090-hash.github.io/trippick-site/
- **정보 구조도**: [information-architecture.md](information-architecture.md) — 전체 페이지 구성과 흐름 정리

## 스택

Vanilla HTML / CSS / JS. 별도 빌드 도구 없이 정적 파일을 그대로 서빙한다. 로컬에서 볼 때는 `index.html`을 브라우저로 열거나, 간단한 정적 서버(`npx serve`, `python -m http.server` 등)로 띄우면 된다.

## 폴더 구조

```
index.html              홈
404.html                예외 페이지
pages/                  하위 페이지 23개 (검색·카테고리, 상세·예약·결제, 회원, 커뮤니티·가이드)
css/styles.css          전체 스타일
js/script.js            전체 스크립트 (헤더, 필터, 팝업, 게시판 등)
images/                 이미지 에셋 (OG 이미지 포함)
videos/                 히어로 배경 영상
sitemap.xml, robots.txt 검색엔진 노출 설정
```

## 페이지 구성

홈 → 검색·카테고리(캠핑/글램핑/카라반/차박/마운틴/바다/반려동물/신규오픈) → 상세·예약·결제 → 회원(로그인/가입 + 마이페이지 4종) → 커뮤니티·가이드 순으로 이어진다. 자세한 설명과 페이지별 역할은 [information-architecture.md](information-architecture.md)에 줄글로 정리되어 있다.

## SEO

- 페이지별 `<title>`, `meta description`, `canonical`, Open Graph(og:title/description/image — 데스크탑 1200×630 / 모바일 1080×1080 두 버전) 적용.
- `sitemap.xml`에는 색인이 필요한 17개 공개 URL만 등록.
- `booking.html`, `payment.html`, `mypage*.html` 5종은 로그인 후 개인 진행 단계/개인정보 화면이라 `<meta name="robots" content="noindex">`를 적용하고 sitemap에서 제외. `robots.txt`는 크롤링 자체는 전체 허용(noindex 태그를 크롤러가 읽고 스스로 제외하도록 함).

## 접근성 (WCAG 2.1 AA 기준)

- **텍스트 명도 대비**: hover 상태 등에서 대비가 낮았던 브라스골드 텍스트 색상을 `--forest`로 교체해 4.5:1 이상 확보(브라스 톤은 테두리·배경 악센트로만 유지).
- **터치 타겟**: 아이콘 버튼류를 44×44px 이상으로 확보.
- **대체 텍스트**: 이미지 `alt` 속성 보강.
- **키보드 포커스**: 인터랙티브 요소에 `:focus-visible` 아웃라인을 명시적으로 지정, `outline:none`만 걸려 있던 폼 필드에도 시각적 포커스 표시 복구.

## 버튼/인터랙션 시스템

`css/styles.css` 상단 `:root`에 버튼 공통 토큰(`--btn-transition`, `--btn-scale-press`, `--btn-scale-press-sm`, `--btn-scale-press-xs` 등)을 정의하고, Primary(`.btn`)/Secondary(`.btn-outline`, `.btn-ghost`, `.quick-book-btn`, `.auth-mini-btn`, `.login-outline`)/Tertiary(`.icon-btn`)/유틸리티 컨트롤(`.qb-stepper button`, `.board-sort button`, `.board-pagination button`)이 같은 트랜지션 속도와 클릭 피드백(scale)을 공유하도록 통일했다. hover 반응색은 `--brass-light`(배경형)·브라스 악센트(테두리형)로 정리했고, 클래스명은 기존 HTML을 그대로 유지했다.

## 유틸리티 클래스

반복되는 인라인 `style=`을 CSS 클래스로 정리했다 (`css/styles.css` 맨 끝 섹션).

```css
.mt-18, .mt-20, .mb-24      /* 여백 */
.text-mute, .text-brass, .text-ember  /* 텍스트 색상 */
.btn-block                  /* width:100%; justify-content:center; */
```

값이 다른 인라인 스타일이나 1~2회만 쓰인 값은 그대로 인라인으로 남겨뒀다 — 화면 결과는 정리 전후로 동일하다.
