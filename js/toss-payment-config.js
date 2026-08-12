// 클라이언트 키는 브라우저에서 사용하는 공개 식별자입니다.
// 실제 결제용 시크릿 키는 Cloudflare Worker의 Secret으로만 관리합니다.
window.TRIPPICK_TOSS_CONFIG = Object.freeze({
  clientKey: 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm',
  confirmEndpoint: 'https://trippick-ai.trippick-jhan.workers.dev/payments/confirm',
  amount: 71200,
  orderName: '태안 선셋 캠프사이트 1박'
});
