(function () {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const formatDate = value => new Date(value).toLocaleDateString('ko-KR');

  async function requireAdmin() {
    const config = window.TRIPPICK_SUPABASE;
    if (!window.supabase || !config) return location.replace('login.html?error=config');
    const db = window.supabase.createClient(config.url, config.publishableKey);
    const { data: { user } } = await db.auth.getUser();
    if (!user) return location.replace(`login.html?next=${encodeURIComponent(location.pathname.split('/').pop() + location.search)}`);
    const { data: isAdmin, error } = await db.rpc('is_host_admin');
    if (error || !isAdmin) {
      await db.auth.signOut();
      return location.replace('login.html?error=forbidden');
    }
    window.trippickHostDb = db;
    document.documentElement.style.visibility = '';
    document.dispatchEvent(new CustomEvent('trippick-host-authorized', { detail: { db, user } }));
    renderMembers(db);
    renderConsults(db);
    document.querySelectorAll('.host-logout').forEach(link => link.addEventListener('click', async event => {
      event.preventDefault();
      await db.auth.signOut();
      location.replace('login.html');
    }));
  }

  async function renderMembers(db) {
    const table = document.getElementById('hostMemberTable');
    if (!table) return;
    const { data, error } = await db.rpc('host_list_members');
    if (error) return;
    document.querySelectorAll('#memberNavCount').forEach(el => { el.textContent = data.length; });
    table.innerHTML = `<div class="host-member-table"><div class="host-member-row host-member-head"><span>회원 아이디</span><span>마스킹 이메일</span><span>가입 방법</span><span>가입일</span><span>상태</span></div>${data.map(member => `<div class="host-member-row" data-provider="${esc(member.signup_provider)}" data-member-search="${esc(`${member.display_name} ${member.masked_email}`)}"><strong>${esc(member.display_name)}</strong><span>${esc(member.masked_email)}</span><span><i class="host-member-provider">${esc(member.signup_provider)}</i></span><span>${formatDate(member.joined_at)}</span><span>활성</span></div>`).join('')}</div>`;
  }

  async function renderConsults(db) {
    const list = document.querySelector('.host-consult-list');
    if (!list) return;
    const { data, error } = await db.rpc('host_list_board_posts');
    if (error) return;
    if (!data.length) { list.innerHTML = '<p class="host-empty">등록된 상담 문의가 없습니다.</p>'; return; }
    const show = post => {
      const name = document.getElementById('consultGuestName');
      const thread = document.querySelector('.host-consult-thread');
      if (name) name.textContent = post.author_name;
      if (thread) thread.innerHTML = `<div class="host-chat host-chat-guest"><p><strong>${esc(post.title)}</strong><br>${esc(post.body)}</p><time>${formatDate(post.created_at)}</time></div>${post.admin_answer ? `<div class="host-chat host-chat-admin"><p>${esc(post.admin_answer)}</p></div>` : ''}`;
      const form = document.querySelector('.host-consult-reply-form');
      if (form) form.dataset.postId = post.id;
    };
    list.innerHTML = data.map((post, index) => `<div class="host-consult-item${index === 0 ? ' active' : ''}" tabindex="0" role="button" data-post-id="${post.id}"><div class="host-consult-item-top"><strong>${esc(post.author_name)}</strong><time>${formatDate(post.created_at)}</time></div><p>${esc(post.title)}</p><span>${esc(post.category)} · ${post.status === 'answered' ? '답변 완료' : '답변 대기'}</span></div>`).join('');
    list.querySelectorAll('.host-consult-item').forEach(item => item.addEventListener('click', () => show(data.find(post => post.id === Number(item.dataset.postId)))));
    show(data[0]);
    const form = document.querySelector('.host-consult-reply-form');
    form?.addEventListener('submit', async event => {
      event.preventDefault(); event.stopImmediatePropagation();
      const answer = form.querySelector('textarea')?.value.trim();
      const postId = Number(form.dataset.postId);
      if (!answer || !postId) return;
      const { error: answerError } = await db.rpc('host_answer_board_post', { p_post_id: postId, p_answer: answer });
      if (answerError) return alert('답변 저장에 실패했습니다.');
      form.reset(); await renderConsults(db);
    }, true);
  }

  document.documentElement.style.visibility = 'hidden';
  document.addEventListener('DOMContentLoaded', requireAdmin);
})();
