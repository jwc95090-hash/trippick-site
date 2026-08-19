(function () {
  'use strict';

  const cfg = window.TRIPPICK_SUPABASE;
  if (!window.supabase || !cfg) return;

  const db = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.trippickHostSupabase = db;
  const PORTFOLIO_PUBLIC_MODE = true;
  let passwordRecoveryMode = PORTFOLIO_PUBLIC_MODE ? false : /(?:[?#&])(?:type=recovery|password-reset=1)/.test(location.href);

  const state = {
    posts: [],
    reviews: [],
    members: [],
    selectedPostId: null,
    reviewMode: 'all',
    reviewQuery: '',
    reviewSort: 'newest'
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const nl2br = value => esc(value).replace(/\n/g, '<br>');
  const dateText = value => new Date(value).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
  const safePhoto = value => /^(https?:|data:image\/)/i.test(String(value || '')) ? esc(value) : '';

  function toast(message, tone) {
    let el = document.getElementById('hostDataToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'hostDataToast';
      el.className = 'host-data-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = `host-data-toast show ${tone === 'error' ? 'error' : 'success'}`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function showAuthGate(message) {
    const shell = document.querySelector('.host-shell');
    shell?.setAttribute('inert', '');
    shell?.setAttribute('aria-hidden', 'true');
    let gate = document.getElementById('hostAuthGate');
    if (!gate) {
      gate = document.createElement('div');
      gate.id = 'hostAuthGate';
      gate.className = 'host-auth-gate';
      gate.innerHTML = `<div class="host-auth-card">
        <span class="host-auth-kicker">TRIPPICK HOST</span>
        <h1>관리자 로그인</h1>
        <p>고객 상담과 리뷰 답글은 관리자 계정으로 로그인한 뒤 관리할 수 있습니다.</p>
        <form id="hostAuthForm">
          <label>이메일<input type="email" id="hostAuthEmail" autocomplete="username" required></label>
          <label>비밀번호<input type="password" id="hostAuthPassword" autocomplete="current-password" required></label>
          <button class="host-btn host-btn-primary" type="submit">관리자 로그인</button>
          <button class="host-auth-reset-link" id="hostPasswordResetRequest" type="button">비밀번호를 잊으셨나요?</button>
          <p class="host-auth-message" id="hostAuthMessage" role="alert"></p>
        </form>
        <a href="../index.html">고객 사이트로 돌아가기</a>
      </div>`;
      document.body.appendChild(gate);
      gate.querySelector('form').addEventListener('submit', async event => {
        event.preventDefault();
        const submit = event.submitter;
        const result = gate.querySelector('#hostAuthMessage');
        submit.disabled = true;
        submit.textContent = '확인 중...';
        result.textContent = '';
        const { error } = await db.auth.signInWithPassword({
          email: gate.querySelector('#hostAuthEmail').value.trim(),
          password: gate.querySelector('#hostAuthPassword').value
        });
        if (error) {
          result.textContent = '로그인 정보를 확인해주세요.';
          submit.disabled = false;
          submit.textContent = '관리자 로그인';
          return;
        }
        const allowed = await requireAdmin();
        if (!allowed) {
          await db.auth.signOut();
          result.textContent = '이 계정에는 호스트 관리자 권한이 없습니다.';
          submit.disabled = false;
          submit.textContent = '관리자 로그인';
        }
      });
      gate.querySelector('#hostPasswordResetRequest').addEventListener('click', async event => {
        const resetButton = event.currentTarget;
        const emailInput = gate.querySelector('#hostAuthEmail');
        const result = gate.querySelector('#hostAuthMessage');
        const email = emailInput.value.trim();
        if (!email || !emailInput.checkValidity()) {
          result.textContent = '관리자 이메일을 먼저 입력해주세요.';
          emailInput.focus();
          return;
        }
        resetButton.disabled = true;
        result.textContent = '재설정 메일을 요청하고 있습니다...';
        const publicBase = String(cfg.publicSiteUrl || location.origin).replace(/\/$/, '');
        const redirectTo = `${publicBase}/trippick-host/admin-consult.html?password-reset=1`;
        const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo });
        resetButton.disabled = false;
        if (error) {
          result.textContent = `메일을 보내지 못했습니다: ${error.message}`;
          return;
        }
        result.textContent = '계정이 확인되면 비밀번호 재설정 메일이 발송됩니다. 받은편지함과 스팸함을 확인해주세요.';
      });
    }
    gate.style.display = 'grid';
    const result = gate.querySelector('#hostAuthMessage');
    if (result) result.textContent = message || '';
  }

  function showPasswordUpdateGate() {
    passwordRecoveryMode = true;
    document.getElementById('hostAuthGate')?.remove();
    const shell = document.querySelector('.host-shell');
    shell?.setAttribute('inert', '');
    shell?.setAttribute('aria-hidden', 'true');
    const gate = document.createElement('div');
    gate.id = 'hostAuthGate';
    gate.className = 'host-auth-gate';
    gate.innerHTML = `<div class="host-auth-card">
      <span class="host-auth-kicker">TRIPPICK HOST</span>
      <h1>새 비밀번호 설정</h1>
      <p>관리자 계정에서 새로 사용할 비밀번호를 입력해주세요.</p>
      <form id="hostPasswordUpdateForm">
        <label>새 비밀번호<input type="password" id="hostNewPassword" minlength="8" autocomplete="new-password" required></label>
        <label>새 비밀번호 확인<input type="password" id="hostNewPasswordConfirm" minlength="8" autocomplete="new-password" required></label>
        <button class="host-btn host-btn-primary" type="submit">비밀번호 변경</button>
        <p class="host-auth-message" id="hostPasswordUpdateMessage" role="alert"></p>
      </form>
    </div>`;
    document.body.appendChild(gate);
    gate.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      const password = gate.querySelector('#hostNewPassword').value;
      const confirmPassword = gate.querySelector('#hostNewPasswordConfirm').value;
      const result = gate.querySelector('#hostPasswordUpdateMessage');
      if (password !== confirmPassword) {
        result.textContent = '새 비밀번호가 서로 일치하지 않습니다.';
        return;
      }
      const submit = event.submitter;
      submit.disabled = true;
      submit.textContent = '변경 중...';
      const { error } = await db.auth.updateUser({ password });
      if (error) {
        result.textContent = `비밀번호를 변경하지 못했습니다: ${error.message}`;
        submit.disabled = false;
        submit.textContent = '비밀번호 변경';
        return;
      }
      await db.auth.signOut();
      history.replaceState({}, document.title, location.pathname);
      passwordRecoveryMode = false;
      gate.remove();
      showAuthGate('비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.');
    });
  }

  async function requireAdmin() {
    if (PORTFOLIO_PUBLIC_MODE) {
      document.getElementById('hostAuthGate')?.remove();
      const shell = document.querySelector('.host-shell');
      shell?.removeAttribute('inert');
      shell?.removeAttribute('aria-hidden');
      document.querySelectorAll('.host-logout, #hostSignOut').forEach(el => el.remove());
      document.querySelectorAll('.host-account-name').forEach(el => { el.textContent = 'TRIPPICK 관리자 데모'; });
      document.querySelectorAll('.host-account-role').forEach(el => { el.textContent = '포트폴리오 공개 모드'; });
      const topbarUser = document.querySelector('.host-user');
      if (topbarUser) topbarUser.innerHTML = '<span><strong>관리자 데모</strong><small>로그인 없이 둘러보기</small></span>';
      await renderCurrentPage();
      startAutoRefresh();
      return true;
    }
    if (passwordRecoveryMode) {
      const { data } = await db.auth.getSession();
      if (data.session) {
        showPasswordUpdateGate();
        return false;
      }
    }
    const { data: userData } = await db.auth.getUser();
    const user = userData.user;
    if (!user) {
      showAuthGate();
      return false;
    }
    const { data: profile, error } = await db.from('profiles').select('role,display_name').eq('id', user.id).single();
    if (error || profile?.role !== 'admin') {
      showAuthGate('관리자 권한이 있는 계정으로 로그인해주세요.');
      return false;
    }

    document.getElementById('hostAuthGate')?.remove();
    const shell = document.querySelector('.host-shell');
    shell?.removeAttribute('inert');
    shell?.removeAttribute('aria-hidden');
    const sidebarAccount = document.querySelector('.host-account');
    if (sidebarAccount) {
      const displayName = profile.display_name || user.email?.split('@')[0] || '트립픽 관리자';
      const avatar = sidebarAccount.querySelector('.host-avatar');
      const name = sidebarAccount.querySelector('.host-account-name');
      const role = sidebarAccount.querySelector('.host-account-role');
      const logout = sidebarAccount.querySelector('.host-logout');
      if (avatar) avatar.textContent = displayName[0];
      if (name) name.textContent = displayName;
      if (role) role.textContent = '관리자 계정';
      logout?.addEventListener('click', async event => {
        event.preventDefault();
        if (!confirm('관리자 콘솔에서 로그아웃할까요?')) return;
        await db.auth.signOut();
        location.reload();
      });
    }
    const topbarUser = document.querySelector('.host-user');
    if (topbarUser) {
      topbarUser.innerHTML = `<button type="button" class="host-user-session" id="hostSignOut" title="로그아웃">
        <span class="host-avatar">${esc((profile.display_name || user.email || 'A')[0])}</span>
        <span><strong>${esc(profile.display_name || '트립픽 관리자')}</strong><small>${esc(user.email)}</small></span>
      </button>`;
      document.getElementById('hostSignOut')?.addEventListener('click', async () => {
        if (!confirm('관리자 콘솔에서 로그아웃할까요?')) return;
        await db.auth.signOut();
        location.reload();
      });
    }
    await renderCurrentPage();
    startAutoRefresh();
    return true;
  }

  function setStat(index, value, unit, detail, detailTone) {
    const card = document.querySelectorAll('.host-stat-grid .host-stat')[index];
    if (!card) return;
    const valueEl = card.querySelector('.host-stat-val');
    const detailEl = card.querySelector('.host-stat-delta');
    if (valueEl) valueEl.innerHTML = `${esc(value)}<small>${esc(unit || '')}</small>`;
    if (detailEl) {
      detailEl.textContent = detail || '';
      detailEl.className = `host-stat-delta ${detailTone || 'up'}`;
    }
  }

  async function renderPosts() {
    if (!/admin-consult\.html$/.test(location.pathname)) return;
    const panelDescription = document.querySelector('.host-consult-layout')?.closest('.host-panel')?.querySelector('.host-panel-head p');
    if (panelDescription) panelDescription.textContent = '고객 상담게시판에 등록된 실제 문의를 확인하고 답변을 저장하세요. 목록은 30초마다 자동 갱신됩니다.';
    let data, error;
    if (PORTFOLIO_PUBLIC_MODE) {
      ({ data, error } = await db.rpc('list_board_posts'));
      data = (data || []).map(post => ({ ...post, updated_at: post.created_at }));
    } else {
      ({ data, error } = await db.from('board_posts')
        .select('id,author_name,category,title,body,is_secret,admin_answer,status,created_at,updated_at')
        .order('created_at', { ascending: false })
        .limit(200));
    }
    if (error) return toast(`문의 목록을 불러오지 못했습니다: ${error.message}`, 'error');
    state.posts = data || [];
    if (!state.posts.some(post => String(post.id) === String(state.selectedPostId))) {
      state.selectedPostId = state.posts[0]?.id ?? null;
    }

    const waiting = state.posts.filter(post => post.status === 'open').length;
    const answered = state.posts.filter(post => post.status === 'answered').length;
    const thisMonth = state.posts.filter(post => {
      const date = new Date(post.created_at);
      const now = new Date();
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }).length;
    const answerRate = state.posts.length ? Math.round((answered / state.posts.length) * 100) : 0;
    setStat(0, waiting, '건', '답변 대기 중', waiting ? 'down' : 'up');
    setStat(1, answered, '건', '답변 완료');
    setStat(2, thisMonth, '건', '이번 달 실제 문의');
    setStat(3, answerRate, '%', `전체 ${state.posts.length}건 기준`);
    const consultBadge = document.querySelector('.host-nav a[href="admin-consult.html"] .cnt');
    if (consultBadge) consultBadge.textContent = waiting;

    const layout = document.querySelector('.host-consult-layout');
    if (!layout) return;
    layout.innerHTML = `<div class="host-consult-list" id="hostConsultList"></div><div id="hostConsultDetail"></div>`;
    renderPostList();
    renderPostDetail();
  }

  function renderPostList() {
    const list = document.getElementById('hostConsultList');
    if (!list) return;
    list.innerHTML = state.posts.length ? state.posts.map(post => `<button type="button" class="host-consult-item ${String(post.id) === String(state.selectedPostId) ? 'active' : ''}" data-post-id="${post.id}">
      <span class="host-consult-item-top"><strong>${esc(post.author_name)} ${post.is_secret ? '<span aria-label="비밀글">🔒</span>' : ''}</strong><time>${esc(new Date(post.created_at).toLocaleDateString('ko-KR'))}</time></span>
      <span class="host-consult-preview"><span class="host-pill ${post.status === 'answered' ? 'host-pill-sage' : post.status === 'hidden' ? 'host-pill-mute' : 'host-pill-ember'}"><i></i>${post.status === 'answered' ? '답변 완료' : post.status === 'hidden' ? '숨김' : '답변 대기'}</span>${esc(post.title)}</span>
    </button>`).join('') : '<div class="host-empty-state"><strong>등록된 문의가 없습니다</strong><p>고객이 상담게시판에 글을 등록하면 이곳에 표시됩니다.</p><a class="host-btn host-btn-ghost" href="../pages/community-qna.html" target="_blank">상담게시판 열기</a></div>';
    list.querySelectorAll('[data-post-id]').forEach(button => button.addEventListener('click', () => {
      state.selectedPostId = button.dataset.postId;
      renderPostList();
      renderPostDetail();
    }));
  }

  function renderPostDetail() {
    const target = document.getElementById('hostConsultDetail');
    if (!target) return;
    const post = state.posts.find(item => String(item.id) === String(state.selectedPostId));
    if (!post) {
      target.innerHTML = '<div class="host-empty-state"><strong>문의 상세</strong><p>왼쪽 목록에서 확인할 문의를 선택해주세요.</p></div>';
      return;
    }
    target.innerHTML = `<div class="host-review-top" style="margin-bottom:16px;">
      <div class="host-review-user"><div class="host-review-avatar">${esc((post.author_name || '회')[0])}</div><div><div class="host-review-name">${esc(post.author_name)}</div><div class="host-review-meta">${esc(post.category)} · ${esc(dateText(post.created_at))}</div></div></div>
      <span class="host-pill ${post.status === 'answered' ? 'host-pill-sage' : post.status === 'hidden' ? 'host-pill-mute' : 'host-pill-ember'}"><i></i>${post.status === 'answered' ? '답변 완료' : post.status === 'hidden' ? '숨김' : '답변 대기'}</span>
    </div>
    <h3 class="host-consult-title">${post.is_secret ? '<span aria-label="비밀글">🔒</span> ' : ''}${esc(post.title)}</h3>
    <div class="host-consult-thread">
      <div class="host-msg from-guest">${post.is_secret && !post.body ? '비밀글 본문은 고객 게시판에서 설정된 번호를 입력해야 확인할 수 있습니다.' : nl2br(post.body)}<time>${esc(dateText(post.created_at))}</time></div>
      ${post.admin_answer ? `<div class="host-msg from-host">${nl2br(post.admin_answer)}<time>${esc(dateText(post.updated_at || post.created_at))}</time></div>` : ''}
    </div>
    ${PORTFOLIO_PUBLIC_MODE ? '<div class="host-empty-state" style="margin-top:14px;"><strong>포트폴리오 공개 모드</strong><p>상담 목록은 실제 데이터와 연결되어 있으며, 개인정보 보호를 위해 비밀글 본문과 답변 수정 기능은 잠겨 있습니다.</p></div>' : `
    <div class="host-reply-form host-data-reply-form">
      <textarea rows="3" id="hostPostAnswer" maxlength="5000" placeholder="고객에게 보낼 답변을 입력하세요" required aria-label="상담 답변 입력">${esc(post.admin_answer || '')}</textarea>
      <div class="host-data-actions"><button type="button" class="host-btn host-btn-primary" id="hostPostReplySave">${post.admin_answer ? '답변 수정' : '답변 등록'}</button><button type="button" class="host-btn host-btn-ghost" id="hostPostVisibility">${post.status === 'hidden' ? '게시글 공개' : '게시글 숨김'}</button></div>
    </div>`}`;
    document.getElementById('hostPostReplySave')?.addEventListener('click', () => savePostReply(post));
    document.getElementById('hostPostVisibility')?.addEventListener('click', () => togglePostVisibility(post));
  }

  async function savePostReply(post) {
    const textarea = document.getElementById('hostPostAnswer');
    const answer = textarea?.value.trim();
    if (!answer) { textarea?.focus(); return toast('답변 내용을 입력해주세요.', 'error'); }
    const button = document.getElementById('hostPostReplySave');
    button.disabled = true;
    const { data, error } = await db.from('board_posts').update({ admin_answer: answer, status: 'answered', updated_at: new Date().toISOString() }).eq('id', post.id).select('id').single();
    button.disabled = false;
    if (error || !data) return toast(`답변 저장에 실패했습니다: ${error?.message || '권한을 확인해주세요.'}`, 'error');
    toast('상담 답변이 고객 게시판에 반영되었습니다.');
    await renderPosts();
  }

  async function togglePostVisibility(post) {
    const next = post.status === 'hidden' ? (post.admin_answer ? 'answered' : 'open') : 'hidden';
    if (next === 'hidden' && !confirm('이 문의를 고객 게시판에서 숨길까요?')) return;
    const { data, error } = await db.from('board_posts').update({ status: next, updated_at: new Date().toISOString() }).eq('id', post.id).select('id').single();
    if (error || !data) return toast(`상태 변경에 실패했습니다: ${error?.message || '권한을 확인해주세요.'}`, 'error');
    toast(next === 'hidden' ? '문의가 고객 게시판에서 숨겨졌습니다.' : '문의가 다시 공개되었습니다.');
    await renderPosts();
  }

  async function renderReviews() {
    if (!/admin-review\.html$/.test(location.pathname)) return;
    const { data, error } = await db.from('reviews')
      .select('id,author_name,site_id,site_name,rating,title,body,photos,admin_reply,status,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return toast(`리뷰 목록을 불러오지 못했습니다: ${error.message}`, 'error');
    state.reviews = data || [];

    const visible = state.reviews.filter(review => review.status === 'visible');
    const avg = visible.length ? (visible.reduce((sum, review) => sum + Number(review.rating || 0), 0) / visible.length).toFixed(1) : '0.0';
    const unanswered = visible.filter(review => !review.admin_reply).length;
    const photoCount = visible.filter(review => Array.isArray(review.photos) && review.photos.length).length;
    const answerRate = visible.length ? Math.round(((visible.length - unanswered) / visible.length) * 100) : 0;
    setStat(0, avg, '/ 5.0', `${visible.length}개 공개 리뷰`);
    setStat(1, state.reviews.length, '건', `${visible.length}건 공개`);
    setStat(2, unanswered, '건', `답변률 ${answerRate}%`, unanswered ? 'down' : 'up');
    setStat(3, photoCount, '건', visible.length ? `전체의 ${Math.round(photoCount / visible.length * 100)}%` : '사진 리뷰 없음');
    const reviewBadge = document.querySelector('.host-nav a[href="admin-review.html"] .cnt');
    if (reviewBadge) reviewBadge.textContent = unanswered;
    renderRatingSummary(visible, avg);
    setupReviewControls();
    renderReviewList();
  }

  function renderRatingSummary(reviews, average) {
    const summary = document.querySelector('.host-rating-summary');
    if (!summary) return;
    const counts = [1, 2, 3, 4, 5].map(score => reviews.filter(review => Number(review.rating) === score).length);
    summary.innerHTML = `<div class="host-rating-big"><div class="num">${average}</div><span class="host-stars">${'★'.repeat(Math.round(Number(average)))}${'☆'.repeat(5 - Math.round(Number(average)))}</span><div class="cnt">${reviews.length}개 공개 리뷰</div></div>
      <div class="host-rating-bars">${[5,4,3,2,1].map(score => { const count = counts[score - 1]; const width = reviews.length ? Math.round(count / reviews.length * 100) : 0; return `<div class="host-rating-bar-row"><span>${score}점</span><div class="track"><div class="fill" style="width:${width}%;"></div></div><span>${count}</span></div>`; }).join('')}</div>`;
  }

  function setupReviewControls() {
    const panel = document.querySelector('.host-rating-summary')?.closest('.host-panel');
    const filter = panel?.querySelector('.host-filter-row');
    if (!panel || !filter) return;
    panel.querySelectorAll('.host-review-card').forEach(card => card.remove());
    let list = document.getElementById('hostReviewList');
    if (!list) {
      list = document.createElement('div');
      list.id = 'hostReviewList';
      filter.insertAdjacentElement('afterend', list);
    }
    const tabs = Array.from(panel.querySelectorAll('.host-tabbar button'));
    const unanswered = state.reviews.filter(review => review.status === 'visible' && !review.admin_reply).length;
    const photoCount = state.reviews.filter(review => review.status === 'visible' && Array.isArray(review.photos) && review.photos.length).length;
    const labels = [`전체 ${state.reviews.length}`, `미답변 ${unanswered}`, `사진 리뷰 ${photoCount}`, '평점 낮은순'];
    tabs.forEach((tab, index) => {
      tab.textContent = labels[index];
      if (!tab.dataset.dataBound) {
        tab.dataset.dataBound = 'true';
        tab.addEventListener('click', () => {
          state.reviewMode = ['all', 'unanswered', 'photos', 'low'][index] || 'all';
          renderReviewList();
        });
      }
    });
    const search = filter.querySelector('input');
    const sort = filter.querySelector('select');
    if (search && !search.dataset.dataBound) {
      search.dataset.dataBound = 'true';
      search.addEventListener('input', () => { state.reviewQuery = search.value.trim().toLowerCase(); renderReviewList(); });
    }
    if (sort && !sort.dataset.dataBound) {
      sort.dataset.dataBound = 'true';
      sort.addEventListener('change', () => {
        state.reviewSort = sort.selectedIndex === 1 ? 'rating-desc' : sort.selectedIndex === 2 ? 'rating-asc' : 'newest';
        renderReviewList();
      });
    }
  }

  function filteredReviews() {
    let list = state.reviews.slice();
    if (state.reviewMode === 'unanswered') list = list.filter(review => review.status === 'visible' && !review.admin_reply);
    if (state.reviewMode === 'photos') list = list.filter(review => review.status === 'visible' && Array.isArray(review.photos) && review.photos.length);
    if (state.reviewMode === 'low') list.sort((a, b) => a.rating - b.rating || new Date(b.created_at) - new Date(a.created_at));
    if (state.reviewQuery) list = list.filter(review => [review.author_name, review.site_name, review.title, review.body].some(value => String(value || '').toLowerCase().includes(state.reviewQuery)));
    if (state.reviewSort === 'rating-desc') list.sort((a, b) => b.rating - a.rating);
    else if (state.reviewSort === 'rating-asc') list.sort((a, b) => a.rating - b.rating);
    else if (state.reviewMode !== 'low') list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list;
  }

  function renderReviewList() {
    const target = document.getElementById('hostReviewList');
    if (!target) return;
    const reviews = filteredReviews();
    target.innerHTML = reviews.length ? reviews.map(review => `<article class="host-review-card ${review.status === 'hidden' ? 'is-hidden' : ''}" data-review-id="${review.id}">
      <div class="host-review-top"><div class="host-review-user"><div class="host-review-avatar">${esc((review.author_name || '회')[0])}</div><div><div class="host-review-name">${esc(review.author_name)}</div><div class="host-review-meta">${esc(review.site_name)} · ${esc(dateText(review.created_at))}</div></div></div><div class="host-review-status"><span class="host-stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>${review.status === 'hidden' ? '<span class="host-pill host-pill-mute"><i></i>숨김</span>' : ''}</div></div>
      <p class="host-review-body"><strong>${esc(review.title)}</strong><br>${nl2br(review.body)}</p>
      ${Array.isArray(review.photos) && review.photos.length ? `<div class="host-review-photos">${review.photos.map(photo => safePhoto(photo)).filter(Boolean).slice(0, 4).map(photo => `<img src="${photo}" alt="${esc(review.author_name)}님의 리뷰 사진" loading="lazy">`).join('')}</div>` : ''}
      ${review.admin_reply ? `<div class="host-review-reply"><span class="tag">호스트 답글</span><p>${nl2br(review.admin_reply)}</p></div>` : ''}
      <div class="host-reply-form host-data-reply-form"><textarea rows="2" maxlength="5000" placeholder="호스트 답글을 입력하세요" aria-label="${esc(review.author_name)}님 리뷰 답글">${esc(review.admin_reply || '')}</textarea><div class="host-data-actions"><button type="button" class="host-btn host-btn-primary host-review-save">${review.admin_reply ? '답글 수정' : '답글 등록'}</button><button type="button" class="host-btn host-btn-ghost host-review-visibility">${review.status === 'hidden' ? '리뷰 공개' : '리뷰 숨김'}</button></div></div>
    </article>`).join('') : '<div class="host-empty-state"><strong>조건에 맞는 리뷰가 없습니다</strong><p>고객이 리뷰를 등록하면 이곳에서 바로 확인하고 답글을 남길 수 있습니다.</p><a class="host-btn host-btn-ghost" href="../pages/community-reviews.html" target="_blank">리뷰게시판 열기</a></div>';
    target.querySelectorAll('.host-review-save').forEach(button => button.addEventListener('click', () => saveReviewReply(button.closest('[data-review-id]'))));
    target.querySelectorAll('.host-review-visibility').forEach(button => button.addEventListener('click', () => toggleReviewVisibility(button.closest('[data-review-id]'))));
  }

  async function saveReviewReply(card) {
    const id = card?.dataset.reviewId;
    const reply = card?.querySelector('textarea')?.value.trim();
    if (!reply) { card?.querySelector('textarea')?.focus(); return toast('답글 내용을 입력해주세요.', 'error'); }
    const button = card.querySelector('.host-review-save');
    button.disabled = true;
    const { data, error } = await db.from('reviews').update({ admin_reply: reply, updated_at: new Date().toISOString() }).eq('id', id).select('id').single();
    button.disabled = false;
    if (error || !data) return toast(`답글 저장에 실패했습니다: ${error?.message || '권한을 확인해주세요.'}`, 'error');
    toast('호스트 답글이 고객 리뷰게시판에 반영되었습니다.');
    await renderReviews();
  }

  async function toggleReviewVisibility(card) {
    const review = state.reviews.find(item => String(item.id) === String(card?.dataset.reviewId));
    if (!review) return;
    const next = review.status === 'hidden' ? 'visible' : 'hidden';
    if (next === 'hidden' && !confirm('이 리뷰를 고객 게시판에서 숨길까요?')) return;
    const { data, error } = await db.from('reviews').update({ status: next, updated_at: new Date().toISOString() }).eq('id', review.id).select('id').single();
    if (error || !data) return toast(`상태 변경에 실패했습니다: ${error?.message || '권한을 확인해주세요.'}`, 'error');
    toast(next === 'hidden' ? '리뷰가 고객 게시판에서 숨겨졌습니다.' : '리뷰가 다시 공개되었습니다.');
    await renderReviews();
  }

  function maskedMemberId(value) {
    const id = String(value || '').replace(/-/g, '');
    return id ? `TP-${id.slice(0, 4).toUpperCase()}••••${id.slice(-4).toUpperCase()}` : 'TP-미확인';
  }

  function memberProviderLabel(value) {
    const provider = String(value || 'email').toLowerCase();
    if (provider === 'email') return '이메일';
    if (provider === 'google') return 'Google';
    return provider.replace(/[^a-z0-9_-]/gi, '').slice(0, 20) || '소셜 로그인';
  }

  async function renderMembers() {
    if (!/admin-members\.html$/.test(location.pathname)) return;
    const target = document.getElementById('hostMemberTable');
    if (!target) return;

    const { data, error } = await db.from('portfolio_members')
      .select('user_id,masked_email,signup_provider,joined_at')
      .order('joined_at', { ascending: false });

    if (error) {
      target.innerHTML = `<div class="host-empty-state"><strong>회원 정보를 불러오지 못했습니다</strong><p>${esc(error.message)}</p></div>`;
      return;
    }

    state.members = data || [];
    const emailMembers = state.members.filter(member => String(member.signup_provider || 'email').toLowerCase() === 'email');
    const socialMembers = state.members.filter(member => String(member.signup_provider || '').toLowerCase() !== 'email');
    const latest = state.members[0]?.joined_at ? new Date(state.members[0].joined_at).toLocaleDateString('ko-KR') : '-';
    setStat(0, state.members.length, '명', '실제 가입 데이터', 'up');
    setStat(1, emailMembers.length, '명', 'Email');
    setStat(2, socialMembers.length, '명', 'Google 등');
    setStat(3, latest, '', '가입일 기준');

    const navCount = document.getElementById('memberNavCount');
    if (navCount) navCount.textContent = state.members.length;

    const search = document.getElementById('hostMemberSearch');
    const provider = document.getElementById('hostMemberProvider');

    const draw = () => {
      const query = String(search?.value || '').trim().toLowerCase();
      const mode = provider?.value || 'all';
      const visible = state.members.filter(member => {
        const providerValue = String(member.signup_provider || 'email').toLowerCase();
        const providerMatch = mode === 'all'
          || (mode === 'email' && providerValue === 'email')
          || (mode === 'social' && providerValue !== 'email');
        const textMatch = !query || [maskedMemberId(member.user_id), member.masked_email]
          .some(value => String(value || '').toLowerCase().includes(query));
        return providerMatch && textMatch;
      });

      target.innerHTML = visible.length ? `<div class="host-member-table" role="table" aria-label="가입 회원 목록">
        <div class="host-member-row host-member-head" role="row">
          <span role="columnheader">회원 아이디</span><span role="columnheader">이메일</span><span role="columnheader">가입 방법</span><span role="columnheader">가입일</span><span role="columnheader">상태</span>
        </div>
        ${visible.map(member => `<div class="host-member-row" role="row">
          <strong role="cell">${esc(maskedMemberId(member.user_id))}</strong>
          <span role="cell">${esc(member.masked_email || '이메일 비공개')}</span>
          <span role="cell"><span class="host-member-provider">${esc(memberProviderLabel(member.signup_provider))}</span></span>
          <time role="cell" datetime="${esc(member.joined_at || '')}">${esc(member.joined_at ? new Date(member.joined_at).toLocaleDateString('ko-KR') : '-')}</time>
          <span role="cell"><span class="host-pill host-pill-sage"><i></i>가입 완료</span></span>
        </div>`).join('')}
      </div>` : '<div class="host-empty-state"><strong>조건에 맞는 회원이 없습니다</strong><p>검색어나 가입 방법 필터를 변경해보세요.</p></div>';
    };

    if (search && !search.dataset.bound) {
      search.dataset.bound = 'true';
      search.addEventListener('input', draw);
    }
    if (provider && !provider.dataset.bound) {
      provider.dataset.bound = 'true';
      provider.addEventListener('change', draw);
    }
    draw();
  }

  async function renderCurrentPage() {
    await Promise.all([renderNavCounts(), renderPosts(), renderReviews(), renderMembers()]);
  }

  async function renderNavCounts() {
    const [postResult, reviewResult] = await Promise.all([
      db.from('board_posts').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      db.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'visible').is('admin_reply', null)
    ]);
    const consultBadge = document.querySelector('.host-nav a[href="admin-consult.html"] .cnt');
    const reviewBadge = document.querySelector('.host-nav a[href="admin-review.html"] .cnt');
    if (!postResult.error && consultBadge) consultBadge.textContent = postResult.count || 0;
    if (!reviewResult.error && reviewBadge) reviewBadge.textContent = reviewResult.count || 0;
  }

  function startAutoRefresh() {
    if (window.trippickHostRefreshTimer) return;
    window.trippickHostRefreshTimer = setInterval(() => {
      if (document.visibilityState === 'visible') renderCurrentPage();
    }, 30000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') renderCurrentPage();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', requireAdmin);
  else requireAdmin();

  db.auth.onAuthStateChange(event => {
    if (event === 'PASSWORD_RECOVERY') {
      passwordRecoveryMode = true;
      setTimeout(showPasswordUpdateGate, 0);
    }
  });
})();
