let activeTeardown = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "play_video") {
    playOverlayVideo(message.duration || 1);
  } else if (message.action === "stop_video") {
    if (activeTeardown) activeTeardown();
  }
});

async function loadVideoList() {
  const url = chrome.runtime.getURL('assets/videos.json');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load videos.json: ${res.status}`);
  const list = await res.json();
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('videos.json is empty or malformed');
  }
  return list;
}

function pickRandom(list, exclude) {
  if (list.length === 1) return list[0];
  const candidates = exclude ? list.filter(v => v !== exclude) : list;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

async function playOverlayVideo(durationMinutes) {
  if (document.getElementById('animatepop-overlay')) return;

  let videos;
  try {
    videos = await loadVideoList();
  } catch (e) {
    console.error('AnimatePop:', e);
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'animatepop-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
  overlay.style.zIndex = '2147483647';
  overlay.style.pointerEvents = 'auto';
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 0.5s ease-in-out';

  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = true;
  video.setAttribute('muted', '');
  video.playsInline = true;
  video.style.position = 'absolute';
  video.style.top = '50%';
  video.style.left = '50%';
  video.style.transform = 'translate(-50%, -50%)';
  video.style.maxWidth = '90%';
  video.style.maxHeight = '90%';
  video.style.display = 'block';

  const deadline = Date.now() + durationMinutes * 60 * 1000;
  let currentName = null;
  let stopped = false;

  function loadNext() {
    if (stopped || Date.now() >= deadline) return;
    currentName = pickRandom(videos, currentName);
    console.log('AnimatePop: playing', currentName);
    video.src = chrome.runtime.getURL('assets/' + currentName);
    video.load();
    video.play().catch(e => console.error('AnimatePop autoplay failed:', e));
  }

  video.oncanplay = () => {
    overlay.style.opacity = '1';
  };

  video.onended = () => {
    if (Date.now() >= deadline) {
      teardown();
      return;
    }
    loadNext();
  };

  video.onerror = (e) => {
    console.error('AnimatePop: Video error', e);
    teardown();
  };

  function teardown() {
    if (stopped) return;
    stopped = true;
    activeTeardown = null;
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 500);
  }
  activeTeardown = teardown;

  overlay.appendChild(video);
  (document.body || document.documentElement).appendChild(overlay);

  loadNext();

  setTimeout(teardown, durationMinutes * 60 * 1000);
}
