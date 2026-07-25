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
  document.querySelectorAll('.p-like').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      btn.classList.toggle('on');
    });
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
        <a href="mypage.html" class="fab-quick-item">
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none"><rect x="3" y="4" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M3 9h16" stroke="currentColor" stroke-width="1.3"/></svg>
          <span class="fab-quick-label">예약확인</span>
        </a>
        <a href="tel:029876543" class="fab-quick-item">
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none"><path d="M4 4h4l2 5-2.5 1.5a11 11 0 006 6L15 14l5 2v4a2 2 0 01-2 2C9.5 22 2 14.5 2 6a2 2 0 012-2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
          <span class="fab-quick-label">고객센터</span>
        </a>
        <a href="login.html" class="fab-quick-item">
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

});