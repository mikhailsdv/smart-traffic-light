export const trafficLightUi = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Светофор</title>
  <style>
    html, body { width: 100%; height: 100vh; margin: 0; padding: 0; overflow: hidden; background-color: #ffffff; }
    body { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; display: flex; justify-content: center; align-items: center; }
    .traffic-light { background-color: #1a1a1a; width: 140px; padding: 25px 0; border-radius: 70px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); display: flex; flex-direction: column; align-items: center; gap: 20px; }
    .lamp { width: 90px; height: 90px; border-radius: 50%; border: none; cursor: pointer; transition: all 0.25s ease; outline: none; -webkit-tap-highlight-color: transparent; }
    .lamp.red { background-color: #4a2323; }
    .lamp.yellow { background-color: #4a421b; }
    .lamp.green { background-color: #1b3825; }
    .lamp.red.active { background-color: #ff3b30; box-shadow: 0 0 25px #ff3b30; }
    .lamp.yellow.active { background-color: #ffcc00; box-shadow: 0 0 25px #ffcc00; }
    .lamp.green.active { background-color: #34c759; box-shadow: 0 0 25px #34c759; }
    .provider-switch { position: fixed; top: 18px; left: 50%; transform: translateX(-50%); display: flex; gap: 4px; padding: 5px; border-radius: 999px; background: rgba(26,26,26,0.88); box-shadow: 0 8px 24px rgba(0,0,0,0.18); backdrop-filter: blur(10px); }
    .provider-switch button { min-width: 86px; padding: 10px 16px; border: none; border-radius: 999px; background: transparent; color: #d7d7d7; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; -webkit-tap-highlight-color: transparent; }
    .provider-switch button.active { background: #ffffff; color: #111111; box-shadow: 0 4px 14px rgba(0,0,0,0.2); }
    .actions { position: fixed; bottom: 18px; left: 16px; right: 16px; display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
    .actions button { min-width: 86px; padding: 15px 20px; border: none; border-radius: 999px; background: rgba(26,26,26,0.88); color: #d7d7d7; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,0.18); backdrop-filter: blur(10px); transition: all 0.2s ease; -webkit-tap-highlight-color: transparent; white-space: nowrap; }
    .actions button:active, .actions button.active { background: #ffffff; color: #111111; }
    .actions button:disabled { opacity: 0.45; cursor: default; }
    .actions .break { flex-basis: 100%; height: 0; }
  </style>
</head>
<body>
  <div class="provider-switch">
    <button id="provider-tasmota" onclick="selectProvider('tasmota')">Tasmota</button>
    <button id="provider-yandex" onclick="selectProvider('yandex')">Yandex</button>
  </div>
  <div class="traffic-light">
    <button id="red" class="lamp red" onclick="clickLamp('red')"></button>
    <button id="yellow" class="lamp yellow" onclick="clickLamp('yellow')"></button>
    <button id="green" class="lamp green" onclick="clickLamp('green')"></button>
  </div>
  <div class="actions">
    <button data-script="cycle" onclick="startScript('cycle')">Цикл</button>
    <button data-script="happyBirthday" onclick="startScript('happyBirthday')">С днём рождения</button>
    <button id="stop-script" onclick="stopScript()">Стоп</button>
    <div class="break"></div>
    <button onclick="setAll(true)">Включить все</button>
    <button onclick="setAll(false)">Выключить все</button>
  </div>
  <script>
    let states = { red: false, yellow: false, green: false };
    let runningScript = null;
    let provider = localStorage.getItem('traffic-light-provider') || 'tasmota';
    let stateVersion = 0;
    let pendingToggles = 0;
    const pollIntervalMs = 5000;
    function updateUI() {
      for (const color of ['red', 'yellow', 'green']) {
        document.getElementById(color).classList.toggle('active', Boolean(states[color]));
      }
      for (const button of document.querySelectorAll('[data-script]')) {
        button.classList.toggle('active', button.dataset.script === runningScript);
      }
      document.getElementById('stop-script').disabled = !runningScript;
    }
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
      states = data.lamps;
      runningScript = data.script;
      updateUI();
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
    async function pollState() {
      await refreshState();
      setTimeout(pollState, pollIntervalMs);
    }
    window.onload = function() {
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
  </script>
</body>
</html>`;
