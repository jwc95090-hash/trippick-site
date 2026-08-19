/* ============================================================
   TRIPPICK — 인터랙션 (Vanilla JS, jQuery 불필요)
   1. 모바일 메뉴 열기/닫기
   2. 헤더 스크롤 상태 전환 (메가 메뉴 → 축약형 바) + 스크롤 진행바
   3. 스크롤 리빌 애니메이션 (IntersectionObserver)
   4. 이벤트 팝업 / 원클릭 예약 팝업 / 회원가입 쿠폰 팝업
   5. 원클릭 예약 인원수 스테퍼 + 결제 금액 갱신
   6. 찜(좋아요) 버튼, 하단 탭 활성화
   7. 우측 하단 퀵메뉴 · 맨 위로 버튼 (전 페이지 공통 삽입)
   8. 홈 필터 바 (지역 · 날짜 · 스타일 선택 → 결과로 스크롤)
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  /* pages/ 하위 페이지인지에 따라 루트 상대 경로를 보정 (전 페이지 공통 삽입 스크립트이므로 필요) */
  const ROOT_PREFIX = location.pathname.includes('/pages/') ? '' : 'pages/';
  const HOST_CENTER_HREF = location.pathname.includes('/pages/') ? '../trippick-host/admin-camp.html' : 'trippick-host/admin-camp.html';
  /* 회원가입 쿠폰 팝업은 메인(홈) 화면에서만 노출 */
  const isHomePage = !location.pathname.includes('/pages/');

  /* 고객 사이트 ↔ 호스트 콘솔 왕복 동선. 모든 페이지에 공통 스크립트로 한 번만 추가한다. */
  document.querySelectorAll('.account-dropdown').forEach(menu => {
    if (menu.querySelector('[data-host-center-link]')) return;
    const link = document.createElement('a');
    link.href = HOST_CENTER_HREF;
    link.target = '_blank';
    link.rel = 'noopener';
    link.dataset.hostCenterLink = 'true';
    link.setAttribute('role', 'menuitem');
    link.textContent = '호스트 센터';
    menu.appendChild(link);
  });
  document.querySelectorAll('.mobile-menu').forEach(menu => {
    if (menu.querySelector('[data-host-center-link]')) return;
    const link = document.createElement('a');
    link.href = HOST_CENTER_HREF;
    link.target = '_blank';
    link.rel = 'noopener';
    link.dataset.hostCenterLink = 'true';
    link.className = 'mobile-menu-host';
    link.textContent = '호스트 센터';
    menu.appendChild(link);
  });

  /* ---------- 0-1. 위시리스트 · 리뷰 데이터 레이어 (전 페이지 공통, localStorage 기반) ----------
     이 사이트는 별도 서버가 없는 정적 사이트이므로, 찜/리뷰 모두 브라우저 localStorage에 저장해
     페이지를 이동해도(같은 브라우저 안에서는) 유지되도록 한다. */
  const WISHLIST_KEY = 'trippick_wishlist_v1';
  const REVIEWS_KEY = 'trippick_reviews_v1';
  /* 실제 예약·이용완료 이력을 조회할 백엔드가 없어, 리뷰관리에서 "이용 완료한 캠핑장만 작성 가능"
     조건을 흉내내기 위한 샘플 이용완료 목록. siteId는 아래 wishSlug 규칙과 동일하게 맞춘다. */
  const TRIPPICK_COMPLETED_STAYS = [
    { siteId: 'static-여주-블루마린-캠핑장', siteName: '여주 블루마린 캠핑장', stayDate: '2026-06-14' },
    { siteId: 'static-태안-선셋-캠프사이트', siteName: '태안 선셋 캠프사이트', stayDate: '2026-05-02' },
    { siteId: 'static-가평-포레스트-글램핑', siteName: '가평 포레스트 글램핑', stayDate: '2026-04-18' }
  ];

  function wishSlug(name){ return String(name || '').trim().replace(/\s+/g, '-'); }
  function getWishlist(){
    try { return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || []; } catch (e) { return []; }
  }
  function saveWishlist(list){
    try { localStorage.setItem(WISHLIST_KEY, JSON.stringify(list)); } catch (e) { /* 저장 실패는 무시 */ }
  }
  function toggleWishlist(id, snapshot){
    const list = getWishlist();
    const idx = list.findIndex(w => w.id === id);
    if (idx >= 0) { list.splice(idx, 1); saveWishlist(list); return false; }
    list.push(Object.assign({ id, addedAt: Date.now() }, snapshot));
    saveWishlist(list);
    return true;
  }
  function cardWishId(card){
    return card.dataset.wishId || ('static-' + wishSlug(card.querySelector('.p-name')?.textContent));
  }
  function cardSnapshot(card){
    /* link.href(프로퍼티)는 항상 완전한 절대 URL로 해석되므로, 나중에 마이페이지 위시리스트처럼
       다른 폴더 깊이의 페이지에서 렌더링해도 상대경로가 어긋나지 않는다 */
    const link = card.querySelector('.p-thumb') || card.querySelector('.p-name a');
    return {
      name: card.querySelector('.p-name')?.textContent.trim() || '이름 미상 캠핑장',
      region: card.querySelector('.p-region')?.textContent.trim() || '',
      desc: card.querySelector('.p-desc')?.textContent.trim() || '',
      img: card.querySelector('img')?.src || '',
      price: card.querySelector('.p-price .now')?.textContent.trim() || '',
      href: link ? link.href : ''
    };
  }
  function renderWishlistState(){
    const wished = getWishlist().map(w => w.id);
    document.querySelectorAll('.p-card').forEach(card => {
      const likeBtn = card.querySelector('.p-like');
      if (likeBtn) likeBtn.classList.toggle('on', wished.includes(cardWishId(card)));
    });
    const detailHead = document.querySelector('.detail-head');
    const detailLike = detailHead?.querySelector('.p-like');
    if (detailLike) {
      const id = document.body.dataset.siteId || ('static-' + wishSlug(detailHead.querySelector('h1')?.textContent));
      detailLike.classList.toggle('on', wished.includes(id));
    }
  }
  renderWishlistState();

  document.addEventListener('click', (e) => {
    const likeBtn = e.target.closest('.p-like');
    if (!likeBtn) return;
    e.preventDefault();
    const card = likeBtn.closest('.p-card');
    const detailHead = !card ? likeBtn.closest('.detail-head') : null;
    if (card) {
      const nowOn = toggleWishlist(cardWishId(card), cardSnapshot(card));
      likeBtn.classList.toggle('on', nowOn);
    } else if (detailHead) {
      const id = document.body.dataset.siteId || ('static-' + wishSlug(detailHead.querySelector('h1')?.textContent));
      const snapshot = {
        name: detailHead.querySelector('h1')?.textContent.trim() || '',
        region: detailHead.querySelector('.p-region')?.textContent.trim() || '',
        desc: '',
        img: document.querySelector('.dg-main img')?.src || '',
        price: document.querySelector('.detail-book-price .now')?.textContent.trim() || '',
        href: location.href
      };
      const nowOn = toggleWishlist(id, snapshot);
      likeBtn.classList.toggle('on', nowOn);
    }
  });

  function getAllReviews(){
    try { return JSON.parse(localStorage.getItem(REVIEWS_KEY)) || []; } catch (e) { return []; }
  }
  function saveReviews(list){
    try { localStorage.setItem(REVIEWS_KEY, JSON.stringify(list)); } catch (e) { /* 저장 실패는 무시 */ }
  }
  function getReviewsForSite(siteId){
    return getAllReviews().filter(r => r.siteId === siteId);
  }
  function addReview(entry){
    const list = getAllReviews();
    list.unshift(Object.assign({ id: 'rv' + Date.now(), author: '김트립', createdAt: Date.now() }, entry));
    saveReviews(list);
    return list;
  }
  window.trippick = {
    getWishlist, toggleWishlist, cardWishId, renderWishlistState,
    getAllReviews, getReviewsForSite, addReview, TRIPPICK_COMPLETED_STAYS
  };

  /* ---------- 0-2. 하단 탭 · 상담 팝업 · 쿠폰 팝업 (전 페이지 공통 삽입) ----------
     기존에는 각 HTML 파일마다 마크업이 복사되어 있어 상담/쿠폰 팝업이 index.html에만 존재하는
     등 페이지별로 빠지거나 어긋나는 문제가 있었다. 우측 하단 퀵메뉴(.fab-stack)와 동일한 방식으로
     JS에서 전 페이지에 동일하게 삽입해 하나의 소스만 유지하도록 한다. */
  function bottomTabHTML(){
    const homeHref = ROOT_PREFIX ? '#top' : '../index.html';
    return `
    <nav class="bottom-tab" aria-label="하단 탭">
      <button class="tab-item" type="button" data-href="${homeHref}">
        <svg class="icon" width="19" height="19" viewBox="0 0 22 22" fill="none"><path d="M3 10.5L11 3l8 7.5" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M5 9v9a1 1 0 001 1h3.5v-4h3v4H17a1 1 0 001-1V9" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
        <span>홈</span>
      </button>
      <button class="tab-item" type="button" data-href="${ROOT_PREFIX}types.html">
        <svg class="icon" width="19" height="19" viewBox="0 0 22 22" fill="none"><circle cx="10" cy="10" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M14.5 14.5L19 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <span>둘러보기</span>
      </button>
      <button class="tab-item" type="button" data-href="${ROOT_PREFIX}mypage-bookings.html">
        <svg class="icon" width="19" height="19" viewBox="0 0 22 22" fill="none"><rect x="3" y="4" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M3 9h16" stroke="currentColor" stroke-width="1.3"/></svg>
        <span>예약</span>
      </button>
      <button class="tab-item" type="button" data-href="${ROOT_PREFIX}mypage-wishlist.html">
        <svg class="icon" width="19" height="19" viewBox="0 0 22 22" fill="none"><path d="M11 18s-7-4.5-7-9a4 4 0 018 0 4 4 0 018 0c0 4.5-7 9-7 9z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
        <span>찜</span>
      </button>
      <button class="tab-item" type="button" data-href="${ROOT_PREFIX}mypage.html">
        <svg class="icon" width="19" height="19" viewBox="0 0 22 22" fill="none"><path d="M4 19.5c0-3.5 3.134-6.5 7-6.5s7 3 7 6.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="11" cy="7.5" r="3.5" stroke="currentColor" stroke-width="1.4"/></svg>
        <span>마이페이지</span>
      </button>
    </nav>`;
  }

  function couponPopupHTML(){
    return `
    <div class="site-popup" id="couponPopup">
      <div class="popup-inner coupon-popup-inner">
        <button class="popup-close" type="button" aria-label="닫기">
          <svg width="16" height="16" viewBox="0 0 22 22" fill="none"><path d="M4 4l14 14M18 4L4 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
        <div class="coupon-banner">
          <div class="coupon-banner-text">
            <span class="coupon-eyebrow">쿠폰받고 첫 예약 준비해요</span>
            <h2>첫 예약 누구나<br>즉시할인!</h2>
          </div>
          <div class="coupon-ticket">
            <span class="coupon-ticket-dl">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M10 3v10M6 9l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 16h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            </span>
            <span class="coupon-ticket-label">첫예약할인쿠폰</span>
            <strong class="coupon-ticket-value">10%<em>쿠폰</em></strong>
          </div>
        </div>
        <p class="coupon-desc">지금 회원가입하면 첫 예약에 바로 쓸 수 있는 10% 할인 쿠폰을 즉시 드립니다.</p>
        <div class="coupon-actions">
          <a href="${ROOT_PREFIX}signup.html" class="btn popup-cta">회원가입하고 쿠폰받기</a>
          <button type="button" class="coupon-skip" id="couponHideTodayBtn" data-popup-close>오늘 하루 안보기</button>
        </div>
      </div>
    </div>`;
  }

  function consultPopupHTML(){
    return `
    <div class="site-popup" id="consultPopup">
      <div class="popup-inner consult-popup-inner">
        <button class="popup-close" type="button" aria-label="닫기">
          <svg width="16" height="16" viewBox="0 0 22 22" fill="none"><path d="M4 4l14 14M18 4L4 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
        <span class="eyebrow"><i></i>AI Consulting</span>
        <h2>트립픽 AI가 궁금한 점에<br>바로 답변해드려요</h2>
        <div class="consult-hours">
          <div class="consult-hours-row"><span>AI 상담</span><strong>24시간 즉시 답변</strong></div>
          <div class="consult-hours-row"><span>추가 안내</span><strong>필요한 문의는 고객센터로 이어서 도와드려요</strong></div>
        </div>
        <div class="consult-chat">
          <div class="consult-chat-thread" id="consultChatThread"></div>
          <div class="consult-chat-status" id="consultChatStatus" style="display:none;"></div>
          <form class="consult-chat-bar" id="consultChatForm">
            <input type="text" id="consultChatInput" placeholder="AI에게 궁금한 점을 입력하세요" autocomplete="off" required>
            <button type="submit" class="btn">전송</button>
          </form>
        </div>
      </div>
    </div>`;
  }

  document.body.insertAdjacentHTML('beforeend', bottomTabHTML());
  if (isHomePage) document.body.insertAdjacentHTML('beforeend', couponPopupHTML());
  document.body.insertAdjacentHTML('beforeend', consultPopupHTML());

  function markActiveTab(){
    const path = location.pathname;
    const tabs = document.querySelectorAll('.bottom-tab .tab-item');
    if (!tabs.length) return;
    let idx = 0;
    if (/mypage-bookings\.html/.test(path)) idx = 2;
    else if (/mypage-wishlist\.html/.test(path)) idx = 3;
    else if (/mypage/.test(path)) idx = 4;
    else if (/types\.html|camping\.html|glamping\.html|caravan\.html|pet\.html|mountain\.html|sea\.html|new\.html|carbak\.html/.test(path)) idx = 1;
    tabs.forEach(t => t.classList.remove('active'));
    tabs[idx]?.classList.add('active');
  }
  markActiveTab();
  document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.bottom-tab .tab-item[data-href]');
    if (tabBtn) location.href = tabBtn.dataset.href;
  });

  /* ---------- 1. 모바일 메뉴 ---------- */
  const menuOpen = document.getElementById('menuOpen');
  const menuClose = document.getElementById('menuClose');
  const mobileMenu = document.getElementById('mobileMenu');

  function openMenu(){
    mobileMenu.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu(){
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  }
  menuOpen?.addEventListener('click', openMenu);
  menuClose?.addEventListener('click', closeMenu);
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

  /* ---------- 1-0. 모바일 메뉴 내 "커뮤니티" 하위 탭 아코디언 ---------- */
  mobileMenu?.querySelectorAll('.mobile-nav-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const group = toggle.closest('.mobile-nav-group');
      const isOpen = group.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });

  /* ---------- 1-1. 계정 메뉴 드롭다운 (Login / Join / My Page 통합) ---------- */
  const accountBtn = document.getElementById('accountBtn');
  const accountMenu = document.getElementById('accountMenu');

  accountBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = accountMenu.classList.toggle('open');
    accountBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
  document.addEventListener('click', (e) => {
    if (accountMenu && accountMenu.classList.contains('open') && !accountMenu.contains(e.target)) {
      accountMenu.classList.remove('open');
      accountBtn?.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && accountMenu?.classList.contains('open')) {
      accountMenu.classList.remove('open');
      accountBtn?.setAttribute('aria-expanded', 'false');
    }
  });

  /* ---------- 1-2. 상단 메뉴 서브메뉴 호버 유지 (CSS 보강용) ---------- */
  document.querySelectorAll('.nav-top > li').forEach(li => {
    if (!li.querySelector('.sub')) return;
    let closeTimer = null;
    const open = () => { clearTimeout(closeTimer); li.classList.add('sub-open'); };
    const close = () => { closeTimer = setTimeout(() => li.classList.remove('sub-open'), 150); };
    li.addEventListener('mouseenter', open);
    li.addEventListener('mouseleave', close);
    li.addEventListener('focusin', open);
    li.addEventListener('focusout', close);
  });

  /* ---------- 2. 헤더 스크롤 상태 + 스크롤 진행바 ---------- */
  const siteHeader = document.getElementById('siteHeader');
  let scrollProgressBar = null;
  if (siteHeader) {
    siteHeader.insertAdjacentHTML('beforeend',
      '<div class="scroll-progress-track" aria-hidden="true"><div class="scroll-progress-bar" id="scrollProgressBar"></div></div>');
    scrollProgressBar = document.getElementById('scrollProgressBar');
  }

  /* ---------- 2-0. 헤더 높이 → CSS 변수 (필터 바 sticky 위치 계산용) ---------- */
  function updateHeaderHeightVar(){
    if (!siteHeader) return;
    document.documentElement.style.setProperty('--header-h', siteHeader.offsetHeight + 'px');
  }
  updateHeaderHeightVar();
  window.addEventListener('resize', updateHeaderHeightVar);

  function updateHeaderState(){
    if (!siteHeader) return;
    siteHeader.classList.toggle('scrolled', window.scrollY > 40);
    if (scrollProgressBar) {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      scrollProgressBar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    }
  }
  updateHeaderState();
  window.addEventListener('scroll', updateHeaderState, { passive: true });
  window.addEventListener('resize', updateHeaderState);

  /* ---------- 2-1. 히어로 풀스크린 영상 패럴랙스 (스크롤 트리거 인터랙션) ---------- */
  const heroSection = document.querySelector('.hero');
  const heroVideoEl = document.querySelector('.hero-video');
  const heroContentEl = document.querySelector('.hero-content');

  function updateHeroParallax(){
    if (!heroSection) return;
    const rect = heroSection.getBoundingClientRect();
    const heroHeight = heroSection.offsetHeight || 1;
    const progress = Math.min(1, Math.max(0, -rect.top / heroHeight));
    if (heroVideoEl) heroVideoEl.style.transform = `scale(${(1 + progress * 0.12).toFixed(3)}) translateY(${Math.round(progress * 30)}px)`;
    if (heroContentEl) {
      heroContentEl.style.transform = `translateY(${Math.round(progress * 60)}px)`;
      heroContentEl.style.opacity = (1 - progress * 0.9).toFixed(2);
    }
  }
  updateHeroParallax();
  window.addEventListener('scroll', updateHeroParallax, { passive: true });
  window.addEventListener('resize', updateHeroParallax);

  /* ---------- 2-3. 섹션 제목 마스크 리빌 (스크롤 진입 시 아래→위로 슬라이드) ---------- */
  document.querySelectorAll('.section-head h2, .intro-copy h2').forEach(h => {
    h.classList.add('head-mask');
    h.innerHTML = `<span class="head-mask-inner">${h.innerHTML}</span>`;
  });

  /* ---------- 2-4. 이미지 블러 인 리빌 (스토리 카드 · 인트로 비주얼) ---------- */
  const blurTargets = document.querySelectorAll('.story-thumb img, .intro-media, .video-thumb img');
  if ('IntersectionObserver' in window && blurTargets.length) {
    const blurIo = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('blur-in');
          blurIo.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });
    blurTargets.forEach(el => { el.classList.add('blur-target'); blurIo.observe(el); });
  } else {
    blurTargets.forEach(el => el.classList.add('blur-target', 'blur-in'));
  }

  /* ---------- 2-5. About Trippick 일러스트 마우스 틸트 (포인터 지원 기기 전용) ---------- */
  const introMediaEl = document.querySelector('.intro-media');
  const introSceneEl = document.querySelector('.intro-scene');
  if (introMediaEl && introSceneEl && window.matchMedia('(pointer: fine)').matches) {
    introMediaEl.addEventListener('mousemove', (e) => {
      const rect = introMediaEl.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      introSceneEl.style.transform = `rotateY(${(px * 10).toFixed(2)}deg) rotateX(${(-py * 10).toFixed(2)}deg) scale(1.03)`;
    });
    introMediaEl.addEventListener('mouseleave', () => {
      introSceneEl.style.transform = '';
    });
  }

  /* ---------- 3. 스크롤 리빌 ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* ---------- 4. 팝업 공통 ---------- */
  function openPopup(popup){
    popup.style.display = 'flex';
    requestAnimationFrame(() => popup.classList.add('open'));
  }
  function closePopup(popup){
    popup.style.display = 'none';
    popup.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* 위임(delegated) 방식으로 바인딩 — 라이트박스처럼 나중에 JS로 추가되는 .site-popup/.popup-close도
     별도 재바인딩 없이 항상 닫기 버튼·바깥영역 클릭이 정상 동작하도록 함 */
  document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('.popup-close, [data-popup-close]');
    if (closeBtn) { closePopup(closeBtn.closest('.site-popup')); return; }
    if (e.target.classList && e.target.classList.contains('site-popup')) closePopup(e.target);
  });

  /* ---------- 회원가입 첫예약 쿠폰 팝업 (홈 진입 시 1회) ---------- */
  const couponPopup = document.getElementById('couponPopup');
  const couponHideTodayBtn = document.getElementById('couponHideTodayBtn');
  const COUPON_HIDE_KEY = 'trippickCouponHideUntil';
  const todayStr = () => new Date().toDateString();

  if (couponPopup && localStorage.getItem(COUPON_HIDE_KEY) !== todayStr()) {
    setTimeout(() => {
      openPopup(couponPopup);
    }, 900);
  }
  if (couponHideTodayBtn) {
    couponHideTodayBtn.addEventListener('click', () => {
      localStorage.setItem(COUPON_HIDE_KEY, todayStr());
    });
  }

  /* ---------- About Trippick 통계 숫자 카운트업 ---------- */
  const countEls = document.querySelectorAll('.intro-stats strong[data-count-to]');
  if (countEls.length) {
    const animateCount = (el) => {
      const target = parseFloat(el.dataset.countTo);
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      const suffix = el.dataset.suffix || '';
      const duration = 1400;
      const start = performance.now();
      function tick(now){
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const value = target * eased;
        el.textContent = (decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString()) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    };
    if ('IntersectionObserver' in window) {
      const countIo = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countIo.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      countEls.forEach(el => countIo.observe(el));
    } else {
      countEls.forEach(animateCount);
    }
  }

  /* ---------- FAQ 아코디언 열림 상태 아이콘 전환은 CSS만으로 처리 (별도 JS 불필요) ---------- */

  /* ---------- 7. 우측 하단 퀵메뉴 · 맨 위로 (전 페이지 공통) ---------- */
  document.body.insertAdjacentHTML('beforeend', `
    <div class="fab-stack" id="fabStack">
      <button type="button" class="fab-top" id="fabTopBtn" aria-label="맨 위로 이동">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 15V5M5 9l5-5 5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="fab-quick-list" id="fabQuickList">
              <a href="${ROOT_PREFIX}login.html" class="fab-quick-item">
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none"><path d="M9 4H5a1 1 0 00-1 1v12a1 1 0 001 1h4M14 15l4-4-4-4M18 11H8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="fab-quick-label">로그인</span>
        </a>
        <a href="${ROOT_PREFIX}mypage.html" class="fab-quick-item">
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none"><rect x="3" y="4" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M3 9h16" stroke="currentColor" stroke-width="1.3"/></svg>
          <span class="fab-quick-label">예약확인</span>
        </a>
        <button type="button" class="fab-quick-item" id="fabConsultBtn">
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none"><path d="M3 5.5A2.5 2.5 0 015.5 3h11A2.5 2.5 0 0119 5.5v6A2.5 2.5 0 0116.5 14H9l-4.5 4v-4H5.5A2.5 2.5 0 013 11.5v-6z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
          <span class="fab-quick-label">AI 상담</span>
        </button>
      </div>
    </div>
  `);

  const fabTopBtn = document.getElementById('fabTopBtn');

  function updateFabTop(){
    fabTopBtn?.classList.toggle('show', window.scrollY > 400);
  }
  updateFabTop();
  window.addEventListener('scroll', updateFabTop, { passive: true });

  fabTopBtn?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* AI 상담 팝업: 24시간 즉시 답변하는 말풍선 채팅형. 대화는 브라우저에 저장되어 다시 열어도 이어진다. */
  (function initConsultChat(){
    const consultPopup = document.getElementById('consultPopup');
    const thread = document.getElementById('consultChatThread');
    const statusEl = document.getElementById('consultChatStatus');
    const form = document.getElementById('consultChatForm');
    const input = document.getElementById('consultChatInput');
    if (!consultPopup || !thread || !form || !input) return;

    const STORE_KEY = 'trippick_ai_consult_chat_v2';
    const GREETING = '안녕하세요! 트립픽 AI 상담이에요. 캠핑장, 예약, 결제, 취소에 관해 무엇이든 물어보세요.';
    function buildAiReply(question) {
      const text = question.toLowerCase();
      if (/취소|환불/.test(text)) return '예약 취소와 환불 기준은 캠핑장과 이용일까지 남은 기간에 따라 달라요. 마이페이지 예약내역에서 해당 예약의 취소 규정을 확인해주세요.';
      if (/결제|카드|카카오|네이버|토스/.test(text)) return '신용·체크카드와 간편결제를 이용할 수 있어요. 결제 단계에서 원하는 수단을 선택하면 됩니다.';
      if (/쿠폰|할인/.test(text)) return '신규 회원에게 첫 예약 10% 할인 쿠폰을 드려요. 가입 후 마이페이지의 내 쿠폰에서 확인할 수 있습니다.';
      if (/반려|애견|강아지|펫/.test(text)) return '반려동물 동반 가능 여부는 캠핑장마다 달라요. 상세 페이지의 이용 안내를 확인하거나 반려동물 필터를 이용해주세요.';
      if (/예약|날짜|인원/.test(text)) return '캠핑장을 선택한 뒤 날짜와 인원을 입력하면 예약 가능한 옵션을 확인할 수 있어요.';
      return '문의 내용을 확인했어요. 캠핑장 이름과 이용 날짜를 함께 알려주시면 더 정확하게 안내해드릴게요.';
    }

    function loadState(){
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) { /* 저장소 파손 시 새로 시작 */ }
      return { messages: [] };
    }
    function saveState(){
      try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 저장 실패는 무시 */ }
    }

    let state = loadState();
    let replyTimer = null;

    function nowLabel(){
      const d = new Date();
      return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }

    function bubbleHTML(msg){
      const role = msg.role === 'user' ? 'user' : 'host';
      return `
        <div class="chat-bubble chat-bubble-${role}">
          <p>${gcEscapeHtml(msg.text)}</p>
          <span class="chat-bubble-time">${gcEscapeHtml(msg.time)}</span>
        </div>`;
    }

    function renderThread(){
      thread.innerHTML = state.messages.map(bubbleHTML).join('');
      thread.scrollTop = thread.scrollHeight;
    }

    function setStatus(text, mode){
      if (!text) { statusEl.style.display = 'none'; return; }
      statusEl.style.display = 'flex';
      statusEl.className = 'consult-chat-status' + (mode ? ' ' + mode : '');
      statusEl.innerHTML = `<span class="consult-status-dot"></span>${gcEscapeHtml(text)}`;
    }

    function updatePlaceholder(){
      input.placeholder = 'AI에게 궁금한 점을 입력하세요';
    }

    function pushMessage(role, text){
      const msg = { role, text, time: nowLabel() };
      state.messages.push(msg);
      saveState();
      thread.insertAdjacentHTML('beforeend', bubbleHTML(msg));
      thread.scrollTop = thread.scrollHeight;
    }

    function ensureGreeting(){
      if (!state.messages.length) {
        state.messages.push({ role: 'host', text: GREETING, time: nowLabel() });
        saveState();
      }
      renderThread();
      updatePlaceholder();
    }

    document.querySelectorAll('#fabConsultBtn, #faqConsultBtn').forEach(btn => {
      btn.addEventListener('click', () => {
        ensureGreeting();
        openPopup(consultPopup);
        setTimeout(() => input.focus(), 250);
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      clearTimeout(replyTimer);

      pushMessage('user', text);
      setStatus('AI가 답변을 작성하고 있어요', 'pending');
      replyTimer = setTimeout(() => {
        pushMessage('host', buildAiReply(text));
        setStatus('AI 답변 완료', 'done');
      }, 450);
    });
  })();

  /* ---------- 8-0. 고캠핑(한국관광공사) 공공데이터 공통 로더 ----------
     필터 검색과 "이번 주 가장 많이 찾은 캠핑장" 섹션이 같은 데이터를 함께 사용하도록
     세션 동안 1회만 요청하고 재사용합니다. */
  const GOCAMPING_SERVICE_KEY = 'c306dc04fc05af17071334c0c38412e0ed9c5b7066c10dfd5bfffeda36aeb8a4';
  const GOCAMPING_ENDPOINT = 'https://apis.data.go.kr/B551011/GoCamping/basedList';
  const GOCAMPING_FALLBACK_IMG = 'https://images.unsplash.com/photo-1631635589499-afd87d52bf64?auto=format&fit=crop&w=600&q=70';
  let goCampingListPromise = null;

  function loadGoCampingList(){
    if (!goCampingListPromise) {
      const url = `${GOCAMPING_ENDPOINT}?serviceKey=${GOCAMPING_SERVICE_KEY}&numOfRows=300&pageNo=1&MobileOS=ETC&MobileApp=Trippick&_type=json`;
      goCampingListPromise = fetch(url)
        .then(res => {
          if (!res.ok) throw new Error('고캠핑 API 요청 실패 (' + res.status + ')');
          return res.json();
        })
        .then(data => {
          const header = data && data.response && data.response.header;
          if (header && header.resultCode && header.resultCode !== '0000') {
            throw new Error(header.resultMsg || '고캠핑 API 오류');
          }
          const items = data && data.response && data.response.body && data.response.body.items && data.response.body.items.item;
          return items ? (Array.isArray(items) ? items : [items]) : [];
        })
        .catch(err => { goCampingListPromise = null; throw err; }); // 실패 시 다음 시도에서 재요청되도록 캐시 해제
    }
    return goCampingListPromise;
  }

  function gcEscapeHtml(str){
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function gcShortAddr(addr1){
    return addr1 ? addr1.split(' ').slice(0, 2).join(' ') : '주소 정보 없음';
  }

  /* 지역 select의 값 → 고캠핑 응답의 doNm(시도명)에 포함될 만한 키워드 매핑 */
  const GC_REGION_MATCH = {
    'seoul-gg': ['서울', '경기'],
    'gangwon': ['강원'],
    'chungcheong': ['충북', '충남', '충청'],
    'jeolla': ['전북', '전남', '전라'],
    'gyeongsang': ['경북', '경남', '경상'],
    'jeju': ['제주']
  };
  function gcMatchRegion(item, region){
    if (!region || region === 'all') return true;
    const keys = GC_REGION_MATCH[region] || [];
    const doNm = item.doNm || '';
    return keys.some(k => doNm.includes(k));
  }
  /* 스타일 select의 값 → induty(시설유형) 필드 기준 매칭
     * 참고: 고캠핑 데이터에는 "차박" 전용 필드가 없어 일반/자동차야영장으로 근사합니다. */
  function gcMatchStyle(item, style){
    if (!style || style === 'all') return true;
    const induty = item.induty || '';
    switch (style) {
      case 'camping': return /야영장/.test(induty) && !/글램핑|카라반/.test(induty);
      case 'glamping': return /글램핑/.test(induty) || Number(item.glampSiteCo) > 0;
      case 'caravan': return /카라반/.test(induty) || Number(item.caravSiteCo) > 0 || Number(item.indvdlCaravSiteCo) > 0;
      case 'carbak': return /야영장/.test(induty);
      default: return true;
    }
  }

  const goCampingRegistry = new Map();
  const RECENT_SITES_KEY = 'trippick_recent_sites_v1';
  const READINESS_KEY = 'trippick_readiness_v1';

  function gcItemKey(item){
    return encodeURIComponent(String(item.contentId || wishSlug(item.facltNm || 'camp')));
  }
  function registerGoCampingItem(item){
    const key = gcItemKey(item);
    goCampingRegistry.set(key, item);
    return key;
  }
  function gcFacilityText(item){
    return [item.sbrsCl, item.posblFcltyCl, item.posblFcltyEtc, item.intro, item.lineIntro, item.animalCmgCl, item.aninmalCmgCl]
      .filter(Boolean).join(' ');
  }
  function gcIsPetFriendly(item){
    return item.animalCmgCl === '가능' || item.aninmalCmgCl === '가능' || /반려동물|애견|펫\s?동반/.test(gcFacilityText(item));
  }
  function gcMatchesFacility(item, facility){
    const text = gcFacilityText(item);
    if (facility === '반려동물') return gcIsPetFriendly(item);
    if (facility === '와이파이') return /와이파이|무선\s?인터넷|wifi/i.test(text);
    if (facility === '물놀이') return /물놀이|수영장|계곡|해수욕|해변/.test(text + ' ' + (item.addr1 || ''));
    return text.includes(facility);
  }
  function gcIsBeginnerFriendly(item){
    const text = gcFacilityText(item);
    return /전기/.test(text) && /샤워|온수/.test(text) && /화장실|화장/.test(text);
  }
  function gcFeatureTags(item){
    const text = gcFacilityText(item);
    const tags = [];
    if (gcIsBeginnerFriendly(item)) tags.push('초보 안심');
    if (gcIsPetFriendly(item)) tags.push('반려동물');
    if (/전기/.test(text)) tags.push('전기');
    if (/온수|샤워/.test(text)) tags.push('온수·샤워');
    if (/물놀이|수영장|계곡|해수욕|해변/.test(text + ' ' + (item.addr1 || ''))) tags.push('물놀이');
    return tags.slice(0, 3);
  }
  window.trippickOpenSiteById = function(key){
    const item = goCampingRegistry.get(key);
    if (!item) return;
    try { sessionStorage.setItem('trippick_selected_site', JSON.stringify(item)); } catch (e) { /* 저장 실패는 무시 */ }
  };

  function gcResultCardHTML(item){
    const key = registerGoCampingItem(item);
    const name = gcEscapeHtml(item.facltNm || '이름 미상 캠핑장');
    const img = item.firstImageUrl ? gcEscapeHtml(item.firstImageUrl) : GOCAMPING_FALLBACK_IMG;
    const region = gcEscapeHtml(gcShortAddr(item.addr1));
    const desc = gcEscapeHtml((item.induty || '캠핑장').split(',').slice(0, 2).join(' · '));
    const tel = item.tel ? gcEscapeHtml(item.tel) : '전화번호 미등록';
    const cid = gcEscapeHtml(key);
    const href = `${ROOT_PREFIX}detail.html?src=api&contentId=${cid}`;
    const tags = gcFeatureTags(item).map(tag => `<span>${gcEscapeHtml(tag)}</span>`).join('');
    return `
        <article class="p-card result-card" data-wish-id="api-${cid}" data-compare-id="${cid}">
          <a href="${href}" class="p-thumb" onclick="window.trippickOpenSiteById('${cid}')">
            <img src="${img}" alt="${name}" loading="lazy" onerror="this.onerror=null;this.src='${GOCAMPING_FALLBACK_IMG}';">
            <span class="p-tag p-tag-alt">공공데이터</span>
            <button class="p-like" aria-label="${name} 찜하기" type="button"><svg width="14" height="14" viewBox="0 0 22 22" fill="none"><path d="M11 18s-7-4.5-7-9a4 4 0 018 0 4 4 0 018 0c0 4.5-7 9-7 9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></button>
          </a>
          <div class="p-body">
            <p class="p-region">${region}</p>
            <h3 class="p-name"><a href="${href}" onclick="window.trippickOpenSiteById('${cid}')">${name}</a></h3>
            <p class="p-desc">${desc}</p>
            <div class="result-meta">${tags || '<span>정보 확인중</span>'}</div>
            <div class="p-price"><span class="now" style="font-size:12px; font-weight:500; color:var(--text-mute);">${tel}</span></div>
            <div class="result-card-actions">
              <a href="${href}" onclick="window.trippickOpenSiteById('${cid}')">상세 보기</a>
              <button class="compare-toggle" type="button" aria-pressed="false" onclick="window.trippickToggleCompare('${cid}')">+ 비교</button>
            </div>
          </div>
        </article>`;
  }

  /* ---------- 8. 홈 고급 검색 (지역 · 날짜 · 스타일 · 시설 · 정렬) ---------- */
  const checkinInput = document.getElementById('checkinInput');
  const checkoutInput = document.getElementById('checkoutInput');
  const filterAssist = document.getElementById('filterAssist');
  const todayIso = (() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  })();
  if (checkinInput) checkinInput.min = todayIso;
  if (checkoutInput) checkoutInput.min = todayIso;
  checkinInput?.addEventListener('change', () => {
    if (!checkoutInput) return;
    checkoutInput.min = checkinInput.value || todayIso;
    if (checkoutInput.value && checkoutInput.value <= checkinInput.value) checkoutInput.value = '';
  });

  const filterResultsSection = document.getElementById('filterResults');
  const filterResultsGrid = document.getElementById('filterResultsGrid');
  const filterResultsTitle = document.getElementById('filterResultsTitle');
  const filterResultsNote = document.getElementById('filterResultsNote');
  const filterResultsMore = document.getElementById('filterResultsMore');
  const activeFilterChips = document.getElementById('activeFilterChips');
  let currentFilterResults = [];
  let renderedFilterCount = 0;
  const FILTER_PAGE_SIZE = 8;

  function collectAdvancedFilters(){
    return {
      keyword: (document.getElementById('keywordInput')?.value || '').trim().toLowerCase(),
      guests: document.getElementById('guestInput')?.value || '2',
      sort: document.getElementById('sortInput')?.value || 'recommend',
      facilities: [...document.querySelectorAll('#facilityFilters input:checked')].map(input => input.value),
      beginner: !!document.getElementById('beginnerInput')?.checked
    };
  }
  function updateAdvancedCount(){
    const filters = collectAdvancedFilters();
    const count = filters.facilities.length + (filters.keyword ? 1 : 0) + (filters.beginner ? 1 : 0) + (filters.guests !== '2' ? 1 : 0) + (filters.sort !== 'recommend' ? 1 : 0);
    const el = document.getElementById('advancedFilterCount');
    if (el) el.textContent = `선택 ${count}`;
  }
  document.querySelectorAll('#advancedFilter input, #advancedFilter select').forEach(el => {
    el.addEventListener(el.type === 'search' ? 'input' : 'change', updateAdvancedCount);
  });

  function resetAdvancedFilters(){
    const keyword = document.getElementById('keywordInput');
    const guests = document.getElementById('guestInput');
    const sort = document.getElementById('sortInput');
    const beginner = document.getElementById('beginnerInput');
    if (keyword) keyword.value = '';
    if (guests) guests.value = '2';
    if (sort) sort.value = 'recommend';
    if (beginner) beginner.checked = false;
    document.querySelectorAll('#facilityFilters input').forEach(input => { input.checked = false; });
    updateAdvancedCount();
  }
  document.getElementById('advancedFilterReset')?.addEventListener('click', resetAdvancedFilters);

  function renderActiveFilters(regionLabel, styleLabel, advanced, checkin, checkout){
    if (!activeFilterChips) return;
    const chips = [regionLabel, styleLabel, `${advanced.guests}명`];
    if (checkin && checkout) chips.push(`${checkin} → ${checkout}`);
    if (advanced.keyword) chips.push(`“${advanced.keyword}”`);
    if (advanced.beginner) chips.push('초보 안심');
    chips.push(...advanced.facilities);
    activeFilterChips.innerHTML = chips.map(chip => `<span>${gcEscapeHtml(chip)}</span>`).join('');
  }
  function renderFilterResultPage(reset){
    if (!filterResultsGrid || !filterResultsMore) return;
    if (reset) {
      renderedFilterCount = 0;
      filterResultsGrid.innerHTML = '';
    }
    const next = currentFilterResults.slice(renderedFilterCount, renderedFilterCount + FILTER_PAGE_SIZE);
    filterResultsGrid.insertAdjacentHTML('beforeend', next.map(gcResultCardHTML).join(''));
    renderedFilterCount += next.length;
    filterResultsMore.hidden = renderedFilterCount >= currentFilterResults.length;
    if (!filterResultsMore.hidden) filterResultsMore.textContent = `결과 더 보기 (${currentFilterResults.length - renderedFilterCount}곳 남음)`;
    renderWishlistState();
    syncCompareButtons();
  }
  filterResultsMore?.addEventListener('click', () => renderFilterResultPage(false));

  document.getElementById('homeFilterSubmit')?.addEventListener('click', () => {
    const regionSelect = document.getElementById('regionInput');
    const styleSelect = document.getElementById('styleInput');
    const region = regionSelect?.value;
    const style = styleSelect?.value;
    const checkin = checkinInput?.value;
    const checkout = checkoutInput?.value;
    const advanced = collectAdvancedFilters();

    if (!region || !style) {
      document.getElementById('homeFilterBar')?.classList.add('shake');
      if (filterAssist) filterAssist.textContent = '지역과 스타일을 먼저 선택해주세요.';
      setTimeout(() => document.getElementById('homeFilterBar')?.classList.remove('shake'), 500);
      return;
    }
    if ((checkin && !checkout) || (!checkin && checkout)) {
      if (filterAssist) filterAssist.textContent = '체크인과 체크아웃 날짜를 모두 선택해주세요.';
      (checkin ? checkoutInput : checkinInput)?.focus();
      return;
    }
    if (checkin && checkout && checkout <= checkin) {
      if (filterAssist) filterAssist.textContent = '체크아웃은 체크인 다음 날부터 선택할 수 있어요.';
      checkoutInput?.focus();
      return;
    }
    if (!filterResultsSection || !filterResultsGrid) return;

    const regionLabel = regionSelect.options[regionSelect.selectedIndex]?.textContent || '전체 지역';
    const styleLabel = styleSelect.options[styleSelect.selectedIndex]?.textContent || '전체 스타일';
    filterResultsSection.style.display = '';
    filterResultsTitle.textContent = '캠핑장을 찾고 있습니다…';
    filterResultsNote.textContent = '선택한 조건을 공공데이터와 대조하고 있습니다.';
    filterResultsGrid.innerHTML = '<p style="grid-column:1/-1; color:var(--text-mute); font-size:13px;">한국관광공사 고캠핑 공공데이터에서 검색 중입니다…</p>';
    if (filterResultsMore) filterResultsMore.hidden = true;
    filterResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    loadGoCampingList().then(list => {
      const keywordMatch = item => {
        if (!advanced.keyword) return true;
        return [item.facltNm, item.addr1, item.induty, gcFacilityText(item)].filter(Boolean).join(' ').toLowerCase().includes(advanced.keyword);
      };
      currentFilterResults = list.filter(item => item.facltNm && gcMatchRegion(item, region) && gcMatchStyle(item, style)
        && keywordMatch(item)
        && advanced.facilities.every(facility => gcMatchesFacility(item, facility))
        && (!advanced.beginner || gcIsBeginnerFriendly(item)));
      if (advanced.sort === 'name') currentFilterResults.sort((a, b) => String(a.facltNm).localeCompare(String(b.facltNm), 'ko'));
      if (advanced.sort === 'recent') currentFilterResults.sort((a, b) => Number(b.createdtime || 0) - Number(a.createdtime || 0));
      if (advanced.sort === 'recommend') currentFilterResults.sort((a, b) => (Number(!!b.firstImageUrl) + Number(gcIsBeginnerFriendly(b))) - (Number(!!a.firstImageUrl) + Number(gcIsBeginnerFriendly(a))));

      filterResultsTitle.textContent = `${regionLabel} · ${styleLabel} ${currentFilterResults.length}곳`;
      const nights = checkin && checkout ? Math.round((new Date(checkout) - new Date(checkin)) / 86400000) : 0;
      filterResultsNote.textContent = nights
        ? `${advanced.guests}명 · ${nights}박 일정입니다. 실제 잔여 사이트와 요금은 캠핑장 확인이 필요합니다.`
        : `${advanced.guests}명 기준으로 비교하기 좋은 캠핑장을 모았습니다. 실제 잔여 사이트는 캠핑장 확인이 필요합니다.`;
      renderActiveFilters(regionLabel, styleLabel, advanced, checkin, checkout);
      if (filterAssist) filterAssist.textContent = `${currentFilterResults.length}곳을 찾았습니다. 최대 3곳까지 비교함에 담을 수 있어요.`;
      if (!currentFilterResults.length) {
        filterResultsGrid.innerHTML = '<p style="grid-column:1/-1; color:var(--text-mute); font-size:13px;">조건에 맞는 캠핑장을 찾지 못했습니다. 필수 시설을 한두 개 줄여 다시 검색해보세요.</p>';
        if (filterResultsMore) filterResultsMore.hidden = true;
        return;
      }
      renderFilterResultPage(true);
    }).catch(err => {
      filterResultsTitle.textContent = '검색 결과를 불러오지 못했습니다';
      filterResultsNote.textContent = '공공데이터 연결이 잠시 원활하지 않습니다.';
      filterResultsGrid.innerHTML = '<p style="grid-column:1/-1; color:var(--text-mute); font-size:13px;">잠시 후 다시 시도하거나 아래 추천 캠핑장을 확인해주세요.</p>';
      console.warn('[홈 필터 검색]', err && err.message ? err.message : err);
    });
  });

  document.getElementById('filterResultsReset')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (filterResultsSection) filterResultsSection.style.display = 'none';
    const regionSelect = document.getElementById('regionInput');
    const styleSelect = document.getElementById('styleInput');
    if (regionSelect) regionSelect.selectedIndex = 0;
    if (styleSelect) styleSelect.selectedIndex = 0;
    if (checkinInput) checkinInput.value = '';
    if (checkoutInput) checkoutInput.value = '';
    resetAdvancedFilters();
    if (activeFilterChips) activeFilterChips.innerHTML = '';
    if (filterAssist) filterAssist.textContent = '지역과 스타일을 고른 뒤, 필요한 시설까지 한 번에 비교해보세요.';
  });

  /* ---------- 8-1. 캠핑장 비교함 (최대 3곳) ---------- */
  let compareIds = [];
  const compareTray = document.getElementById('compareTray');
  function syncCompareButtons(){
    document.querySelectorAll('.compare-toggle').forEach(button => {
      const id = button.closest('[data-compare-id]')?.dataset.compareId;
      const on = compareIds.includes(id);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      button.textContent = on ? '✓ 비교 중' : '+ 비교';
    });
  }
  function renderCompareTray(){
    if (!compareTray) return;
    compareTray.hidden = compareIds.length === 0;
    const count = document.getElementById('compareTrayCount');
    const items = document.getElementById('compareTrayItems');
    const open = document.getElementById('compareOpen');
    if (count) count.textContent = `${compareIds.length} / 3`;
    if (items) items.innerHTML = compareIds.map(id => {
      const item = goCampingRegistry.get(id);
      return `<span class="compare-chip"><span>${gcEscapeHtml(item?.facltNm || '캠핑장')}</span><button type="button" data-compare-remove="${gcEscapeHtml(id)}" aria-label="비교함에서 삭제">×</button></span>`;
    }).join('');
    if (open) open.disabled = compareIds.length < 2;
    syncCompareButtons();
  }
  window.trippickToggleCompare = function(id){
    if (!id) return;
    if (compareIds.includes(id)) compareIds = compareIds.filter(value => value !== id);
    else if (compareIds.length < 3) compareIds.push(id);
    else if (filterAssist) filterAssist.textContent = '비교함에는 최대 3곳까지 담을 수 있어요.';
    renderCompareTray();
  };
  document.addEventListener('click', e => {
    const remove = e.target.closest('[data-compare-remove]');
    if (remove) {
      compareIds = compareIds.filter(id => id !== remove.dataset.compareRemove);
      renderCompareTray();
    }
  });
  document.getElementById('compareClear')?.addEventListener('click', () => { compareIds = []; renderCompareTray(); });

  function compareValue(item, row){
    if (row === 'region') return item.addr1 || '주소 정보 없음';
    if (row === 'type') return item.induty || '캠핑장';
    if (row === 'facility') return (item.sbrsCl || '등록 정보 없음').split(',').slice(0, 6).join(' · ');
    if (row === 'pet') return gcIsPetFriendly(item) ? '동반 가능' : '등록 정보 없음';
    if (row === 'beginner') return gcIsBeginnerFriendly(item) ? '추천' : '시설 추가 확인 필요';
    if (row === 'tel') return item.tel || '전화번호 미등록';
    return '';
  }
  document.getElementById('compareOpen')?.addEventListener('click', () => {
    const selected = compareIds.map(id => ({ id, item: goCampingRegistry.get(id) })).filter(entry => entry.item);
    if (selected.length < 2) return;
    const labels = [['region','위치'],['type','유형'],['facility','주요 시설'],['pet','반려동물'],['beginner','초보 추천'],['tel','문의']];
    const table = `
      <table class="compare-table">
        <thead><tr><th>비교 기준</th>${selected.map(({ id, item }) => `<th><img src="${gcEscapeHtml(item.firstImageUrl || GOCAMPING_FALLBACK_IMG)}" alt=""><span class="compare-name">${gcEscapeHtml(item.facltNm)}</span><a class="compare-go" href="${ROOT_PREFIX}detail.html?src=api&contentId=${gcEscapeHtml(id)}" onclick="window.trippickOpenSiteById('${gcEscapeHtml(id)}')">상세 보기</a></th>`).join('')}</tr></thead>
        <tbody>${labels.map(([key,label]) => `<tr><th>${label}</th>${selected.map(({ item }) => `<td>${gcEscapeHtml(compareValue(item,key))}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`;
    const wrap = document.getElementById('compareTableWrap');
    if (wrap) wrap.innerHTML = table;
    openPopup(document.getElementById('comparePopup'));
  });

  /* ---------- 8-2. 취향 매치 추천 ---------- */
  document.getElementById('tripMatchForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const form = e.currentTarget;
    const nature = new FormData(form).get('nature');
    const comfort = new FormData(form).get('comfort');
    const party = new FormData(form).get('party');
    const result = document.getElementById('tripMatchResult');
    if (!result) return;
    result.hidden = false;
    result.innerHTML = '<div class="match-loading">취향과 공공데이터를 매칭하고 있어요…</div>';
    loadGoCampingList().then(list => {
      const naturePattern = nature === 'ocean' ? /바다|해변|해수욕|오션|노을/ : nature === 'mountain' ? /산|마운틴|고원|전망/ : /숲|계곡|자연|휴양림/;
      const scored = list.filter(item => item.facltNm).map(item => {
        const text = [item.facltNm, item.addr1, item.intro, item.lineIntro, gcFacilityText(item)].filter(Boolean).join(' ');
        let score = 0;
        if (naturePattern.test(text)) score += 4;
        if (gcMatchStyle(item, comfort)) score += 5;
        if (party === 'pet' && gcIsPetFriendly(item)) score += 5;
        if (party === 'family' && /놀이터|물놀이|수영장|키즈/.test(text)) score += 4;
        if (party === 'couple' && /조용|힐링|노을|감성|뷰/.test(text)) score += 3;
        if (item.firstImageUrl) score += 1;
        if (gcIsBeginnerFriendly(item)) score += 2;
        return { item, score };
      }).sort((a,b) => b.score - a.score).slice(0,3);
      const natureLabel = { forest:'숲·계곡', ocean:'바다·노을', mountain:'산·전망' }[nature];
      result.innerHTML = `<div class="match-result-head"><strong>${gcEscapeHtml(natureLabel)} 취향 추천</strong><span>상위 ${scored.length}곳</span></div><div class="match-result-list">${scored.map(({item,score}) => {
        const id = registerGoCampingItem(item);
        return `<article class="match-mini-card"><img src="${gcEscapeHtml(item.firstImageUrl || GOCAMPING_FALLBACK_IMG)}" alt=""><div><strong>${gcEscapeHtml(item.facltNm)}</strong><small>${gcEscapeHtml(gcShortAddr(item.addr1))} · 매치 ${Math.min(99,70 + score)}%</small></div><a href="${ROOT_PREFIX}detail.html?src=api&contentId=${gcEscapeHtml(id)}" onclick="window.trippickOpenSiteById('${gcEscapeHtml(id)}')">자세히</a></article>`;
      }).join('')}</div>`;
    }).catch(() => {
      result.innerHTML = `<div class="match-loading">추천 데이터를 잠시 불러오지 못했어요. <a href="${ROOT_PREFIX}types.html" class="link-underline">유형별 캠핑장 보기</a></div>`;
    });
  });

  /* ---------- 8-3. 첫 캠핑 준비도 ---------- */
  (function initReadiness(){
    const listEl = document.getElementById('readinessList');
    if (!listEl) return;
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(READINESS_KEY)) || []; } catch (e) { saved = []; }
    listEl.querySelectorAll('input').forEach(input => { input.checked = saved.includes(input.value); });
    function render(){
      const inputs = [...listEl.querySelectorAll('input')];
      const checked = inputs.filter(input => input.checked).map(input => input.value);
      const percent = Math.round((checked.length / inputs.length) * 100);
      try { localStorage.setItem(READINESS_KEY, JSON.stringify(checked)); } catch (e) { /* 저장 실패 무시 */ }
      document.getElementById('readinessRing')?.style.setProperty('--progress', percent);
      const percentEl = document.getElementById('readinessPercent');
      const message = document.getElementById('readinessMessage');
      if (percentEl) percentEl.textContent = `${percent}%`;
      if (message) message.textContent = percent === 100 ? '떠날 준비가 끝났어요!' : percent >= 60 ? '거의 다 준비됐어요.' : percent >= 20 ? '좋아요, 차근차근 진행 중!' : '하나씩 준비해볼까요?';
    }
    listEl.addEventListener('change', render);
    document.getElementById('readinessReset')?.addEventListener('click', () => {
      listEl.querySelectorAll('input').forEach(input => { input.checked = false; });
      render();
    });
    render();
  })();

  /* ---------- 8-4. 최근 본 캠핑장 ---------- */
  function getRecentSites(){
    try { return JSON.parse(localStorage.getItem(RECENT_SITES_KEY)) || []; } catch (e) { return []; }
  }
  function pushRecentSite(item){
    const id = gcItemKey(item);
    const compact = {
      contentId:item.contentId, facltNm:item.facltNm, addr1:item.addr1, induty:item.induty,
      firstImageUrl:item.firstImageUrl, tel:item.tel, intro:item.intro, lineIntro:item.lineIntro,
      sbrsCl:item.sbrsCl, posblFcltyCl:item.posblFcltyCl, posblFcltyEtc:item.posblFcltyEtc,
      animalCmgCl:item.animalCmgCl, aninmalCmgCl:item.aninmalCmgCl, viewedAt:Date.now()
    };
    const next = [compact, ...getRecentSites().filter(entry => gcItemKey(entry) !== id)].slice(0,6);
    try { localStorage.setItem(RECENT_SITES_KEY, JSON.stringify(next)); } catch (e) { /* 저장 실패 무시 */ }
  }
  function renderRecentSites(){
    const section = document.getElementById('recentSites');
    const listEl = document.getElementById('recentSitesList');
    if (!section || !listEl) return;
    const recent = getRecentSites();
    section.hidden = recent.length === 0;
    window.__trippickRecentItems = recent;
    listEl.innerHTML = recent.map((item,index) => {
      const id = gcItemKey(item);
      return `<a class="recent-card" href="${ROOT_PREFIX}detail.html?src=api&contentId=${gcEscapeHtml(id)}" onclick="window.trippickRestoreRecent(${index})"><img src="${gcEscapeHtml(item.firstImageUrl || GOCAMPING_FALLBACK_IMG)}" alt=""><span><strong>${gcEscapeHtml(item.facltNm || '캠핑장')}</strong><span>${gcEscapeHtml(gcShortAddr(item.addr1))} · 다시 보기</span></span></a>`;
    }).join('');
  }
  window.trippickRestoreRecent = function(index){
    const item = window.__trippickRecentItems?.[index];
    if (!item) return;
    try { sessionStorage.setItem('trippick_selected_site', JSON.stringify(item)); } catch (e) { /* 무시 */ }
  };
  document.getElementById('recentSitesClear')?.addEventListener('click', () => {
    localStorage.removeItem(RECENT_SITES_KEY);
    renderRecentSites();
  });
  renderRecentSites();

  /* ---------- 9. 고캠핑(한국관광공사) 공공데이터 연동 ----------
     "이번 주 가장 많이 찾은 캠핑장" 4장을 실제 공공데이터로 채웁니다.
     * 참고: 고캠핑 API에는 "인기순" 지표가 없어 이미지가 등록된 캠핑장 위주로 노출합니다. */
  (function initGoCamping(){
    const campGrid = document.getElementById('campGrid');
    if (!campGrid) return; // 이 페이지에는 해당 영역이 없음

    const FALLBACK_IMG = 'https://images.unsplash.com/photo-1508873696983-2dfd5898f08b?auto=format&fit=crop&w=600&q=70';

    function escapeHtml(str){
      return String(str ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    }

    function shortAddr(addr1){
      if (!addr1) return '주소 정보 없음';
      return addr1.split(' ').slice(0, 2).join(' ');
    }

    function typeDesc(induty){
      return (induty || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 2).join(' · ') || '캠핑장';
    }

    // 이번 주 인기 카드: 이미지 위에 지역/이름을 얹은 에디토리얼 스타일. detail.html로 이동해 그대로 예약까지 이어짐.
    function popularCardHTML(item, rank, idx){
      const name = escapeHtml(item.facltNm || '이름 미상 캠핑장');
      const img = item.firstImageUrl ? escapeHtml(item.firstImageUrl) : FALLBACK_IMG;
      const cid = encodeURIComponent(item.contentId || ('idx' + idx));
      const href = `${ROOT_PREFIX}detail.html?src=api&contentId=${cid}`;
      return `
        <article class="p-card p-card-feature" data-wish-id="api-${cid}">
          <a href="${href}" class="p-thumb" onclick="window.trippickSaveSite(${idx})">
            <img src="${img}" alt="${name}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}';">
            <span class="p-tag p-tag-rank"><svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2l1.9 5.8H18l-4.9 3.6 1.9 5.8L10 13.6l-4.9 3.6 1.9-5.8L2 7.8h6.1L10 2z"/></svg>BEST ${rank}</span>
            <button class="p-like" aria-label="찜하기" onclick="event.preventDefault();"><svg width="15" height="15" viewBox="0 0 22 22" fill="none"><path d="M11 18s-7-4.5-7-9a4 4 0 018 0 4 4 0 018 0c0 4.5-7 9-7 9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></button>
            <span class="p-thumb-caption">
              <span class="p-thumb-region">${escapeHtml(shortAddr(item.addr1))}</span>
              <span class="p-thumb-name">${name}</span>
            </span>
          </a>
          <div class="p-body p-body-feature">
            <p class="p-desc"><svg width="11" height="11" viewBox="0 0 20 20" fill="none" style="vertical-align:-1px; margin-right:4px;"><path d="M10 2c-3 0-5.5 2.4-5.5 5.5C4.5 11.8 10 18 10 18s5.5-6.2 5.5-10.5C15.5 4.4 13 2 10 2z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><circle cx="10" cy="7.5" r="1.8" stroke="currentColor" stroke-width="1.1"/></svg>${escapeHtml(typeDesc(item.induty))}</p>
          </div>
        </article>`;
    }

    async function fetchCampingList(){
      return loadGoCampingList();
    }

    function renderPopular(list){
      if (!list.length) return;
      const top = list.slice(0, 4);
      window.__trippickGridItems = top;
      campGrid.innerHTML = top.map((item, i) => popularCardHTML(item, i + 1, i)).join('');
      renderWishlistState();
    }

    fetchCampingList().then(list => {
      if (!list.length) throw new Error('empty');
      const withImage = list.filter(it => it.firstImageUrl);
      renderPopular(withImage.length >= 4 ? withImage : list);
    }).catch(err => {
      console.error('고캠핑 데이터를 불러오지 못했습니다:', err);
      // 실패 시 기존 정적 카드가 그대로 남아있으므로 별도 처리 없음
    });
  })();

  (function initGoCampingTypePages(){
    const TYPE_GRID_IDS = {
      campingGrid: 'camping', glampingGrid: 'glamping', caravanGrid: 'caravan',
      petGrid: 'pet', mountainGrid: 'mountain', seaGrid: 'sea', newGrid: 'new'
    };
    const gridId = Object.keys(TYPE_GRID_IDS).find(id => document.getElementById(id));
    if (!gridId) return; // 이 페이지에는 해당 영역이 없음(=차박 페이지 또는 대상 외 페이지)
    const gridEl = document.getElementById(gridId);
    const type = TYPE_GRID_IDS[gridId];

    const SERVICE_KEY = 'c306dc04fc05af17071334c0c38412e0ed9c5b7066c10dfd5bfffeda36aeb8a4';
    const ENDPOINT = 'https://apis.data.go.kr/B551011/GoCamping/basedList';
    const FALLBACK_IMG = 'https://images.unsplash.com/photo-1631635589499-afd87d52bf64?auto=format&fit=crop&w=600&q=70';
    const CACHE_KEY = 'trippick_gocamping_cache_v1';

    function escapeHtml(str){
      return String(str ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    }
    function shortAddr(addr1){
      return addr1 ? addr1.split(' ').slice(0, 2).join(' ') : '주소 정보 없음';
    }
    function isPetFriendly(item){
      if (item.animalCmgCl === '가능' || item.aninmalCmgCl === '가능') return true;
      const text = [item.sbrsCl, item.posblFcltyCl, item.posblFcltyEtc, item.intro].filter(Boolean).join(' ');
      return /반려동물|애견|펫\s?동반/.test(text);
    }

    async function fetchAll(){
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        try { return JSON.parse(cached); } catch (e) { /* 캐시 손상 시 재요청 */ }
      }
      const url = `${ENDPOINT}?serviceKey=${SERVICE_KEY}&numOfRows=300&pageNo=1&MobileOS=ETC&MobileApp=Trippick&_type=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('고캠핑 API 요청 실패 (' + res.status + ')');
      const data = await res.json();
      const header = data && data.response && data.response.header;
      if (header && header.resultCode && header.resultCode !== '0000') {
        throw new Error(header.resultMsg || '고캠핑 API 오류');
      }
      const items = data && data.response && data.response.body && data.response.body.items && data.response.body.items.item;
      const list = items ? (Array.isArray(items) ? items : [items]) : [];
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch (e) { /* 저장 실패는 무시 */ }
      return list;
    }

    function matchType(item, type){
      const induty = item.induty || '';
      const lct = item.lctCl || '';
      switch (type) {
        case 'camping': return /야영장/.test(induty) && !/글램핑|카라반/.test(induty);
        case 'glamping': return /글램핑/.test(induty) || Number(item.glampSiteCo) > 0;
        case 'caravan': return /카라반/.test(induty) || Number(item.caravSiteCo) > 0 || Number(item.indvdlCaravSiteCo) > 0;
        case 'pet': return isPetFriendly(item);
        case 'mountain': return /산/.test(lct);
        case 'sea': return /바다|해변|해안/.test(lct);
        case 'new': return true; // 등록일순으로 별도 정렬 처리
        default: return false;
      }
    }

    function cardHTML(item, idx){
      const name = escapeHtml(item.facltNm || '이름 미상 캠핑장');
      const img = item.firstImageUrl ? escapeHtml(item.firstImageUrl) : FALLBACK_IMG;
      const region = escapeHtml(shortAddr(item.addr1));
      const desc = escapeHtml((item.induty || '캠핑장').split(',').slice(0, 2).join(' · '));
      const tel = item.tel ? escapeHtml(item.tel) : '전화번호 미등록';
      const cid = encodeURIComponent(item.contentId || ('idx' + idx));
      const href = `detail.html?src=api&contentId=${cid}`;
      return `
        <article class="p-card" data-wish-id="api-${cid}">
          <a href="${href}" class="p-thumb" onclick="window.trippickSaveSite(${idx})">
            <img src="${img}" alt="${name}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}';">
            <span class="p-tag p-tag-alt">공공데이터</span>
            <button class="p-like" aria-label="찜하기" onclick="event.preventDefault();"><svg width="14" height="14" viewBox="0 0 22 22" fill="none"><path d="M11 18s-7-4.5-7-9a4 4 0 018 0 4 4 0 018 0c0 4.5-7 9-7 9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></button>
          </a>
          <div class="p-body">
            <p class="p-region">${region}</p>
            <h3 class="p-name"><a href="${href}" onclick="window.trippickSaveSite(${idx})">${name}</a></h3>
            <p class="p-desc">${desc}</p>
            <div class="p-price"><span class="now" style="font-size:12.5px; font-weight:500; color:var(--text-mute);">${tel}</span></div>
          </div>
        </article>`;
    }

    fetchAll().then(list => {
      let filtered = list.filter(it => matchType(it, type) && it.facltNm);
      if (type === 'new') {
        filtered = filtered.slice().sort((a, b) => Number(b.createdtime || 0) - Number(a.createdtime || 0));
      }
      filtered = filtered.slice(0, 12);
      if (filtered.length < 4) throw new Error('해당 유형의 실데이터가 부족합니다(' + filtered.length + '건) — 큐레이션 유지');
      // detail.html에서 contentId로 다시 찾을 수 있도록 현재 그리드의 원본 데이터를 전역에 보관
      window.__trippickGridItems = filtered;
      const statusNote = document.createElement('p');
      statusNote.className = 'camp-api-status';
      statusNote.style.cssText = 'grid-column:1/-1; font-size:12px; color:var(--text-mute); margin-bottom:4px;';
      statusNote.textContent = '한국관광공사 고캠핑 공공데이터로 실시간 제공되는 목록입니다. 캠핑장을 선택하면 상세정보와 예약 화면으로 이동합니다.';
      gridEl.innerHTML = filtered.map((item, idx) => cardHTML(item, idx)).join('');
      gridEl.prepend(statusNote);
      renderWishlistState();
    }).catch(err => {
      console.warn('[GoCamping 유형별 연동:' + type + ']', err && err.message ? err.message : err);
      // 실패 시 기존 큐레이션 카드가 그대로 남아있으므로 별도 처리 없음
    });
  })();

  /* 그리드 카드 클릭 시 선택한 캠핑장의 원본 데이터를 sessionStorage에 저장.
     detail.html이 이 데이터를 읽어 실제 캠핑장 상세정보를 그려줍니다. */
  window.trippickSaveSite = function(idx){
    const item = window.__trippickGridItems && window.__trippickGridItems[idx];
    if (!item) return;
    try { sessionStorage.setItem('trippick_selected_site', JSON.stringify(item)); } catch (e) { /* 저장 실패는 무시 */ }
  };

  /* ---------- 11. detail.html: 고캠핑 API로 연동된 캠핑장 상세정보 렌더링 ----------
     URL에 ?src=api&contentId=... 가 있으면 sessionStorage(또는 재조회)로 실제 데이터를 읽어와
     제목/이미지/주소/소개/편의시설/후기 영역을 실제 정보로 교체하고,
     예약하기 버튼이 booking.html로 같은 캠핑장 정보를 이어받도록 연결합니다. */
  (function initApiDetailPage(){
    const params = new URLSearchParams(location.search);
    if (params.get('src') !== 'api') return;
    const contentId = params.get('contentId') || '';
    const detailHead = document.querySelector('.detail-head');
    if (!detailHead) return; // detail.html이 아니면 종료

    const SERVICE_KEY = 'c306dc04fc05af17071334c0c38412e0ed9c5b7066c10dfd5bfffeda36aeb8a4';
    const ENDPOINT = 'https://apis.data.go.kr/B551011/GoCamping/basedList';
    const CACHE_KEY = 'trippick_gocamping_cache_v1';
    const FALLBACK_IMG = 'https://images.unsplash.com/photo-1631635589499-afd87d52bf64?auto=format&fit=crop&w=1200&q=75';

    function escapeHtml(str){
      return String(str ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    }

    function getStoredItem(){
      try {
        const raw = sessionStorage.getItem('trippick_selected_site');
        if (!raw) return null;
        const item = JSON.parse(raw);
        const cid = String(item.contentId || '');
        if (cid && encodeURIComponent(cid) === contentId) return item;
        if (!cid && contentId.indexOf('idx') === 0) return item; // idx 폴백키인 경우 그대로 사용
        return null;
      } catch (e) { return null; }
    }

    function findInCache(){
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const list = JSON.parse(raw);
        return list.find(it => encodeURIComponent(String(it.contentId || '')) === contentId) || null;
      } catch (e) { return null; }
    }

    async function fetchFresh(){
      const url = `${ENDPOINT}?serviceKey=${SERVICE_KEY}&numOfRows=300&pageNo=1&MobileOS=ETC&MobileApp=Trippick&_type=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('고캠핑 API 요청 실패 (' + res.status + ')');
      const data = await res.json();
      const items = data && data.response && data.response.body && data.response.body.items && data.response.body.items.item;
      const list = items ? (Array.isArray(items) ? items : [items]) : [];
      return list.find(it => encodeURIComponent(String(it.contentId || '')) === contentId) || null;
    }

    function amenityChip(label){
      return `<div class="amenity-item"><div class="chip-icon"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.4"/></svg></div><span>${escapeHtml(label)}</span></div>`;
    }

    function render(item){
      if (!item) return;
      const name = item.facltNm || '이름 미상 캠핑장';
      const addr = item.addr1 || '';
      const region = addr ? addr.split(' ').slice(0, 2).join(' ') : '주소 정보 없음';
      const img = item.firstImageUrl || FALLBACK_IMG;
      const induty = item.induty || '캠핑장';
      const tel = item.tel || '전화번호 미등록';

      document.title = name + ' | TRIPPICK';

      // 브레드크럼
      const crumb = document.querySelector('.crumb');
      if (crumb) crumb.innerHTML = `<a href="../index.html">홈</a><span>/</span><a href="types.html">유형별예약</a><span>/</span><span>${escapeHtml(name)}</span>`;

      // 갤러리 메인 이미지
      const dgMain = document.querySelector('.dg-main img');
      if (dgMain) { dgMain.src = img; dgMain.alt = escapeHtml(name); }

      // 상단 정보
      const regionEl = detailHead.querySelector('.p-region');
      if (regionEl) regionEl.textContent = region;
      const h1 = detailHead.querySelector('h1');
      if (h1) h1.textContent = name;
      const metaEl = detailHead.querySelector('.detail-meta');
      if (metaEl) metaEl.innerHTML = `<span class="detail-rating">공공데이터 연동</span><span>${escapeHtml(induty)}</span>`;
      const tagsEl = detailHead.querySelector('.detail-tags');
      if (tagsEl) tagsEl.innerHTML = `<span class="p-tag p-tag-alt">${escapeHtml(induty.split(',')[0] || '캠핑장')}</span>`;

      // 소개
      const introBlock = document.querySelectorAll('.detail-block')[0];
      if (introBlock) {
        const p = introBlock.querySelector('p');
        if (p) p.textContent = item.intro || item.lineIntro || `${name}은(는) 한국관광공사 고캠핑에 등록된 ${induty} 시설입니다. 예약 전 캠핑장으로 상세 이용조건을 문의해주세요.`;
      }

      // 편의시설: sbrsCl(부대시설) 콤마 목록을 그대로 칩으로 표시
      const amenityGrid = document.querySelector('.amenity-grid');
      if (amenityGrid) {
        const list = (item.sbrsCl || '').split(',').map(s => s.trim()).filter(Boolean);
        amenityGrid.innerHTML = list.length ? list.slice(0, 8).map(amenityChip).join('') : '<p style="color:var(--text-mute); font-size:13px;">등록된 편의시설 정보가 없습니다.</p>';
      }

      // 위치
      const mapEl = document.querySelector('.detail-map');
      if (mapEl) mapEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 22 22" fill="none"><path d="M11 20s6.5-6.2 6.5-11A6.5 6.5 0 004.5 9c0 4.8 6.5 11 6.5 11z" stroke="currentColor" stroke-width="1.4"/><circle cx="11" cy="9" r="2.3" stroke="currentColor" stroke-width="1.4"/></svg>${escapeHtml(addr || '주소 정보 없음')}`;

      // 이용후기: 실데이터에는 후기가 없으므로 실제 후기처럼 보이는 가짜 텍스트를 넣지 않고 빈 상태로 안내
      // (위치가 아니라 data-block 마커로 찾음 — 아래에 "트립픽 이용후기" 블록이 추가로 붙어도 오작동하지 않도록)
      const reviewBlock = document.querySelector('[data-block="official-reviews"]');
      if (reviewBlock && /이용 후기/.test(reviewBlock.querySelector('h2')?.textContent || '')) {
        reviewBlock.querySelector('h2').innerHTML = '이용 후기 <span class="detail-review-count">0</span>';
        const rg = reviewBlock.querySelector('.review-grid');
        if (rg) rg.innerHTML = '<p style="color:var(--text-mute); font-size:13px; padding:12px 0;">공공데이터 연동 캠핑장이라 아직 등록된 후기가 없습니다. 다녀오신 후 트립픽에 첫 리뷰를 남겨보세요.</p>';
      }

      // 트립픽 이용후기(자체 리뷰)·위시리스트 하트 상태도 API 연동 캠핑장 기준(contentId)으로 갱신
      document.body.dataset.siteId = 'api-' + encodeURIComponent(item.contentId || contentId);
      renderWishlistState();
      if (window.__trippickRenderReviews) window.__trippickRenderReviews();

      // 예약 사이드바: 공공데이터에는 요금 정보가 없어 전화문의 안내로 대체하고,
      // 예약하기 버튼은 동일 캠핑장 정보를 booking.html로 이어서 전달합니다.
      const priceBox = document.querySelector('.detail-book-price');
      if (priceBox) priceBox.innerHTML = `<span class="now" style="font-size:16px;">요금 전화문의</span><span style="font-size:12px; color:var(--text-mute); margin-left:8px;">${escapeHtml(tel)}</span>`;
      const totalRow = document.querySelector('.detail-book-total strong');
      if (totalRow) totalRow.textContent = '캠핑장 확인 필요';
      const bookBtn = document.querySelector('.detail-book-card a.btn');
      if (bookBtn) bookBtn.href = `booking.html?src=api&contentId=${encodeURIComponent(item.contentId || contentId)}`;
      const note = document.querySelector('.detail-book-note');
      if (note) note.textContent = '공공데이터 연동 캠핑장은 정확한 요금을 캠핑장에 직접 확인해주세요.';

      // 다음 단계(예약/결제)에서도 동일 캠핑장 정보를 이어쓸 수 있도록 저장 유지
      try { sessionStorage.setItem('trippick_selected_site', JSON.stringify(item)); } catch (e) { /* 무시 */ }
      pushRecentSite(item);
    }

    const stored = getStoredItem() || findInCache();
    if (stored) {
      render(stored);
    } else {
      fetchFresh().then(item => {
        if (item) render(item);
        else console.warn('[GoCamping 상세] contentId=' + contentId + ' 항목을 찾지 못해 기본 예시 콘텐츠를 표시합니다.');
      }).catch(err => console.warn('[GoCamping 상세]', err && err.message ? err.message : err));
    }
  })();

  /* ---------- 11-1. detail.html: 트립픽 이용후기(자체 리뷰) 표시 ----------
     마이페이지 > 리뷰관리에서 작성한 리뷰를, 같은 캠핑장(siteId)의 상세페이지에 그대로 보여준다.
     API 연동 페이지는 initApiDetailPage의 render()가 body.dataset.siteId를 늦게 채우므로
     window.__trippickRenderReviews 훅으로 다시 그릴 수 있게 노출해둔다. */
  (function initTrippickReviews(){
    const container = document.getElementById('trippickReviewList');
    if (!container) return;

    function starStr(n){
      const r = Math.max(0, Math.min(5, Number(n) || 0));
      return '★'.repeat(r) + '☆'.repeat(5 - r);
    }
    function reviewItemHTML(r){
      const photos = Array.isArray(r.photos) ? r.photos.filter(Boolean) : [];
      return `
        <div class="review-item" style="background:var(--ivory-soft);">
          <div class="review-foot" style="border-top:none; margin:0 0 8px;">
            <span class="review-stars" style="color:var(--brass);">${starStr(r.rating)}</span>
            <span class="who" style="color:var(--text-mute);">${gcEscapeHtml(r.author)} · ${gcEscapeHtml(new Date(r.createdAt).toLocaleDateString('ko-KR'))}</span>
          </div>
          <p class="quote" style="color:var(--text-mute); min-height:auto;"><strong style="color:var(--ink);">${gcEscapeHtml(r.title)}</strong><br>${gcEscapeHtml(r.body)}</p>
          ${photos.length ? `<div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">${photos.slice(0, 4).map(p => `<img src="${p}" alt="리뷰 사진" style="width:64px; height:64px; object-fit:cover; border-radius:8px;">`).join('')}</div>` : ''}
        </div>`;
    }
    function render(){
      const siteId = document.body.dataset.siteId || '';
      const reviews = getReviewsForSite(siteId);
      container.innerHTML = reviews.length
        ? reviews.map(reviewItemHTML).join('')
        : '<p style="color:var(--text-mute); font-size:13px; padding:12px 0;">아직 등록된 트립픽 이용후기가 없습니다. 다녀오신 후 마이페이지 &gt; 리뷰관리에서 첫 리뷰를 남겨보세요.</p>';
    }
    window.__trippickRenderReviews = render;
    render();
  })();

  /* ---------- 11-2. detail.html: 사진 라이트박스 (모든 사진 클릭 시 확대, 이전/다음 넘기기) ---------- */
  (function initDetailLightbox(){
    const gallery = document.querySelector('.detail-gallery');
    if (!gallery) return;

    const clickable = Array.from(gallery.querySelectorAll('.dg-main img, .dg-sub img'));
    if (!clickable.length) return;

    function collectPhotos(){
      const base = clickable.map(img => img.currentSrc || img.src);
      let extra = [];
      try { extra = JSON.parse(gallery.dataset.fullGallery || '[]'); } catch (e) { /* 무시 */ }
      return base.concat(extra);
    }

    document.body.insertAdjacentHTML('beforeend', `
      <div class="site-popup lightbox-popup" id="detailLightbox">
        <div class="popup-inner lightbox-inner">
          <button class="popup-close" type="button" aria-label="닫기">
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none"><path d="M4 4l14 14M18 4L4 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </button>
          <button type="button" class="lightbox-nav lightbox-prev" aria-label="이전 사진">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 4l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <img id="lightboxImg" src="" alt="캠핑장 사진 확대보기">
          <button type="button" class="lightbox-nav lightbox-next" aria-label="다음 사진">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7.5 4l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <span class="lightbox-counter" id="lightboxCounter"></span>
        </div>
      </div>`);

    const popup = document.getElementById('detailLightbox');
    const imgEl = document.getElementById('lightboxImg');
    const counterEl = document.getElementById('lightboxCounter');
    let photos = [];
    let current = 0;

    function show(idx){
      if (!photos.length) return;
      current = (idx + photos.length) % photos.length;
      imgEl.src = photos[current];
      counterEl.textContent = `${current + 1} / ${photos.length}`;
    }
    function openAt(idx){
      photos = collectPhotos();
      if (!photos.length) return;
      show(idx);
      openPopup(popup);
    }

    clickable.forEach((img, idx) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => openAt(idx));
    });
    popup.querySelector('.lightbox-prev').addEventListener('click', () => show(current - 1));
    popup.querySelector('.lightbox-next').addEventListener('click', () => show(current + 1));
    document.addEventListener('keydown', (e) => {
      if (!popup.classList.contains('open')) return;
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
  })();

  /* ---------- 12. booking.html / payment.html: 이전 단계에서 선택한 실제 캠핑장 정보 반영 ---------- */
  (function initApiBookingContinuity(){
    const params = new URLSearchParams(location.search);
    if (params.get('src') !== 'api') return;
    let item = null;
    try {
      const raw = sessionStorage.getItem('trippick_selected_site');
      if (raw) item = JSON.parse(raw);
    } catch (e) { /* 무시 */ }
    if (!item) return;

    const name = item.facltNm || '선택한 캠핑장';
    const addr = item.addr1 || '';
    const region = addr ? addr.split(' ').slice(0, 2).join(' ') : '';
    const img = item.firstImageUrl || 'https://images.unsplash.com/photo-1631635589499-afd87d52bf64?auto=format&fit=crop&w=300&q=70';

    const siteCard = document.querySelector('.book-site-card');
    if (siteCard) {
      const imgEl = siteCard.querySelector('img');
      if (imgEl) { imgEl.src = img; imgEl.alt = name; }
      const regionEl = siteCard.querySelector('.p-region');
      if (regionEl) regionEl.textContent = region;
      const h3 = siteCard.querySelector('h3');
      if (h3) h3.textContent = name;
      const ratingEl = siteCard.querySelector('.detail-rating');
      if (ratingEl && /★/.test(ratingEl.textContent)) ratingEl.textContent = '공공데이터 연동 · 요금 전화문의';
    }

    // 결제 페이지로 이동하는 링크에도 동일한 캠핑장 정보를 이어붙임
    document.querySelectorAll('a.btn[href="payment.html"]').forEach(a => {
      a.href = `payment.html?src=api&contentId=${encodeURIComponent(item.contentId || params.get('contentId') || '')}`;
    });

    const notes = document.querySelectorAll('.detail-book-note, .pay-summary');
    notes.forEach(n => {
      const p = document.createElement('p');
      p.style.cssText = 'font-size:12px; color:var(--text-mute); margin-top:6px;';
      p.textContent = '* 공공데이터 연동 캠핑장은 정확한 요금·예약 가능 여부를 캠핑장에 직접 확인해주세요.';
      n.appendChild(p);
    });

    // 결제 완료 팝업(payment.html)에도 실제 캠핑장 이름 반영
    const popupText = document.querySelector('#paySuccessPopup .popup-inner p');
    if (popupText) popupText.innerHTML = `${name}${region ? ' · ' + region : ''}<br>예약 확인서를 이메일로 보내드렸어요.`;
  })();

  /* ---------- 13. 전체 캠핑장 지도 (Leaflet + 고캠핑 공공데이터, 클릭 시에만 지도 라이브러리 로드) ---------- */
  (function initSiteMap(){
    const openBtn = document.getElementById('openSiteMapBtn');
    const mapPopup = document.getElementById('siteMapPopup');
    if (!openBtn || !mapPopup) return;

    const regionSelect = document.getElementById('siteMapRegionSelect');

    const GOOGLE_MAPS_API_KEY = 'AIzaSyAZ_TYSxw9CGvi4dWtzlRHOVM-e_MQoVhU';
    let mapInstance = null;
    let googleMapsPromise = null;
    let markerClustererPromise = null;
    let siteMapMarkerCluster = null;
    let siteMapBounds = null;

    // 지역 검색으로 확대할 시·도별 중심 좌표 (대략적인 시청/도청 기준)
    const REGION_COORDS = {
      '서울': { lat: 37.5665, lng: 126.9780, zoom: 11 },
      '부산': { lat: 35.1796, lng: 129.0756, zoom: 11 },
      '대구': { lat: 35.8714, lng: 128.6014, zoom: 11 },
      '인천': { lat: 37.4563, lng: 126.7052, zoom: 10 },
      '광주': { lat: 35.1595, lng: 126.8526, zoom: 11 },
      '대전': { lat: 36.3504, lng: 127.3845, zoom: 11 },
      '울산': { lat: 35.5384, lng: 129.3114, zoom: 11 },
      '세종': { lat: 36.4801, lng: 127.2890, zoom: 11 },
      '경기': { lat: 37.4138, lng: 127.5183, zoom: 9 },
      '강원': { lat: 37.8228, lng: 128.1555, zoom: 8 },
      '충북': { lat: 36.6357, lng: 127.4917, zoom: 9 },
      '충남': { lat: 36.5184, lng: 126.8000, zoom: 9 },
      '전북': { lat: 35.7175, lng: 127.1530, zoom: 9 },
      '전남': { lat: 34.8161, lng: 126.4630, zoom: 8 },
      '경북': { lat: 36.4919, lng: 128.8889, zoom: 8 },
      '경남': { lat: 35.4606, lng: 128.2132, zoom: 9 },
      '제주': { lat: 33.4996, lng: 126.5312, zoom: 10 }
    };

    function loadGoogleMaps(){
      if (!googleMapsPromise) {
        googleMapsPromise = new Promise((resolve, reject) => {
          if (window.google && window.google.maps) { resolve(); return; }
          window.__trippickGmapsReady = () => resolve();
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=__trippickGmapsReady`;
          script.async = true;
          script.defer = true;
          script.onerror = () => reject(new Error('구글 지도를 불러오지 못했습니다 (API 키 또는 네트워크 문제)'));
          document.head.appendChild(script);
        });
      }
      return googleMapsPromise;
    }

    // 마커 겹침(다닥다닥 붙어 보이는 문제) 완화를 위한 클러스터링 라이브러리. 실패해도 지도 자체는 표시되도록 조용히 무시.
    function loadMarkerClusterer(){
      if (!markerClustererPromise) {
        markerClustererPromise = new Promise((resolve) => {
          if (window.markerClusterer) { resolve(); return; }
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => resolve();
          document.head.appendChild(script);
        });
      }
      return markerClustererPromise;
    }

    function renderMap(list){
      const mapEl = document.getElementById('siteMapEl');
      if (!mapEl || !(window.google && window.google.maps)) return;
      mapEl.innerHTML = '';

      mapInstance = new google.maps.Map(mapEl, {
        center: { lat: 36.5, lng: 127.8 }, // 대한민국 중심 기본 좌표
        zoom: 7,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
      });

      siteMapBounds = new google.maps.LatLngBounds();
      const infoWindow = new google.maps.InfoWindow();
      const markers = [];

      list.forEach(item => {
        const lat = parseFloat(item.mapY);
        const lng = parseFloat(item.mapX);
        if (!lat || !lng || Number.isNaN(lat) || Number.isNaN(lng)) return;
        const name = gcEscapeHtml(item.facltNm || '이름 미상 캠핑장');
        const addr = gcEscapeHtml(item.addr1 || '주소 정보 없음');
        const tel = item.tel ? gcEscapeHtml(item.tel) : '';
        const position = { lat, lng };

        const marker = new google.maps.Marker({ position, title: name });
        marker.addListener('click', () => {
          infoWindow.setContent(`<div style="font-family:${getComputedStyle(document.body).fontFamily}; font-size:13px; line-height:1.6;"><strong>${name}</strong><br>${addr}${tel ? '<br>' + tel : ''}</div>`);
          infoWindow.open(mapInstance, marker);
        });

        siteMapBounds.extend(position);
        markers.push(marker);
      });

      if (siteMapMarkerCluster) { siteMapMarkerCluster.clearMarkers(); siteMapMarkerCluster = null; }
      if (window.markerClusterer && markers.length) {
        siteMapMarkerCluster = new markerClusterer.MarkerClusterer({ map: mapInstance, markers });
      } else {
        markers.forEach(m => m.setMap(mapInstance));
      }

      if (markers.length) mapInstance.fitBounds(siteMapBounds);
    }

    regionSelect?.addEventListener('change', () => {
      if (!mapInstance) return;
      const value = regionSelect.value;
      if (!value) {
        if (siteMapBounds && !siteMapBounds.isEmpty()) mapInstance.fitBounds(siteMapBounds);
        return;
      }
      const region = REGION_COORDS[value];
      if (!region) return;
      mapInstance.setCenter({ lat: region.lat, lng: region.lng });
      mapInstance.setZoom(region.zoom);
    });

    openBtn.addEventListener('click', () => {
      openPopup(mapPopup);
      const mapEl = document.getElementById('siteMapEl');
      if (mapEl && !mapInstance) mapEl.innerHTML = '<p class="site-map-loading">지도를 불러오는 중입니다…</p>';
      if (regionSelect) regionSelect.value = '';

      Promise.all([loadGoogleMaps(), loadMarkerClusterer()])
        .then(() => loadGoCampingList())
        .then(list => {
          requestAnimationFrame(() => renderMap(list.filter(it => it.facltNm)));
        })
        .catch(err => {
          const el = document.getElementById('siteMapEl');
          if (el) el.innerHTML = '<p class="site-map-loading">지도를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>';
          console.warn('[전체 캠핑장 지도]', err && err.message ? err.message : err);
        });
    });
  })();

});

// AI 챗봇은 별도 파일로 관리하며, 현재 페이지의 js/ 경로를 기준으로 불러옵니다.
(function loadAiChat() {
  const current = document.currentScript;
  if (!current || !current.src) return;
  const config = document.createElement('script');
  config.src = new URL('ai-chat-config.js', current.src).href;
  config.onload = function () {
    const chat = document.createElement('script');
    chat.src = new URL('ai-chat.js', current.src).href;
    document.head.appendChild(chat);
  };
  document.head.appendChild(config);
})();

// Supabase Auth와 실제 리뷰/게시판 데이터를 전 페이지에서 공유합니다.
(function loadSupabaseApp() {
  const current = document.currentScript;
  if (!current || !current.src) return;
  const sdk = document.createElement('script');
  sdk.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/dist/umd/supabase.min.js';
  sdk.onload = function () {
    const config = document.createElement('script');
    config.src = new URL('supabase-config.js', current.src).href;
    config.onload = function () {
      const app = document.createElement('script');
      app.src = new URL('supabase-app.js', current.src).href;
      document.head.appendChild(app);
    };
    document.head.appendChild(config);
  };
  document.head.appendChild(sdk);
})();
