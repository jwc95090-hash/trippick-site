(function () {
  'use strict';
  if (!window.supabase || !window.TRIPPICK_SUPABASE) return;

  const cfg = window.TRIPPICK_SUPABASE;
  const db = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.trippickSupabase = db;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  function message(form, text, error) {
    let el = form.querySelector('.supabase-form-message');
    if (!el) {
      el = document.createElement('p');
      el.className = 'supabase-form-message';
      el.style.cssText = 'margin-top:12px;font-size:13px;line-height:1.6;';
      form.appendChild(el);
    }
    el.style.color = error ? 'var(--secondary, #9C4A30)' : 'var(--brand, #173D2B)';
    el.textContent = text;
  }

  async function currentUser() {
    const { data } = await db.auth.getUser();
    return data.user || null;
  }

  async function updateAuthLinks() {
    const user = await currentUser();
    if (!user) return;
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || '회원';
    document.querySelectorAll('a[href$="login.html"]').forEach(link => {
      if (link.closest('.auth-card')) return;
      link.textContent = name;
      link.href = link.href.replace(/login\.html.*$/, 'mypage.html');
    });
    document.querySelectorAll('a[href$="signup.html"]').forEach(link => {
      if (link.closest('.auth-card')) return;
      link.textContent = '로그아웃';
      link.href = '#logout';
      link.addEventListener('click', async event => {
        event.preventDefault();
        await db.auth.signOut();
        location.href = location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
      }, { once: true });
    });
  }

  function setupLogin() {
    if (!/\/login\.html$/.test(location.pathname)) return;
    const card = document.querySelector('.auth-card');
    const form = card?.querySelector('.auth-form');
    if (!card || !form) return;

    const google = card.querySelector('.login-kakao');
    const apple = card.querySelector('.login-apple');
    if (google) {
      google.className = 'login-btn login-google';
      google.innerHTML = '<span class="login-btn-icon" style="background:#fff;color:#4285f4;font-weight:800;">G</span>Google 계정으로 계속하기';
      google.addEventListener('click', async () => {
        const { error } = await db.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: 'https://jwc95090-hash.github.io/trippick-site/pages/mypage.html' }
        });
        if (error) message(form, error.message, true);
      });
    }
    if (apple) apple.style.display = 'none';
    const sub = card.querySelector('.login-sub');
    if (sub) sub.textContent = 'Google 계정 또는 이메일로 로그인하세요';

    form.addEventListener('submit', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const email = form.querySelector('input[type="email"]')?.value.trim();
      const password = form.querySelector('input[type="password"]')?.value;
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) return message(form, error.message, true);
      location.href = 'mypage.html';
    }, true);
  }

  function setupSignup() {
    if (!/\/signup\.html$/.test(location.pathname)) return;
    const form = document.querySelector('.auth-card .auth-form');
    if (!form) return;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const passwords = form.querySelectorAll('input[type="password"]');
      const email = form.querySelector('input[type="email"]')?.value.trim();
      if (passwords[0]?.value !== passwords[1]?.value) return message(form, '비밀번호가 일치하지 않습니다.', true);
      const { data, error } = await db.auth.signUp({
        email,
        password: passwords[0]?.value,
        options: {
          emailRedirectTo: 'https://jwc95090-hash.github.io/trippick-site/pages/login.html',
          data: {
            full_name: email.split('@')[0],
            welcome_coupon_code: 'TRIPPICK10',
            welcome_coupon_discount: 10,
            welcome_coupon_issued_at: new Date().toISOString()
          }
        }
      });
      if (error) return message(form, error.message, true);
      try {
        localStorage.setItem('trippick_welcome_coupon_v1', JSON.stringify({
          code: 'TRIPPICK10', discount: 10, issuedAt: new Date().toISOString(), used: false
        }));
      } catch (e) { /* 저장 실패는 회원가입을 막지 않음 */ }
      if (data.session) location.href = 'mypage.html';
      else message(form, '가입 확인 메일을 보냈습니다. 인증을 마치면 마이페이지에 첫 예약 10% 할인 쿠폰이 자동으로 담겨요.', false);
    }, true);
  }

  async function setupMypageCoupon() {
    if (!/\/mypage\.html$/.test(location.pathname)) return;
    const user = await currentUser();
    if (!user) return;
    const content = document.querySelector('.mypage-content');
    const menuGrid = content?.querySelector('.mypage-menu-grid');
    if (!content || !menuGrid || document.getElementById('welcomeCouponCard')) return;

    let coupon = null;
    try { coupon = JSON.parse(localStorage.getItem('trippick_welcome_coupon_v1')); } catch (e) { /* 무시 */ }
    const metadata = user.user_metadata || {};
    const discount = Number(coupon?.discount || metadata.welcome_coupon_discount || 10);
    const code = coupon?.code || metadata.welcome_coupon_code || 'TRIPPICK10';

    menuGrid.insertAdjacentHTML('beforebegin', `
      <section id="welcomeCouponCard" aria-label="내 쿠폰" style="margin-bottom:28px;padding:24px;border:1px solid var(--line);background:var(--ivory);display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;">
        <div>
          <span class="eyebrow"><i></i>Welcome Coupon</span>
          <h3 style="font-family:var(--serif);font-size:22px;margin:7px 0;">첫 예약 ${discount}% 할인 쿠폰</h3>
          <p style="font-size:13px;color:var(--text-mute);">회원가입 축하 쿠폰이 자동으로 발급되었습니다. 첫 예약 결제 시 사용할 수 있어요.</p>
        </div>
        <div style="min-width:150px;padding:18px 22px;background:var(--brand);color:#fff;text-align:center;border-radius:4px;">
          <strong style="display:block;font-size:30px;line-height:1;">${discount}%</strong>
          <span style="display:block;margin-top:8px;font-size:11px;letter-spacing:.08em;">${esc(code)}</span>
        </div>
      </section>`);
  }

  async function setupReviewForm() {
    const form = document.getElementById('reviewForm');
    if (!form) return;
    const siteSelect = document.getElementById('reviewSite');
    const completedStays = window.trippick?.TRIPPICK_COMPLETED_STAYS || [];
    completedStays.forEach(stay => {
      if (!siteSelect || siteSelect.querySelector(`option[value="${CSS.escape(stay.siteId)}"]`)) return;
      const option = document.createElement('option');
      option.value = stay.siteId;
      option.textContent = stay.siteName;
      siteSelect.appendChild(option);
    });
    const starButtons = Array.from(document.querySelectorAll('#reviewStars button'));
    starButtons.forEach((button, index) => {
      button.addEventListener('click', () => {
        starButtons.forEach((item, itemIndex) => item.classList.toggle('on', itemIndex <= index));
      });
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const user = await currentUser();
      if (!user) {
        alert('리뷰 작성은 로그인 후 이용할 수 있습니다.');
        location.href = location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
        return;
      }
      const site = siteSelect;
      const activeStars = document.querySelectorAll('#reviewStars button.on').length;
      if (!site?.value || !activeStars) return alert('캠핑장과 별점을 선택해주세요.');
      const { error } = await db.from('reviews').insert({
        user_id: user.id,
        author_name: user.user_metadata?.full_name || user.email.split('@')[0],
        site_id: site.value,
        site_name: site.options[site.selectedIndex]?.text || site.value,
        rating: activeStars,
        title: document.getElementById('reviewTitle').value.trim(),
        body: document.getElementById('reviewBody').value.trim(),
        photos: []
      });
      if (error) return alert(error.message);
      form.reset();
      document.querySelectorAll('#reviewStars button').forEach(button => button.classList.remove('on'));
      await renderMyReviews(user.id);
      await renderPublicReviews();
      if (document.getElementById('communityReviewList')) {
        form.style.display = 'none';
        document.getElementById('communityReviewWriteToggle')?.setAttribute('aria-expanded', 'false');
        alert('리뷰가 등록되었습니다. 호스트 답글도 이 게시판에서 확인할 수 있어요.');
      }
    }, { capture: true });
    const user = await currentUser();
    if (user) await renderMyReviews(user.id);
  }

  async function renderMyReviews(userId) {
    const list = document.getElementById('myReviewList');
    if (!list) return;
    const { data, error } = await db.from('reviews').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) {
      list.innerHTML = '<p style="color:var(--secondary);font-size:13px;">리뷰를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>';
      return;
    }
    list.innerHTML = data.length ? data.map(review => `<div class="my-review-item">
      <p style="font-size:12px;color:var(--brass);margin-bottom:4px;">${esc(review.site_name)} · ${'★'.repeat(review.rating)}</p>
      <p style="font-family:var(--serif);font-size:15px;font-weight:600;margin-bottom:4px;">${esc(review.title)}</p>
      <p style="font-size:13px;color:var(--text-mute);line-height:1.7;">${esc(review.body)}</p>
      ${review.admin_reply ? `<p style="margin-top:8px;padding:10px;background:var(--ivory);">호스트 답변: ${esc(review.admin_reply)}</p>` : ''}
    </div>`).join('') : '<p style="color:var(--text-mute);font-size:13px;">아직 작성한 리뷰가 없습니다.</p>';
  }

  async function renderPublicReviews() {
    if (!/community-reviews\.html$/.test(location.pathname)) return;
    const list = document.getElementById('communityReviewList') || document.getElementById('reviewList');
    if (!list) return;
    const pagination = document.getElementById('reviewPagination');
    if (pagination) pagination.innerHTML = '';
    const { data, error } = await db.from('reviews').select('id,author_name,site_id,site_name,rating,title,body,admin_reply,status,created_at').eq('status', 'visible').order('created_at', { ascending: false }).limit(50);
    if (error || !data) {
      list.innerHTML = '<div class="review-item" style="background:var(--paper);"><p class="quote" style="min-height:auto;">리뷰를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p></div>';
      return;
    }
    list.innerHTML = data.length ? data.map(review => `<div class="review-item" style="background:var(--paper);">
      <div class="review-foot" style="border-top:none;margin:0 0 10px;justify-content:flex-start;gap:14px;">
        <span class="review-stars text-brass">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</span>
        <span class="who text-mute">${esc(review.site_name)} · ${esc(review.author_name)} · ${new Date(review.created_at).toLocaleDateString('ko-KR')}</span>
      </div><p class="quote" style="color:var(--text-mute);min-height:auto;"><strong style="color:var(--ink);">${esc(review.title)}</strong><br>${esc(review.body)}</p>
      ${review.admin_reply ? `<p class="community-host-reply"><strong>호스트 답글</strong>${esc(review.admin_reply)}</p>` : ''}
    </div>`).join('') : '<div class="review-item" style="background:var(--paper);"><p class="quote" style="min-height:auto;">아직 실제 등록된 리뷰가 없습니다. 첫 리뷰를 작성해보세요.</p></div>';
  }

  async function renderDetailReviews() {
    const list = document.getElementById('trippickReviewList');
    if (!list) return;
    const siteId = document.body.dataset.siteId || '';
    if (!siteId) {
      list.innerHTML = '<p style="color:var(--text-mute);font-size:13px;padding:12px 0;">캠핑장 정보를 확인하고 있습니다.</p>';
      return;
    }
    const { data, error } = await db.from('reviews')
      .select('author_name,rating,title,body,admin_reply,created_at')
      .eq('site_id', siteId)
      .eq('status', 'visible')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error || !data) {
      list.innerHTML = '<p style="color:var(--secondary);font-size:13px;padding:12px 0;">이용후기를 불러오지 못했습니다.</p>';
      return;
    }
    list.innerHTML = data.length ? data.map(review => `<article class="review-item" style="background:var(--ivory-soft);">
      <div class="review-foot" style="border-top:none;margin:0 0 8px;">
        <span class="review-stars" style="color:var(--brass);">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</span>
        <span class="who" style="color:var(--text-mute);">${esc(review.author_name)} · ${new Date(review.created_at).toLocaleDateString('ko-KR')}</span>
      </div>
      <p class="quote" style="color:var(--text-mute);min-height:auto;"><strong style="color:var(--ink);">${esc(review.title)}</strong><br>${esc(review.body)}</p>
      ${review.admin_reply ? `<p class="community-host-reply"><strong>호스트 답글</strong>${esc(review.admin_reply)}</p>` : ''}
    </article>`).join('') : '<p style="color:var(--text-mute);font-size:13px;padding:12px 0;">아직 등록된 트립픽 이용후기가 없습니다.</p>';
  }
  window.__trippickRenderReviews = renderDetailReviews;

  async function setupBoard() {
    const form = document.getElementById('qnaForm');
    const list = document.getElementById('qnaList');
    if (!form || !list) return;

    const authorInput = document.getElementById('qnaAuthor');
    const user = await currentUser();
    if (user && authorInput) {
      authorInput.value = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
    }

    const render = async () => {
      const pagination = document.getElementById('qnaPagination');
      if (pagination) pagination.innerHTML = '';
      const { data, error } = await db.rpc('list_board_posts');
      if (error) {
        list.innerHTML = '<p>상담글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>';
        return;
      }
      list.innerHTML = data.length ? data.map(post => `<details class="faq-item" data-server-post-id="${post.id}" data-secret="${post.is_secret}">
        <summary>
          <span>${post.is_secret ? '🔒 ' : ''}${esc(post.title)}</span>
          <span style="font-size:11.5px;color:var(--text-mute);margin-left:auto;">${esc(post.author_name)} · ${new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
        </summary>
        ${post.is_secret ? '<p style="padding:18px;background:var(--ivory);color:var(--text-mute);">작성자 개인정보 보호를 위해 비밀글 본문은 공개 목록에서 표시하지 않습니다.</p>'
        : `<p>${esc(post.body)}</p>${post.admin_answer ? `<div style="margin:12px 0;padding:14px;background:var(--ivory);">트립픽 답변: ${esc(post.admin_answer)}</div>` : ''}`}
      </details>`).join('') : '<p>아직 등록된 문의가 없습니다.</p>';
    };

    form.addEventListener('submit', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!user) {
        alert('상담글 작성은 로그인 후 이용할 수 있습니다.');
        location.href = 'login.html';
        return;
      }
      const rawCategory = document.getElementById('qnaCategory').value;
      const category = /취소|환불/.test(rawCategory) ? '취소/환불' : /이용|시설/.test(rawCategory) ? '시설' : /예약/.test(rawCategory) ? '예약' : '기타';
      const isSecret = document.getElementById('qnaSecretToggle').checked;
      const authorName = authorInput?.value.trim() || '';
      if (authorName.length < 2) return alert('작성자 이름을 2자 이상 입력해주세요.');

      const { error } = await db.from('board_posts').insert({
        user_id: user.id,
        author_name: authorName,
        category,
        title: document.getElementById('qnaTitle').value.trim(),
        body: document.getElementById('qnaBody').value.trim(),
        is_secret: isSecret
      });
      if (error) return alert(error.message);
      form.reset();
      if (user && authorInput) authorInput.value = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
      form.style.display = 'none';
      document.getElementById('qnaWriteToggle')?.setAttribute('aria-expanded', 'false');
      await render();
    }, true);
    await render();
  }

  async function init() {
    setupLogin();
    setupSignup();
    await updateAuthLinks();
    await setupMypageCoupon();
    await setupReviewForm();
    await renderPublicReviews();
    await renderDetailReviews();
    await setupBoard();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
