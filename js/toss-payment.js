(function () {
  'use strict';

  const config = window.TRIPPICK_TOSS_CONFIG;
  const payButton = document.getElementById('payConfirmPage');
  const statusElement = document.getElementById('paymentStatus');

  const setStatus = (message, isError) => {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.classList.toggle('is-error', Boolean(isError));
  };

  const createOrderId = () => {
    const uniqueId = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replaceAll('-', '')
      : `${Date.now()}${Math.random().toString(36).slice(2)}`;
    return `TRIPPICK_${uniqueId.slice(0, 32)}`;
  };

  const buildRedirectUrl = (fileName) => {
    return new URL(fileName, window.location.href).href;
  };

  const initializePayment = async () => {
    if (!config || typeof window.TossPayments !== 'function' || !payButton) {
      setStatus('결제 모듈을 불러오지 못했습니다. 페이지를 새로고침해 주세요.', true);
      return;
    }

    try {
      const tossPayments = window.TossPayments(config.clientKey);
      const widgets = tossPayments.widgets({ customerKey: 'ANONYMOUS' });

      await widgets.setAmount({ currency: 'KRW', value: config.amount });
      await Promise.all([
        widgets.renderPaymentMethods({ selector: '#tossPaymentMethods', variantKey: 'DEFAULT' }),
        widgets.renderAgreement({ selector: '#tossAgreement' })
      ]);

      payButton.disabled = false;
      setStatus('결제수단을 선택하고 약관에 동의한 뒤 결제해 주세요. 테스트 결제이므로 실제 청구되지 않습니다.');

      payButton.addEventListener('click', async () => {
        const orderId = createOrderId();
        const campsiteName = document.querySelector('.book-site-card h3')?.textContent?.trim();
        const orderName = campsiteName ? `${campsiteName} 1박` : config.orderName;
        sessionStorage.setItem('trippickPendingPayment', JSON.stringify({
          orderId,
          amount: config.amount,
          createdAt: Date.now()
        }));

        payButton.disabled = true;
        setStatus('토스페이먼츠 결제창을 여는 중입니다.');

        try {
          await widgets.requestPayment({
            orderId,
            orderName,
            successUrl: buildRedirectUrl('toss-success.html'),
            failUrl: buildRedirectUrl('toss-fail.html'),
            customerName: '트립픽 고객',
            customerEmail: 'guest@trippick.co.kr'
          });
        } catch (error) {
          payButton.disabled = false;
          if (error && error.code === 'USER_CANCEL') {
            setStatus('결제를 취소했습니다. 원하실 때 다시 시도해 주세요.', true);
            return;
          }
          setStatus(error && error.message ? error.message : '결제 요청을 시작하지 못했습니다.', true);
        }
      });
    } catch (error) {
      payButton.disabled = true;
      setStatus(error && error.message ? error.message : '결제수단을 준비하지 못했습니다.', true);
    }
  };

  initializePayment();
})();
