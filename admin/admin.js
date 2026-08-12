/* ============================================================
   TRIPPICK HOST — 관리자 콘솔 공통 인터랙션
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- 모바일 사이드바 ---------- */
  const side = document.getElementById('hostSide');
  const scrim = document.getElementById('hostScrim');
  const toggleBtns = document.querySelectorAll('.host-side-toggle');

  function openSide(){ side?.classList.add('open'); scrim?.classList.add('show'); }
  function closeSide(){ side?.classList.remove('open'); scrim?.classList.remove('show'); }
  toggleBtns.forEach(b => b.addEventListener('click', openSide));
  scrim?.addEventListener('click', closeSide);

  /* ---------- 저장 / 임시저장 버튼 피드백 ---------- */
  const validatePageFields = () => {
    const fields = document.querySelectorAll('input, select, textarea');
    let hasInvalid = false;
    fields.forEach(field => {
      if (field.hasAttribute('required') && !field.value.trim()) {
        field.reportValidity?.();
        hasInvalid = true;
        return;
      }
      if (field.pattern && field.value.trim() && !new RegExp(field.pattern).test(field.value.trim())) {
        field.reportValidity?.();
        hasInvalid = true;
      }
    });
    return !hasInvalid;
  };

  document.querySelectorAll('[data-save]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!validatePageFields()) return;
      const msg = document.getElementById('saveMsg');
      const label = btn.dataset.save === 'draft' ? '임시저장되었습니다' : '캠핑장 정보가 저장되었습니다';
      if (msg){
        msg.querySelector('span').textContent = label;
        msg.classList.add('flash');
        setTimeout(() => msg.classList.remove('flash'), 1400);
      }
    });
  });

  /* ---------- 대표 사진 지정 ---------- */
  document.querySelectorAll('.host-photo-setmain').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.host-photo-main-badge').forEach(b => b.remove());
      const photo = el.closest('.host-photo');
      const badge = document.createElement('span');
      badge.className = 'host-photo-main-badge';
      badge.textContent = '대표사진';
      photo.prepend(badge);
    });
  });

  /* ---------- 사진 삭제 ---------- */
  document.querySelectorAll('.host-photo-del').forEach(el => {
    el.addEventListener('click', () => {
      el.closest('.host-photo')?.remove();
    });
  });

  /* ---------- 가격/정원 사이트 행 추가/삭제 ---------- */
  const addRowBtn = document.getElementById('addSiteRow');
  const siteRowWrap = document.getElementById('siteRowWrap');
  addRowBtn?.addEventListener('click', () => {
    const tpl = siteRowWrap.querySelector('.host-site-row');
    const clone = tpl.cloneNode(true);
    clone.querySelectorAll('input').forEach(i => i.value = '');
    siteRowWrap.insertBefore(clone, addRowBtn);
    bindRemoveRow(clone);
  });
  function bindRemoveRow(row){
    row.querySelector('.host-remove-row')?.addEventListener('click', () => {
      if (siteRowWrap.querySelectorAll('.host-site-row').length > 1) row.remove();
    });
  }
  document.querySelectorAll('.host-site-row').forEach(bindRemoveRow);

  /* ---------- 취소/환불 정책 프리셋 ---------- */
  document.querySelectorAll('.host-chip-btn').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.parentElement.querySelectorAll('.host-chip-btn').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  /* ---------- 탭바 공통 ---------- */
  document.querySelectorAll('.host-tabbar').forEach(bar => {
    bar.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        bar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.tabTarget;
        if (!target) return;
        const group = bar.dataset.tabGroup;
        document.querySelectorAll(`[data-tab-panel="${group}"]`).forEach(p => {
          p.style.display = (p.dataset.tabPanel === group && p.id === target) ? '' : 'none';
        });
        document.querySelectorAll(`.host-tab-panel[data-group="${group}"]`).forEach(p => {
          p.style.display = p.id === target ? '' : 'none';
        });
      });
    });
  });

  /* ---------- 예약/상담 상태 변경 select ---------- */
  document.querySelectorAll('.host-status-select').forEach(sel => {
    let previousValue = sel.value;
    sel.addEventListener('change', () => {
      const isCancel = sel.selectedOptions[0].textContent.trim() === '취소됨';
      if (isCancel && !window.confirm('예약 상태를 취소됨으로 변경하시겠어요? 이 변경은 되돌리기 어렵습니다.')) {
        sel.value = previousValue;
        return;
      }
      previousValue = sel.value;
      const pill = sel.closest('tr')?.querySelector('.host-pill');
      if (!pill) return;
      pill.className = 'host-pill ' + (sel.selectedOptions[0].dataset.pillClass || 'host-pill-mute');
      pill.querySelector('.pill-text').textContent = sel.selectedOptions[0].textContent;
    });
  });

  /* ---------- 상담관리: 목록 선택 → 상세 스레드 전환 ---------- */
  document.querySelectorAll('.host-consult-item').forEach(item => {
    const activateItem = () => {
      document.querySelectorAll('.host-consult-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const name = item.querySelector('strong')?.textContent || '';
      const nameEl = document.getElementById('consultGuestName');
      if (nameEl) nameEl.textContent = name;
    };

    item.addEventListener('click', activateItem);
    item.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activateItem();
      }
    });
  });

  /* ---------- 상담관리: 답변 전송 ---------- */
  document.querySelector('.reply-send-btn')?.addEventListener('click', function(){
    const form = this.closest('.host-reply-form');
    const textarea = form.querySelector('textarea');
    if (!textarea.value.trim()) {
      textarea.classList.add('is-invalid');
      textarea.setAttribute('aria-invalid', 'true');
      textarea.focus();
      return;
    }
    textarea.classList.remove('is-invalid');
    textarea.removeAttribute('aria-invalid');
    const thread = document.querySelector('.host-consult-thread');
    const msg = document.createElement('div');
    msg.className = 'host-msg from-host';
    const now = new Date();
    const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    msg.innerHTML = textarea.value.trim().replace(/</g,'&lt;') + '<time>' + time + '</time>';
    thread.appendChild(msg);
    textarea.value = '';
    thread.scrollTop = thread.scrollHeight;
  });

  /* ---------- 리뷰 답글 폼 토글 ---------- */
  document.querySelectorAll('.host-review-reply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const form = btn.closest('.host-review-card').querySelector('.host-reply-form');
      form.style.display = form.style.display === 'flex' ? 'none' : 'flex';
    });
  });
  document.querySelectorAll('.host-reply-submit').forEach(btn => {
    btn.addEventListener('click', () => {
      const form = btn.closest('.host-reply-form');
      const textarea = form.querySelector('textarea');
      if (!textarea.value.trim()) {
        textarea.classList.add('is-invalid');
        textarea.setAttribute('aria-invalid', 'true');
        textarea.focus();
        return;
      }
      textarea.classList.remove('is-invalid');
      textarea.removeAttribute('aria-invalid');
      const card = form.closest('.host-review-card');
      let reply = card.querySelector('.host-review-reply');
      if (!reply){
        reply = document.createElement('div');
        reply.className = 'host-review-reply';
        reply.innerHTML = '<span class="tag">호스트 답글</span><p></p>';
        card.insertBefore(reply, form);
      }
      reply.querySelector('p').textContent = textarea.value.trim();
      textarea.value = '';
      form.style.display = 'none';
    });
  });

});

(function loadSupabaseAdmin() {
  const current = document.currentScript;
  if (!current || !current.src) return;
  const sdk = document.createElement('script');
  sdk.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/dist/umd/supabase.min.js';
  sdk.onload = function () {
    const config = document.createElement('script');
    config.src = '../js/supabase-config.js';
    config.onload = function () {
      const admin = document.createElement('script');
      admin.src = 'admin-data.js?v=2';
      document.head.appendChild(admin);
    };
    document.head.appendChild(config);
  };
  document.head.appendChild(sdk);
})();
