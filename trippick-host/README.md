# TRIPPICK HOST

캠핑장 운영자(호스트)가 예약, 상담, 매출, 리뷰를 한 화면에서 관리할 수 있는 관리자 콘솔입니다.

🔗 **Live Demo**: https://jwc95090-hash.github.io/trippick-site/admin

## 주요 기능

| 페이지 | 기능 |
|---|---|
| `admin-camp.html` | 캠핑장 정보관리 - 기본정보, 사진, 편의시설, 사이트별 가격/정원, 환불정책 |
| `admin-booking.html` | 예약 관리 - 상태별 필터, 실시간 상태 변경 |
| `admin-consult.html` | 상담 관리 - 채팅형 문의 응대 |
| `admin-sales.html` | 매출 관리 - 정산 내역, 정산 계좌 관리 |
| `admin-review.html` | 리뷰 관리 - 답글 작성/수정 |

## 핵심 인터랙션

- 예약 상태를 변경하면 배지(상태 표시) 색상과 텍스트가 실시간으로 반영됩니다
- 상담 메시지 전송 시 채팅 스레드에 즉시 추가되고 자동 스크롤됩니다
- 사이트 타입별 가격/정원 정보를 동적으로 추가·삭제할 수 있습니다
- 리뷰 답글 작성/수정 폼이 토글 방식으로 열리고 닫힙니다
- 반응형 사이드바 (모바일 대응)

## 기술 스택

- HTML5 / CSS3
- JavaScript (Vanilla JS)
- 폰트: Pretendard, Noto Serif KR, Jost

## 폴더 구조

```
trippick-host/
├── index.html               # 진입 시 admin-camp.html로 리다이렉트
├── admin-camp.html          # 캠핑장 정보관리
├── admin-booking.html       # 예약 관리
├── admin-consult.html       # 상담 관리
├── admin-sales.html         # 매출 관리
├── admin-review.html        # 리뷰 관리
├── admin.css                 # 공통 스타일
└── admin.js                  # 공통 인터랙션 스크립트
```

## 관련 저장소

- 고객용 예약 사이트: [trippick-site](https://github.com/jwc95090-hash/trippick-site)

## 향후 계획

- [ ] 백엔드(DB/API) 연동
- [ ] 예약/상담/리뷰 데이터 실시간 동기화
- [ ] 정산 자동화
