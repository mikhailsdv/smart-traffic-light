let states = { red: false, yellow: false, green: false };
let runningScript = null;
let provider = localStorage.getItem('traffic-light-provider') || 'tasmota';
let stateVersion = 0;
let pendingToggles = 0;
const pollIntervalMs = 5000;
const scriptPollIntervalMs = 1000;
const scriptTitles = { cycle: 'Цикл', happyBirthday: 'С днём рождения', traffic: 'Пробки', airQuality: 'Воздух' };
let pollTimer = null;
let polling = false;
function updateUI() {
  for (const color of ['red', 'yellow', 'green']) {
    document.getElementById(color).classList.toggle('active', Boolean(states[color]));
  }
  for (const button of document.querySelectorAll('[data-script]')) {
    button.classList.toggle('active', button.dataset.script === runningScript);
  }
  document.getElementById('stop-script').disabled = !runningScript;
  document.getElementById('mode').classList.toggle('running', Boolean(runningScript));
  document.getElementById('mode-text').textContent = runningScript
    ? 'Идёт: ' + (scriptTitles[runningScript] || runningScript)
    : 'Ручное управление';
  document.getElementById('hint').textContent = runningScript
    ? 'Нажатие на лампу остановит сценарий'
    : 'Нажмите на лампу, чтобы переключить её';
}
function toggleTheme() {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
  try { localStorage.setItem(themeStorageKey, theme); } catch (error) { console.error(error); }
}
systemDarkQuery.addEventListener('change', (event) => {
  if (!getStoredTheme()) applyTheme(event.matches ? 'dark' : 'light');
});
function updateProviderUI() {
  document.getElementById('provider-tasmota').classList.toggle('active', provider === 'tasmota');
  document.getElementById('provider-yandex').classList.toggle('active', provider === 'yandex');
}
function selectProvider(nextProvider) {
  provider = nextProvider;
  localStorage.setItem('traffic-light-provider', provider);
  updateProviderUI();
  stateVersion++;
  refreshState();
}
function applyState(data, version) {
  if (data.error || version !== stateVersion) return;
  const scriptChanged = data.script !== runningScript;
  states = data.lamps;
  runningScript = data.script;
  updateUI();
  if (scriptChanged && runningScript) {
    const card = document.querySelector('[data-script="' + runningScript + '"]');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }
  if (scriptChanged && !polling) schedulePoll();
}
async function refreshState() {
  const version = stateVersion;
  try {
    const res = await fetch('/status?provider=' + encodeURIComponent(provider));
    const data = await res.json();
    if (pendingToggles === 0) applyState(data, version);
  } catch (error) {
    console.error(error);
  }
}
function schedulePoll() {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(pollState, runningScript ? scriptPollIntervalMs : pollIntervalMs);
}
async function pollState() {
  polling = true;
  await refreshState();
  polling = false;
  schedulePoll();
}
window.onload = function() {
  applyTheme(document.documentElement.dataset.theme);
  updateProviderUI();
  updateUI();
  pollState();
};
function sendAction(path, payload) {
  const version = ++stateVersion;
  pendingToggles++;
  fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ provider }, payload)) })
  .then(res => res.json()).then(data => applyState(data, version)).catch(error => console.error(error))
  .finally(() => { pendingToggles--; });
}
function clickLamp(color) {
  sendAction('/toggle', { [color]: !states[color] });
}
function setAll(enabled) {
  sendAction('/toggle', { red: enabled, yellow: enabled, green: enabled });
}
function startScript(script) {
  sendAction('/scripts/start', { script });
}
function stopScript() {
  sendAction('/scripts/stop', {});
}
