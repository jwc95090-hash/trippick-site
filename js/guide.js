(() => {
  const lessonButtons = Array.from(document.querySelectorAll('.guide-video-select'));
  const detail = document.getElementById('guideVideoDetail');
  const frame = document.getElementById('guideVideoFrame');
  const lesson = document.getElementById('guideVideoLesson');
  const title = document.getElementById('guideVideoTitle');
  const description = document.getElementById('guideVideoDescription');
  const points = document.getElementById('guideVideoPoints');

  if (!lessonButtons.length || !detail || !frame || !lesson || !title || !description || !points) return;

  const selectLesson = (button) => {
    const videoSrc = button.dataset.videoSrc;
    const videoPoster = button.dataset.videoPoster;
    const nextTitle = button.dataset.title;
    const nextPoints = (button.dataset.points || '').split('|').filter(Boolean);

    lessonButtons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });

    lesson.textContent = button.dataset.lesson || '';
    title.textContent = nextTitle || '';
    description.textContent = button.dataset.description || '';
    points.replaceChildren(...nextPoints.map((point) => {
      const item = document.createElement('li');
      item.textContent = point;
      return item;
    }));

    frame.pause();
    frame.poster = videoPoster || '';
    frame.src = videoSrc || '';
    frame.setAttribute('aria-label', `${nextTitle} 영상`);
    frame.load();
    detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  lessonButtons.forEach((button) => {
    button.addEventListener('click', () => selectLesson(button));
  });
})();
