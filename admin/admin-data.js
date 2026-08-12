(function () {
  'use strict';
  if (!window.supabase || !window.TRIPPICK_SUPABASE) return;
  const cfg = window.TRIPPICK_SUPABASE;
  const db = window.supabase.createClient(cfg.url, cfg.publishableKey, { auth: { persistSession: true } });
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function addUsersNav() {
    document.querySelectorAll('.host-nav').forEach(nav => {
      if (nav.querySelector('a[href="admin-users.html"]')) return;
      const link = document.createElement('a');
      link.href = 'admin-users.html';
      link.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M3.5 19c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5M16 7h5M18.5 4.5v5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>회원 관리';
      if (/admin-users\.html$/.test(location.pathname)) link.classList.add('active');
      nav.appendChild(link);
    });
  }

  function setPortfolioMode() {
    const topbar = document.querySelector('.host-topbar-left');
    if (!topbar || topbar.querySelector('.portfolio-mode-badge')) return;
    const badge = document.createElement('p');
    badge.className = 'portfolio-mode-badge';
    badge.style.cssText = 'margin-top:7px;color:#ad8a4c;font-size:12px;letter-spacing:.04em;';
    badge.textContent = 'PORTFOLIO · 공개 읽기 전용 모드';
    topbar.appendChild(badge);
  }

  async function renderUsers() {
    const target = document.getElementById('adminUsers');
    if (!target) return;
    const { data, error } = await db.from('portfolio_members').select('masked_email,signup_provider,joined_at').order('joined_at', { ascending: false });
    if (error) { target.innerHTML = `<p>${esc(error.message)}</p>`; return; }
    target.innerHTML = `<p style="font-size:12px;color:#8f948f;margin-bottom:14px;">개인정보 보호를 위해 이메일 일부를 가려 표시합니다.</p><div class="host-table-wrap"><table class="host-table"><thead><tr><th>가입일</th><th>가입 방식</th><th>이메일</th><th>상태</th></tr></thead><tbody>${data.map(user => `<tr>
      <td>${new Date(user.joined_at).toLocaleDateString('ko-KR')}</td><td>${esc(user.signup_provider === 'google' ? 'Google' : '이메일')}</td><td>${esc(user.masked_email)}</td><td><span class="host-pill host-pill-sage">가입 완료</span></td>
    </tr>`).join('')}</tbody></table></div>`;
  }

  async function renderReviews() {
    if (!/admin-review\.html$/.test(location.pathname)) return;
    const first = document.querySelector('.host-review-card');
    const target = first?.parentElement;
    if (!target) return;
    const { data, error } = await db.from('reviews').select('id,author_name,site_id,site_name,rating,title,body,admin_reply,status,created_at').order('created_at', { ascending: false });
    if (error) return;
    target.innerHTML = `<div class="host-panel-head"><div><h2>실제 사용자 리뷰</h2><p>Supabase에 등록된 리뷰와 관리자 답글입니다.</p></div></div>
      <div id="adminReviewRows">${data.length ? data.map(review => `<div class="host-review-card" data-review-id="${review.id}">
        <div class="host-review-top"><div class="host-review-user"><div class="host-review-avatar">${esc((review.author_name || '회')[0])}</div><div><div class="host-review-name">${esc(review.author_name)}</div><div class="host-review-meta">${esc(review.site_name)} · ${new Date(review.created_at).toLocaleDateString('ko-KR')}</div></div></div><span class="host-stars">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</span></div>
        <p class="host-review-body"><strong>${esc(review.title)}</strong><br>${esc(review.body)}</p>
        ${review.admin_reply ? `<div class="host-review-reply"><span class="tag">호스트 답글</span><p>${esc(review.admin_reply)}</p></div>` : ''}
        ${review.admin_reply ? '' : '<p style="font-size:12px;color:#8f948f;">포트폴리오 공개 모드에서는 답글 내용을 조회만 할 수 있습니다.</p>'}
      </div>`).join('') : '<p>등록된 리뷰가 없습니다.</p>'}</div>`;
  }

  async function renderPosts() {
    if (!/admin-consult\.html$/.test(location.pathname)) return;
    const target = document.querySelector('.host-consult-layout');
    if (!target) return;
    const { data, error } = await db.from('board_posts').select('id,author_name,category,title,body,is_secret,admin_answer,status,created_at').order('created_at', { ascending: false });
    if (error) return;
    target.style.display = 'block';
    target.innerHTML = data.length ? data.map(post => `<div class="host-review-card" data-post-id="${post.id}">
      <div class="host-review-top"><div class="host-review-user"><div class="host-review-avatar">${esc((post.author_name || '회')[0])}</div><div><div class="host-review-name">${esc(post.author_name)} ${post.is_secret ? '🔒' : ''}</div><div class="host-review-meta">${esc(post.category)} · ${new Date(post.created_at).toLocaleString('ko-KR')}</div></div></div><span class="host-pill">${esc(post.status)}</span></div>
      <p class="host-review-body"><strong>${esc(post.title)}</strong><br>${esc(post.body)}</p>
      ${post.admin_answer ? `<div class="host-review-reply"><span class="tag">호스트 답변</span><p>${esc(post.admin_answer)}</p></div>` : '<p style="font-size:12px;color:#8f948f;">답변 대기 중</p>'}
    </div>`).join('') : '<p>등록된 문의가 없습니다.</p>';
  }

  async function init() {
    addUsersNav();
    setPortfolioMode();
    await Promise.all([renderUsers(), renderReviews(), renderPosts()]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
