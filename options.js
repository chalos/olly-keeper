const DEFAULTS = { cooldownMinutes: 15, playingMinutes: 1 };

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(DEFAULTS, (items) => {
    document.getElementById('cooldownMinutes').value = items.cooldownMinutes;
    document.getElementById('playingMinutes').value = items.playingMinutes;
  });
});

document.getElementById('save').addEventListener('click', () => {
  const cooldownMinutes = parseFloat(document.getElementById('cooldownMinutes').value);
  const playingMinutes = parseFloat(document.getElementById('playingMinutes').value);

  if (isNaN(cooldownMinutes) || cooldownMinutes <= 0) {
    alert('Please enter a valid pop-up interval (greater than 0).');
    return;
  }
  if (isNaN(playingMinutes) || playingMinutes <= 0) {
    alert('Please enter a valid playing interval (greater than 0).');
    return;
  }

  chrome.storage.sync.set({ cooldownMinutes, playingMinutes }, () => {
    showStatus('Settings saved.');
    chrome.runtime.sendMessage({ action: 'settings_changed' });
  });
});

document.getElementById('testBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'test_play' });
  showStatus('Test triggered!');
});

document.getElementById('stopBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'stop_playing' });
  showStatus('Stopped.');
});

function showStatus(msg) {
  const status = document.getElementById('status');
  status.textContent = msg;
  setTimeout(() => { status.textContent = ''; }, 2000);
}

function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function renderStateInfo() {
  const el = document.getElementById('stateInfo');
  const stopBtn = document.getElementById('stopBtn');
  chrome.storage.session.get({ state: 'cooldown', stateUntil: 0 }, (items) => {
    const remaining = items.stateUntil - Date.now();
    const when = new Date(items.stateUntil);
    const isPlaying = items.state === 'playing' && remaining > 0;
    if (isPlaying) {
      el.textContent = `Playing — ends at ${when.toLocaleTimeString()} (in ${formatCountdown(remaining)})`;
    } else {
      el.textContent = `Cooldown — next play at ${when.toLocaleTimeString()} (in ${formatCountdown(remaining)})`;
    }
    stopBtn.disabled = !isPlaying;
  });
}

renderStateInfo();
setInterval(renderStateInfo, 1000);
