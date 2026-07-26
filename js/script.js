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

  /* pages/ 하위 페이지와 루트 페이지에서 모두 동작하도록 상대 경로 접두사 계산 */
  const pagePrefix = location.pathname.includes('/pages/') ? '' : 'pages/';

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
  if (couponPopup && !sessionStorage.getItem('trippickCouponSeen')) {
    setTimeout(() => {
      openPopup(couponPopup);
      sessionStorage.setItem('trippickCouponSeen', '1');
    }, 900);
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

  /* ---------- 5. 원클릭 예약 ---------- */
  const qbUnitPrice = 54000;
  let qbCount = 2;
  const qbCountEl = document.getElementById('qbCount');
  const qbPriceEl = document.getElementById('qbPrice');

  function qbUpdatePrice(){
    if (!qbPriceEl) return;
    qbPriceEl.textContent = (qbUnitPrice * qbCount).toLocaleString() + '원';
  }

  document.getElementById('quickBookBtn')?.addEventListener('click', () => {
    openPopup(document.getElementById('quickBookPopup'));
  });

  document.querySelectorAll('.qb-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      if (qbCount < 8) { qbCount++; qbCountEl.textContent = qbCount; qbUpdatePrice(); }
    });
  });
  document.querySelectorAll('.qb-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      if (qbCount > 1) { qbCount--; qbCountEl.textContent = qbCount; qbUpdatePrice(); }
    });
  });

  document.getElementById('qbConfirm')?.addEventListener('click', function () {
    const btn = this;
    btn.classList.add('done');
    btn.textContent = '예약이 확정되었습니다';
    setTimeout(() => {
      closePopup(document.getElementById('quickBookPopup'));
      setTimeout(() => {
        btn.classList.remove('done');
        btn.textContent = '예약 확정하기';
        qbCount = 2;
        if (qbCountEl) qbCountEl.textContent = qbCount;
        qbUpdatePrice();
      }, 300);
    }, 900);
  });

  /* ---------- 상담 신청 폼 ---------- */
  const consultForm = document.querySelector('.consult-form');
  consultForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = consultForm.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.textContent = '상담 신청이 접수되었습니다';
    setTimeout(() => { btn.textContent = original; consultForm.reset(); }, 1800);
  });

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
        <a href="${pagePrefix}mypage.html" class="fab-quick-item">
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none"><rect x="3" y="4" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M3 9h16" stroke="currentColor" stroke-width="1.3"/></svg>
          <span class="fab-quick-label">예약확인</span>
        </a>
        <a href="tel:029876543" class="fab-quick-item">
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none"><path d="M4 4h4l2 5-2.5 1.5a11 11 0 006 6L15 14l5 2v4a2 2 0 01-2 2C9.5 22 2 14.5 2 6a2 2 0 012-2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
          <span class="fab-quick-label">고객센터</span>
        </a>
        <a href="${pagePrefix}login.html" class="fab-quick-item">
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none"><path d="M9 4H5a1 1 0 00-1 1v12a1 1 0 001 1h4M14 15l4-4-4-4M18 11H8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="fab-quick-label">로그인</span>
        </a>
        <button type="button" class="fab-quick-item" id="fabEventBtn">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 2l1.5 4.5H16l-3.7 2.7 1.4 4.3L10 11l-3.7 2.5 1.4-4.3L4 6.5h4.5L10 2z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
          <span class="fab-quick-label">이벤트 확인</span>
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

  document.getElementById('fabEventBtn')?.addEventListener('click', () => {
    const sitePopup = document.getElementById('sitePopup');
    if (sitePopup) {
      openPopup(sitePopup);
    } else {
      location.href = 'index.html#pick';
    }
  });

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

  document.getElementById('homeFilterSubmit')?.addEventListener('click', () => {
    const region = document.getElementById('regionInput')?.value;
    const style = document.getElementById('styleInput')?.value;
    const target = document.getElementById('pick');
    if (!region || !style) {
      document.getElementById('homeFilterBar')?.classList.add('shake');
      setTimeout(() => document.getElementById('homeFilterBar')?.classList.remove('shake'), 500);
      return;
    }
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------- 9. 고캠핑(한국관광공사) 공공데이터 연동 ----------
     "이번 주 가장 많이 찾은 캠핑장" 4장을 실제 공공데이터로 채웁니다.
     * 참고: 고캠핑 API에는 "인기순" 지표가 없어 이미지가 등록된 캠핑장 위주로 노출합니다. */
  (function initGoCamping(){
    const campGrid = document.getElementById('campGrid');
    if (!campGrid) return; // 이 페이지에는 해당 영역이 없음

    const GOCAMPING_SERVICE_KEY = 'c306dc04fc05af17071334c0c38412e0ed9c5b7066c10dfd5bfffeda36aeb8a4';
    const GOCAMPING_ENDPOINT = 'https://apis.data.go.kr/B551011/GoCamping/basedList';
    const FALLBACK_IMG = 'https://images.unsplash.com/photo-1508873696983-2dfd5898f08b?auto=format&fit=crop&w=600&q=70';

    function escapeHtml(str){
      return String(str ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    }

    function extractLink(item){
      const raw = item.homepage || '';
      const hrefMatch = raw.match(/href=["']([^"']+)["']/i);
      if (hrefMatch) return hrefMatch[1];
      const urlMatch = raw.match(/https?:\/\/[^\s"'<>]+/i);
      if (urlMatch) return urlMatch[0];
      if (item.tel) return 'tel:' + item.tel.replace(/[^0-9]/g, '');
      return '#';
    }

    function shortAddr(addr1){
      if (!addr1) return '주소 정보 없음';
      return addr1.split(' ').slice(0, 2).join(' ');
    }

    function typeDesc(induty){
      return (induty || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 2).join(' · ') || '캠핑장';
    }

    // 이번 주 인기 카드: 이미지 위에 지역/이름을 얹은 에디토리얼 스타일
    function popularCardHTML(item, rank){
      const name = escapeHtml(item.facltNm || '이름 미상 캠핑장');
      const img = item.firstImageUrl ? escapeHtml(item.firstImageUrl) : FALLBACK_IMG;
      const link = escapeHtml(extractLink(item));
      const external = /^https?:/.test(link);
      const linkAttrs = external ? ' target="_blank" rel="noopener"' : '';
      return `
        <article class="p-card p-card-feature">
          <a href="${link}" class="p-thumb"${linkAttrs}>
            <img src="${img}" alt="${name}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}';">
            <span class="p-tag p-tag-rank"><svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2l1.9 5.8H18l-4.9 3.6 1.9 5.8L10 13.6l-4.9 3.6 1.9-5.8L2 7.8h6.1L10 2z"/></svg>BEST ${rank}</span>
            <button class="p-like" aria-label="찜하기" onclick="event.preventDefault()"><svg width="15" height="15" viewBox="0 0 22 22" fill="none"><path d="M11 18s-7-4.5-7-9a4 4 0 018 0 4 4 0 018 0c0 4.5-7 9-7 9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></button>
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

    async function fetchCampingList(numOfRows, pageNo){
      const url = `${GOCAMPING_ENDPOINT}?serviceKey=${GOCAMPING_SERVICE_KEY}&numOfRows=${numOfRows}&pageNo=${pageNo}&MobileOS=ETC&MobileApp=Trippick&_type=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('고캠핑 API 요청 실패 (' + res.status + ')');
      const data = await res.json();
      const header = data && data.response && data.response.header;
      if (header && header.resultCode && header.resultCode !== '0000') {
        throw new Error(header.resultMsg || '고캠핑 API 오류');
      }
      const items = data && data.response && data.response.body && data.response.body.items && data.response.body.items.item;
      if (!items) return [];
      return Array.isArray(items) ? items : [items];
    }

    function renderPopular(list){
      if (!list.length) return;
      campGrid.innerHTML = list.slice(0, 4).map((item, i) => popularCardHTML(item, i + 1)).join('');
    }

    fetchCampingList(60, 1).then(list => {
      if (!list.length) throw new Error('empty');
      const withImage = list.filter(it => it.firstImageUrl);
      renderPopular(withImage.length >= 4 ? withImage : list);
    }).catch(err => {
      console.error('고캠핑 데이터를 불러오지 못했습니다:', err);
      // 실패 시 기존 정적 카드가 그대로 남아있으므로 별도 처리 없음
    });
  })();

});