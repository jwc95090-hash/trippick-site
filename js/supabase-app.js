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
          data: { full_name: email.split('@')[0] }
        }
      });
      if (error) return message(form, error.message, true);
      if (data.session) location.href = 'mypage.html';
      else message(form, '가입 확인 메일을 보냈습니다. 이메일의 인증 링크를 눌러주세요.', false);
    }, true);
  }

  async function setupReviewForm() {
    const form = document.getElementById('reviewForm');
    if (!form) return;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const user = await currentUser();
      if (!user) { alert('리뷰 작성은 로그인 후 이용할 수 있습니다.'); location.href = 'login.html'; return; }
      const site = document.getElementById('reviewSite');
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
    }, { capture: true });
    const user = await currentUser();
    if (user) await renderMyReviews(user.id);
  }

  async function renderMyReviews(userId) {
    const list = document.getElementById('myReviewList');
    if (!list) return;
    const { data, error } = await db.from('reviews').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) return;
    list.innerHTML = data.length ? data.map(review => `<div class="my-review-item">
      <p style="font-size:12px;color:var(--brass);margin-bottom:4px;">${esc(review.site_name)} · ${'★'.repeat(review.rating)}</p>
      <p style="font-family:var(--serif);font-size:15px;font-weight:600;margin-bottom:4px;">${esc(review.title)}</p>
      <p style="font-size:13px;color:var(--text-mute);line-height:1.7;">${esc(review.body)}</p>
      ${review.admin_reply ? `<p style="margin-top:8px;padding:10px;background:var(--ivory);">호스트 답변: ${esc(review.admin_reply)}</p>` : ''}
    </div>`).join('') : '<p style="color:var(--text-mute);font-size:13px;">아직 작성한 리뷰가 없습니다.</p>';
  }

  async function renderPublicReviews() {
    if (!/community-reviews\.html$/.test(location.pathname)) return;
    const list = document.getElementById('reviewList');
    if (!list) return;
    const { data } = await db.from('reviews').select('id,author_name,site_id,site_name,rating,title,body,admin_reply,status,created_at').eq('status', 'visible').order('created_at', { ascending: false }).limit(50);
    if (!data) return;
    list.innerHTML = data.length ? data.map(review => `<div class="review-item" style="background:var(--paper);">
      <div class="review-foot" style="border-top:none;margin:0 0 10px;justify-content:flex-start;gap:14px;">
        <span class="review-stars text-brass">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</span>
        <span class="who text-mute">${esc(review.site_name)} · ${esc(review.author_name)} · ${new Date(review.created_at).toLocaleDateString('ko-KR')}</span>
      </div><p class="quote" style="color:var(--text-mute);min-height:auto;"><strong style="color:var(--ink);">${esc(review.title)}</strong><br>${esc(review.body)}</p>
      ${review.admin_reply ? `<p style="margin-top:12px;padding:12px;background:var(--ivory);">호스트 답변: ${esc(review.admin_reply)}</p>` : ''}
    </div>`).join('') : '<div class="review-item"><p>아직 등록된 리뷰가 없습니다.</p></div>';
  }

  async function setupBoard() {
    const form = document.getElementById('qnaForm');
    const list = document.getElementById('qnaList');
    if (!form || !list) return;
    const render = async () => {
      const { data } = await db.from('board_posts').select('id,author_name,category,title,body,is_secret,admin_answer,status,created_at').order('created_at', { ascending: false }).limit(100);
      if (!data) return;
      list.innerHTML = data.length ? data.map(post => `<details class="faq-item"><summary>
        <span>${post.is_secret ? '🔒 ' : ''}${esc(post.title)}</span>
        <span style="font-size:11.5px;color:var(--text-mute);margin-left:auto;">${esc(post.author_name)} · ${new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
      </summary><p>${esc(post.body)}</p>${post.admin_answer ? `<div style="margin:12px 0;padding:14px;background:var(--ivory);">트립픽 답변: ${esc(post.admin_answer)}</div>` : ''}</details>`).join('') : '<p>아직 등록된 문의가 없습니다.</p>';
    };
    form.addEventListener('submit', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const user = await currentUser();
      if (!user) { alert('문의 작성은 로그인 후 이용할 수 있습니다.'); location.href = 'login.html'; return; }
      const rawCategory = document.getElementById('qnaCategory').value;
      const category = /취소|환불/.test(rawCategory) ? '취소/환불' : /이용|시설/.test(rawCategory) ? '시설' : /예약/.test(rawCategory) ? '예약' : '기타';
      const { error } = await db.from('board_posts').insert({
        user_id: user.id,
        author_name: user.user_metadata?.full_name || user.email.split('@')[0],
        category,
        title: document.getElementById('qnaTitle').value.trim(),
        body: document.getElementById('qnaBody').value.trim(),
        is_secret: document.getElementById('qnaSecretToggle').checked
      });
      if (error) return alert(error.message);
      form.reset(); form.style.display = 'none'; await render();
    }, true);
    await render();
  }

  async function init() {
    setupLogin();
    setupSignup();
    await updateAuthLinks();
    await setupReviewForm();
    await renderPublicReviews();
    await setupBoard();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
