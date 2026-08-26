# TRIPPICK Worker

AI 상담, Toss 결제 승인, 고캠핑 공공데이터 프록시를 담당합니다. 비밀 키는 소스나 `wrangler.toml`에 쓰지 않고 Worker Secret으로만 설정합니다.

필수 Secret은 `GROQ_API_KEY`, `TOSS_SECRET_KEY`, `GOCAMPING_SERVICE_KEY`입니다. 로컬 개발에서는 `.dev.vars.example`을 `.dev.vars`로 복사해 사용하며 `.dev.vars`는 커밋하지 않습니다.

## AI 상담 복구

Groq Console에서 새 API 키를 만든 뒤 Worker 디렉터리에서 아래 명령을 실행합니다. 프롬프트가 표시되면 새 키만 붙여 넣습니다. 키는 저장소와 브라우저에 노출되지 않습니다.

```bash
npx wrangler secret put GROQ_API_KEY
npx wrangler deploy
```

배포 후 고객 사이트에서 AI 상담을 한 번 보내 확인합니다. `Groq API 키가 유효하지 않거나 권한이 없습니다`라는 응답이 나오면 Secret이 교체되지 않았거나 다른 Worker에 배포된 것입니다.

## Google 지도 설정

Google Cloud에서 결제 계정이 연결된 프로젝트에 **Maps JavaScript API**를 활성화한 뒤 브라우저 키를 만듭니다. 키의 애플리케이션 제한은 HTTP referrer로 설정하고 다음을 허용합니다.

```text
https://jwc95090-hash.github.io/trippick-site/*
http://localhost:*
http://127.0.0.1:*
```

`js/maps-config.js`의 빈 값에 키를 넣고 배포합니다. GitHub Pages에서 사용할 키는 브라우저에 공개되는 키이므로, 반드시 referrer 및 API 제한을 적용해야 합니다. 서버용 비밀 키는 이 파일에 넣으면 안 됩니다.

결제 승인 예시는 고정 금액의 포트폴리오 흐름입니다. 실제 서비스에서는 서버에 저장된 주문과 금액을 조회하고, 승인 결과와 재시도 상태를 영속 저장한 뒤 결제를 승인해야 합니다.
