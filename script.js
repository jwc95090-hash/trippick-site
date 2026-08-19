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
  const heroGiantTextEl = document.getElementById('heroGiantText');

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
    if (heroGiantTextEl) {
      heroGiantTextEl.style.transform = `translateX(${(7 - progress * 14).toFixed(1)}%) translateY(${Math.round(progress * -40)}px)`;
      heroGiantTextEl.style.opacity = (0.85 - progress * 0.6).toFixed(2);
    }
  }
  updateHeroParallax();
  window.addEventListener('scroll', updateHeroParallax, { passive: true });
  window.addEventListener('resize', updateHeroParallax);

  /* ---------- 2-2. 일반 패럴랙스 드리프트 (data-parallax 속성을 가진 장식 요소) ---------- */
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  function updateParallaxDrift(){
    const vh = window.innerHeight || 1;
    parallaxEls.forEach(el => {
      const rect = el.getBoundingClientRect();
      const centerOffset = (rect.top + rect.height / 2) - vh / 2;
      const speed = parseFloat(el.dataset.parallax) || 0.15;
      el.style.transform = `translateY(${(-centerOffset * speed * 0.3).toFixed(1)}px)`;
    });
  }
  if (parallaxEls.length) {
    updateParallaxDrift();
    window.addEventListener('scroll', updateParallaxDrift, { passive: true });
    window.addEventListener('resize', updateParallaxDrift);
  }

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
  }

  document.querySelectorAll('.popup-close, [data-popup-close]').forEach(btn => {
    btn.addEventListener('click', () => closePopup(btn.closest('.site-popup')));
  });
  document.querySelectorAll('.site-popup').forEach(popup => {
    popup.addEventListener('click', (e) => {
      if (e.target === popup) closePopup(popup);
    });
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

  /* ---------- 6. 찜 버튼 / 하단 탭 ---------- */
  document.addEventListener('click', (e) => {
    const likeBtn = e.target.closest('.p-like');
    if (!likeBtn) return;
    e.preventDefault();
    likeBtn.classList.toggle('on');
  });

  document.querySelectorAll('.bottom-tab .tab-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bottom-tab .tab-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  /* ---------- 7. 우측 하단 퀵메뉴 · 맨 위로 (전 페이지 공통) ---------- */
  document.body.insertAdjacentHTML('beforeend', `
    <div class="fab-stack" id="fabStack">
      <button type="button" class="fab-top" id="fabTopBtn" aria-label="맨 위로 이동">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 15V5M5 9l5-5 5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="fab-quick-list" id="fabQuickList">
        <a href="${ROOT_PREFIX}mypage.html" class="fab-quick-item">
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none"><rect x="3" y="4" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M3 9h16" stroke="currentColor" stroke-width="1.3"/></svg>
          <span class="fab-quick-label">예약확인</span>
        </a>
        <a href="tel:029876543" class="fab-quick-item">
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none"><path d="M4 4h4l2 5-2.5 1.5a11 11 0 006 6L15 14l5 2v4a2 2 0 01-2 2C9.5 22 2 14.5 2 6a2 2 0 012-2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
          <span class="fab-quick-label">고객센터</span>
        </a>
        <a href="${ROOT_PREFIX}login.html" class="fab-quick-item">
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none"><path d="M9 4H5a1 1 0 00-1 1v12a1 1 0 001 1h4M14 15l4-4-4-4M18 11H8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="fab-quick-label">로그인</span>
        </a>
        <button type="button" class="fab-quick-item" id="fabConsultBtn">
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none"><path d="M3 5.5A2.5 2.5 0 015.5 3h11A2.5 2.5 0 0119 5.5v6A2.5 2.5 0 0116.5 14H9l-4.5 4v-4H5.5A2.5 2.5 0 013 11.5v-6z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
          <span class="fab-quick-label">상담문의</span>
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

  /* 상담 문의 팝업: 말풍선 채팅형. 이름을 먼저 확인한 뒤 문의를 남기면 순서대로 검토 후
     답변이 채팅으로 도착하는 흐름을 시뮬레이션하고, localStorage에 대화가 남아 다음에 다시 열어도 이어짐. */
  (function initConsultChat(){
    const consultPopup = document.getElementById('consultPopup');
    const thread = document.getElementById('consultChatThread');
    const statusEl = document.getElementById('consultChatStatus');
    const form = document.getElementById('consultChatForm');
    const input = document.getElementById('consultChatInput');
    if (!consultPopup || !thread || !form || !input) return;

    const STORE_KEY = 'trippick_consult_chat_v1';
    const GREETING = '안녕하세요, 트립픽 상담입니다 🙂 먼저 성함을 알려주시겠어요?';
    const AUTO_REPLIES = [
      '문의 남겨주셔서 감사합니다! 확인 후 순서대로 답변드릴게요.',
      '네, 잘 확인했습니다. 상담 가능시간 내에 자세히 안내드릴게요.',
      '말씀 주신 내용 접수했어요. 곧 담당 호스트가 답변드릴 예정이에요.'
    ];

    function loadState(){
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) { /* 저장소 파손 시 새로 시작 */ }
      return { name: null, messages: [] };
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
      input.placeholder = state.name ? '문의하실 내용을 입력하세요' : '이름을 입력해주세요';
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

    document.getElementById('fabConsultBtn')?.addEventListener('click', () => {
      ensureGreeting();
      openPopup(consultPopup);
      setTimeout(() => input.focus(), 250);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      clearTimeout(replyTimer);

      if (!state.name) {
        state.name = text;
        saveState();
        pushMessage('user', text);
        updatePlaceholder();
        setStatus('', null);
        replyTimer = setTimeout(() => {
          pushMessage('host', `반가워요, ${state.name}님! 궁금하신 내용을 편하게 남겨주세요.`);
        }, 700);
        return;
      }

      pushMessage('user', text);
      setStatus('답변 대기중', 'pending');
      const askedCount = state.messages.filter(m => m.role === 'user').length;
      const reply = AUTO_REPLIES[(askedCount - 1) % AUTO_REPLIES.length];
      replyTimer = setTimeout(() => {
        pushMessage('host', reply);
        setStatus('답변 완료', 'done');
      }, 1500 + Math.random() * 1200);
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

  function gcResultCardHTML(item){
    const name = gcEscapeHtml(item.facltNm || '이름 미상 캠핑장');
    const img = item.firstImageUrl ? gcEscapeHtml(item.firstImageUrl) : GOCAMPING_FALLBACK_IMG;
    const region = gcEscapeHtml(gcShortAddr(item.addr1));
    const desc = gcEscapeHtml((item.induty || '캠핑장').split(',').slice(0, 2).join(' · '));
    const tel = item.tel ? gcEscapeHtml(item.tel) : '전화번호 미등록';
    const telHref = (item.tel || '').replace(/[^0-9]/g, '');
    return `
        <article class="p-card">
          <a href="${telHref ? 'tel:' + telHref : '#'}" class="p-thumb">
            <img src="${img}" alt="${name}" loading="lazy" onerror="this.onerror=null;this.src='${GOCAMPING_FALLBACK_IMG}';">
            <span class="p-tag p-tag-alt">공공데이터</span>
          </a>
          <div class="p-body">
            <p class="p-region">${region}</p>
            <h3 class="p-name">${name}</h3>
            <p class="p-desc">${desc}</p>
            <div class="p-price"><span class="now" style="font-size:12.5px; font-weight:500; color:var(--text-mute);">${tel}</span></div>
          </div>
        </article>`;
  }

  /* ---------- 8. 홈 필터 바 (지역 · 체크인/체크아웃 · 스타일) ---------- */
  const checkinInput = document.getElementById('checkinInput');
  const checkoutInput = document.getElementById('checkoutInput');
  checkinInput?.addEventListener('change', () => {
    if (checkoutInput) {
      checkoutInput.min = checkinInput.value;
      if (checkoutInput.value && checkoutInput.value < checkinInput.value) {
        checkoutInput.value = checkinInput.value;
      }
    }
  });

  const filterResultsSection = document.getElementById('filterResults');
  const filterResultsGrid = document.getElementById('filterResultsGrid');
  const filterResultsTitle = document.getElementById('filterResultsTitle');
  const filterResultsNote = document.getElementById('filterResultsNote');

  document.getElementById('homeFilterSubmit')?.addEventListener('click', () => {
    const regionSelect = document.getElementById('regionInput');
    const styleSelect = document.getElementById('styleInput');
    const region = regionSelect?.value;
    const style = styleSelect?.value;
    const checkin = checkinInput?.value;
    const checkout = checkoutInput?.value;

    if (!region || !style) {
      document.getElementById('homeFilterBar')?.classList.add('shake');
      setTimeout(() => document.getElementById('homeFilterBar')?.classList.remove('shake'), 500);
      return;
    }
    if (!filterResultsSection || !filterResultsGrid) return;

    const regionLabel = regionSelect.options[regionSelect.selectedIndex]?.textContent || '전체 지역';
    const styleLabel = styleSelect.options[styleSelect.selectedIndex]?.textContent || '전체 스타일';

    filterResultsSection.style.display = '';
    filterResultsTitle.textContent = '캠핑장을 찾고 있습니다…';
    filterResultsNote.textContent = '';
    filterResultsGrid.innerHTML = '<p style="grid-column:1/-1; color:var(--text-mute); font-size:13px;">한국관광공사 고캠핑 공공데이터에서 검색 중입니다…</p>';
    filterResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    loadGoCampingList().then(list => {
      const filtered = list.filter(it => it.facltNm && gcMatchRegion(it, region) && gcMatchStyle(it, style));
      filterResultsTitle.textContent = `${regionLabel} · ${styleLabel} 캠핑장 ${filtered.length}곳`;
      filterResultsNote.textContent = (checkin && checkout)
        ? `${checkin} ~ ${checkout} 예약 가능 여부는 공공데이터에 포함되어 있지 않아, 각 캠핑장에 직접 확인해주세요.`
        : '한국관광공사 고캠핑 공공데이터로 실시간 제공되는 검색 결과입니다.';
      if (!filtered.length) {
        filterResultsGrid.innerHTML = '<p style="grid-column:1/-1; color:var(--text-mute); font-size:13px;">조건에 맞는 캠핑장을 찾지 못했습니다. 다른 지역이나 스타일로 다시 검색해보세요.</p>';
        return;
      }
      filterResultsGrid.innerHTML = filtered.slice(0, 24).map(gcResultCardHTML).join('');
    }).catch(err => {
      filterResultsTitle.textContent = '검색 결과를 불러오지 못했습니다';
      filterResultsNote.textContent = '';
      filterResultsGrid.innerHTML = '<p style="grid-column:1/-1; color:var(--text-mute); font-size:13px;">일시적인 오류로 실시간 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>';
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
  });

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
        <article class="p-card p-card-feature">
          <a href="${href}" class="p-thumb" onclick="window.trippickSaveSite(${idx})">
            <img src="${img}" alt="${name}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}';">
            <span class="p-tag p-tag-rank"><svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2l1.9 5.8H18l-4.9 3.6 1.9 5.8L10 13.6l-4.9 3.6 1.9-5.8L2 7.8h6.1L10 2z"/></svg>BEST ${rank}</span>
            <button class="p-like" aria-label="찜하기" onclick="event.preventDefault(); event.stopPropagation();"><svg width="15" height="15" viewBox="0 0 22 22" fill="none"><path d="M11 18s-7-4.5-7-9a4 4 0 018 0 4 4 0 018 0c0 4.5-7 9-7 9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></button>
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
        <article class="p-card">
          <a href="${href}" class="p-thumb" onclick="window.trippickSaveSite(${idx})">
            <img src="${img}" alt="${name}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}';">
            <span class="p-tag p-tag-alt">공공데이터</span>
            <button class="p-like" aria-label="찜하기" onclick="event.preventDefault(); event.stopPropagation();"><svg width="14" height="14" viewBox="0 0 22 22" fill="none"><path d="M11 18s-7-4.5-7-9a4 4 0 018 0 4 4 0 018 0c0 4.5-7 9-7 9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></button>
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
      const reviewBlocks = document.querySelectorAll('.detail-block');
      const reviewBlock = reviewBlocks[reviewBlocks.length - 1];
      if (reviewBlock && /이용 후기/.test(reviewBlock.querySelector('h2')?.textContent || '')) {
        reviewBlock.querySelector('h2').innerHTML = '이용 후기 <span class="detail-review-count">0</span>';
        const rg = reviewBlock.querySelector('.review-grid');
        if (rg) rg.innerHTML = '<p style="color:var(--text-mute); font-size:13px; padding:12px 0;">공공데이터 연동 캠핑장이라 아직 등록된 후기가 없습니다. 다녀오신 후 트립픽에 첫 리뷰를 남겨보세요.</p>';
      }

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

/* 가이드 영상은 갑작스럽게 크게 들리지 않도록 편안한 초기 음량으로 시작합니다. */
document.querySelectorAll('video[data-initial-volume]').forEach((video) => {
  const requestedVolume = Number.parseFloat(video.dataset.initialVolume || '0.28');
  const initialVolume = Number.isFinite(requestedVolume)
    ? Math.min(1, Math.max(0, requestedVolume))
    : 0.28;
  const applyInitialVolume = () => {
    video.volume = initialVolume;
  };
  if (video.readyState >= 1) applyInitialVolume();
  else video.addEventListener('loadedmetadata', applyInitialVolume, { once: true });
});
