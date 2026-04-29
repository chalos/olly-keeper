const ALARM_NAME = "animatepop_alarm";
const STATE_KEY = "state";
const STATE_UNTIL_KEY = "stateUntil";

const STATE_COOLDOWN = "cooldown";
const STATE_PLAYING = "playing";

const DEFAULTS = { cooldownMinutes: 15, playingMinutes: 1 };

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULTS, resolve);
  });
}

function getState() {
  return new Promise((resolve) => {
    chrome.storage.session.get(
      { [STATE_KEY]: STATE_COOLDOWN, [STATE_UNTIL_KEY]: 0 },
      (items) => resolve({ state: items[STATE_KEY], stateUntil: items[STATE_UNTIL_KEY] })
    );
  });
}

function setState(state, stateUntil) {
  return new Promise((resolve) => {
    chrome.storage.session.set({ [STATE_KEY]: state, [STATE_UNTIL_KEY]: stateUntil }, resolve);
  });
}

function scheduleAlarm(delayMinutes) {
  chrome.alarms.clear(ALARM_NAME, () => {
    chrome.alarms.create(ALARM_NAME, { delayInMinutes: delayMinutes });
  });
}

async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
  } catch (e) {
    // Protected pages (chrome://, store, file://, etc.) can't be scripted.
    throw e;
  }
}

async function sendPlay(tabId, remainingMinutes) {
  const message = { action: "play_video", duration: remainingMinutes };
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (e) {
    // Likely no content script in this tab yet (tab loaded before extension
    // install/reload). Inject and retry.
    try {
      await ensureContentScript(tabId);
      await chrome.tabs.sendMessage(tabId, message);
    } catch (e2) {
      console.log(`AnimatePop: cannot play on tab ${tabId}:`, e2.message);
    }
  }
}

function broadcastPlay(remainingMinutes) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id != null) sendPlay(tab.id, remainingMinutes);
    }
  });
}

function broadcastStop() {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id == null) continue;
      chrome.tabs.sendMessage(tab.id, { action: "stop_video" }).catch(() => {});
    }
  });
}

function remainingMinutesUntil(ts) {
  const ms = ts - Date.now();
  return ms > 0 ? ms / 60000 : 0;
}

async function enterCooldown() {
  const { cooldownMinutes } = await getSettings();
  const stateUntil = Date.now() + cooldownMinutes * 60 * 1000;
  await setState(STATE_COOLDOWN, stateUntil);
  scheduleAlarm(cooldownMinutes);
  console.log(`AnimatePop: cooldown for ${cooldownMinutes}m.`);
}

async function enterPlaying() {
  const { playingMinutes } = await getSettings();
  const stateUntil = Date.now() + playingMinutes * 60 * 1000;
  await setState(STATE_PLAYING, stateUntil);
  scheduleAlarm(playingMinutes);
  broadcastPlay(playingMinutes);
  console.log(`AnimatePop: playing for ${playingMinutes}m.`);
}

async function onAlarm() {
  const { state } = await getState();
  if (state === STATE_PLAYING) {
    await enterCooldown();
  } else {
    await enterPlaying();
  }
}

async function maybePlayOnTab(tabId) {
  const { state, stateUntil } = await getState();
  if (state !== STATE_PLAYING) return;
  const remaining = remainingMinutesUntil(stateUntil);
  if (remaining > 0) sendPlay(tabId, remaining);
}

chrome.runtime.onInstalled.addListener(async () => {
  await enterCooldown();
});

chrome.runtime.onStartup.addListener(async () => {
  // Session storage is cleared on browser restart; re-prime the cycle.
  await enterCooldown();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) onAlarm();
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  maybePlayOnTab(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") maybePlayOnTab(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('AnimatePop bg: received', message.action);
  if (message.action === "settings_changed") {
    getState().then(({ state }) => {
      if (state === STATE_COOLDOWN) enterCooldown();
      sendResponse({ ok: true });
    });
    return true;
  }
  if (message.action === "test_play") {
    enterPlaying().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.action === "stop_playing") {
    broadcastStop();
    enterCooldown().then(() => {
      console.log('AnimatePop bg: stopped, now in cooldown');
      sendResponse({ ok: true });
    });
    return true;
  }
});
