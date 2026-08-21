(() => {
  const lessonButtons = Array.from(document.querySelectorAll('.guide-video-select'));
  const detail = document.getElementById('guideVideoDetail');
  const frame = document.getElementById('guideVideoFrame');
  const lesson = document.getElementById('guideVideoLesson');
  const title = document.getElementById('guideVideoTitle');
  const description = document.getElementById('guideVideoDescription');
  const points = document.getElementById('guideVideoPoints');

  if (!lessonButtons.length || !detail || !frame || !lesson || !title || !description || !points) return;

  // 가이드 영상은 오디오가 재생되지 않도록 항상 음소거 상태를 유지한다.
  document.querySelectorAll('video[data-force-muted="true"]').forEach((video) => {
    const enforceMuted = () => {
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;
    };
    enforceMuted();
    video.addEventListener('loadedmetadata', enforceMuted);
    video.addEventListener('play', enforceMuted);
    video.addEventListener('volumechange', () => {
      if (!video.muted || video.volume !== 0) enforceMuted();
    });
  });

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
