# TRIPPICK Worker

AI 상담, Toss 결제 승인, 고캠핑 공공데이터 프록시를 담당합니다. 비밀 키는 소스나 `wrangler.toml`에 쓰지 않고 Worker Secret으로만 설정합니다.

필수 Secret은 `GROQ_API_KEY`, `TOSS_SECRET_KEY`, `GOCAMPING_SERVICE_KEY`입니다. 로컬 개발에서는 `.dev.vars.example`을 `.dev.vars`로 복사해 사용하며 `.dev.vars`는 커밋하지 않습니다.

결제 승인 예시는 고정 금액의 포트폴리오 흐름입니다. 실제 서비스에서는 서버에 저장된 주문과 금액을 조회하고, 승인 결과와 재시도 상태를 영속 저장한 뒤 결제를 승인해야 합니다.
