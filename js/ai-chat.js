(function () {
  'use strict';

  const STORAGE_KEY = 'trippick_ai_chat_v1';
  const MAX_HISTORY = 10;

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function init() {
    const popup = document.getElementById('consultPopup');
    const thread = document.getElementById('consultChatThread');
    const status = document.getElementById('consultChatStatus');
    const form = document.getElementById('consultChatForm');
    const input = document.getElementById('consultChatInput');
    if (!popup || !thread || !status || !form || !input) return;

    const title = popup.querySelector('h2');
    const eyebrow = popup.querySelector('.eyebrow');
    if (eyebrow) eyebrow.lastChild.textContent = ' AI Camping Guide';
    if (title) title.innerHTML = '캠핑이 궁금할 땐<br>트립픽 AI에게 물어보세요';
    input.placeholder = '지역, 캠핑 유형, 준비물 등을 물어보세요';
    input.maxLength = 500;
    form.querySelector('button[type="submit"]').textContent = '질문';

    let messages = [];
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(saved)) messages = saved.slice(-MAX_HISTORY);
    } catch (_) { /* 저장 데이터가 손상되면 새 대화로 시작 */ }

    if (!messages.length) {
      messages.push({
        role: 'assistant',
        content: '안녕하세요! 저는 트립픽 AI 캠핑 도우미예요 🏕️ 지역 추천, 캠핑 유형, 준비물, 예약 전 확인사항을 물어보세요.'
      });
    }

    function save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
    }

    function render() {
      thread.innerHTML = messages.map(message => {
        const role = message.role === 'user' ? 'user' : 'host';
        return `<div class="chat-bubble chat-bubble-${role}"><p>${escapeHtml(message.content)}</p></div>`;
      }).join('');
      thread.scrollTop = thread.scrollHeight;
    }

    function setStatus(text, mode) {
      status.style.display = text ? 'flex' : 'none';
      status.className = `consult-chat-status${mode ? ` ${mode}` : ''}`;
      status.innerHTML = text ? `<span class="consult-status-dot"></span>${escapeHtml(text)}` : '';
    }

    document.addEventListener('click', event => {
      if (event.target.closest('#fabConsultBtn, #faqConsultBtn')) {
        popup.style.display = 'flex';
        requestAnimationFrame(() => popup.classList.add('open'));
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
          input.placeholder = '지역, 캠핑 유형, 준비물 등을 물어보세요';
          render();
        }, 0);
      }
    });

    document.addEventListener('submit', async event => {
      if (event.target !== form) return;
      event.preventDefault();
      event.stopImmediatePropagation();

      const content = input.value.trim();
      if (!content || form.dataset.loading === 'true') return;

      const endpoint = String(window.TRIPPICK_AI_ENDPOINT || '').trim();
      messages.push({ role: 'user', content });
      messages = messages.slice(-MAX_HISTORY);
      input.value = '';
      render();
      save();

      if (!endpoint) {
        messages.push({ role: 'assistant', content: 'AI 서버 주소가 아직 설정되지 않았어요. 관리자에게 Worker 배포 주소 설정을 요청해 주세요.' });
        render();
        save();
        return;
      }

      form.dataset.loading = 'true';
      input.disabled = true;
      form.querySelector('button[type="submit"]').disabled = true;
      setStatus('트립픽 AI가 답변을 준비하고 있어요', 'pending');

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: messages.slice(-MAX_HISTORY) })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `요청 실패 (${response.status})`);
        messages.push({ role: 'assistant', content: data.answer || '답변을 만들지 못했어요. 다시 질문해 주세요.' });
        messages = messages.slice(-MAX_HISTORY);
        save();
        render();
        setStatus('답변 완료', 'done');
      } catch (error) {
        messages.push({ role: 'assistant', content: '지금은 AI 연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.' });
        save();
        render();
        setStatus(error.message, 'error');
      } finally {
        form.dataset.loading = 'false';
        input.disabled = false;
        form.querySelector('button[type="submit"]').disabled = false;
        input.focus();
      }
    }, true);

    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
