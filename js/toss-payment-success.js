(function () {
  'use strict';

  const config = window.TRIPPICK_TOSS_CONFIG;
  const title = document.getElementById('resultTitle');
  const message = document.getElementById('resultMessage');
  const details = document.getElementById('resultDetails');
  const actions = document.getElementById('resultActions');
  const retryLink = document.getElementById('retryLink');

  const showError = (text) => {
    title.textContent = '결제를 완료하지 못했습니다';
    message.textContent = text;
    actions.hidden = false;
    retryLink.hidden = false;
  };

  const formatDate = (value) => {
    if (!value) return '-';
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(value));
  };

  const confirmPayment = async () => {
    const params = new URLSearchParams(window.location.search);
    const paymentKey = params.get('paymentKey') || '';
    const orderId = params.get('orderId') || '';
    const amount = Number(params.get('amount'));
    let pending;

    try { pending = JSON.parse(sessionStorage.getItem('trippickPendingPayment') || 'null'); }
    catch (_) { pending = null; }

    const isRecent = pending && Number.isFinite(pending.createdAt) && Date.now() - pending.createdAt < 30 * 60 * 1000;
    if (!paymentKey || !pending || !isRecent || pending.orderId !== orderId || pending.amount !== amount || amount !== config.amount) {
      showError('주문 정보가 일치하지 않아 결제 승인을 중단했습니다. 결제 페이지에서 다시 시도해 주세요.');
      return;
    }

    try {
      const response = await fetch(config.confirmEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentKey, orderId, amount })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || '결제 승인에 실패했습니다.');

      sessionStorage.removeItem('trippickPendingPayment');
      title.textContent = '테스트 결제가 완료되었습니다';
      message.textContent = '토스페이먼츠 테스트 환경에서 결제 승인이 정상 처리되었습니다. 실제 금액은 청구되지 않습니다.';
      details.hidden = false;
      details.innerHTML = '';

      [
        ['주문번호', result.payment.orderId],
        ['결제수단', result.payment.method || '-'],
        ['결제금액', `${Number(result.payment.totalAmount).toLocaleString('ko-KR')}원`],
        ['승인시각', formatDate(result.payment.approvedAt)]
      ].forEach(([label, value]) => {
        const row = document.createElement('div');
        const key = document.createElement('span');
        const data = document.createElement('strong');
        key.textContent = label;
        data.textContent = value;
        row.append(key, data);
        details.append(row);
      });

      actions.hidden = false;
      retryLink.hidden = true;
    } catch (error) {
      showError(error && error.message ? error.message : '결제 승인 중 오류가 발생했습니다.');
    }
  };

  confirmPayment();
})();
