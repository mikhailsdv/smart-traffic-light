export const trafficLightUi = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta id="theme-color" name="theme-color" content="#f3f3f0">
  <title>Светофор</title>
  <script>
    const themeStorageKey = 'traffic-light-theme';
    const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    function getStoredTheme() {
      try { return localStorage.getItem(themeStorageKey); } catch (error) { return null; }
    }
    function applyTheme(theme) {
      document.documentElement.dataset.theme = theme;
      const meta = document.getElementById('theme-color');
      if (meta) meta.content = theme === 'dark' ? '#0e0e0f' : '#f3f3f0';
    }
    applyTheme(getStoredTheme() || (systemDarkQuery.matches ? 'dark' : 'light'));
  </script>
  <style>
    :root {
      --bg: #f3f3f0;
      --card: #ffffff;
      --card-border: rgba(0,0,0,0.06);
      --text: #141414;
      --muted: #7a7a76;
      --housing: #1a1a1a;
      --housing-edge: #2a2a2a;
      --switch-bg: rgba(26,26,26,0.9);
      --active-card: #141414;
      --active-text: #ffffff;
      --red: #ff3b30;
      --yellow: #ffcc00;
      --green: #34c759;
      --red-off: #4a2323;
      --yellow-off: #4a421b;
      --green-off: #1b3825;
      --shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06);
      --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color-scheme: light;
    }
    :root[data-theme="dark"] {
      --bg: #0e0e0f;
      --card: #1c1c1e;
      --card-border: rgba(255,255,255,0.06);
      --text: #f2f2f2;
      --muted: #8e8e93;
      --housing: #050505;
      --housing-edge: #232323;
      --switch-bg: rgba(44,44,46,0.92);
      --active-card: #f2f2f2;
      --active-text: #111111;
      --shadow: 0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.35);
      color-scheme: dark;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: var(--font); -webkit-font-smoothing: antialiased; }
    button { font-family: inherit; -webkit-tap-highlight-color: transparent; }
    .page { max-width: 440px; min-height: 100vh; min-height: 100dvh; margin: 0 auto; padding: 16px 16px max(20px, env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 18px; }

    .header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 12px; }
    .title { margin: 0; font-size: 22px; font-weight: 750; letter-spacing: -0.02em; }
    .mode { flex-basis: 100%; min-width: 0; display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); }
    .mode-dot { flex: none; width: 7px; height: 7px; border-radius: 50%; background: var(--muted); opacity: 0.6; }
    .mode.running { color: var(--text); font-weight: 600; }
    .mode.running .mode-dot { background: var(--red); opacity: 1; animation: pulse 1.4s ease-in-out infinite; }
    .header-controls { display: flex; align-items: center; gap: 8px; }
    .theme-toggle { flex: none; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; padding: 0; border: none; border-radius: 50%; background: var(--switch-bg); color: #ffffff; cursor: pointer; box-shadow: 0 6px 18px rgba(0,0,0,0.16); transition: transform 0.12s ease; }
    .theme-toggle:active { transform: scale(0.92); }
    .theme-toggle svg { width: 19px; height: 19px; }
    .theme-toggle .icon-sun { display: none; }
    :root[data-theme="dark"] .theme-toggle .icon-sun { display: block; }
    :root[data-theme="dark"] .theme-toggle .icon-moon { display: none; }
    .provider-switch { display: flex; gap: 3px; padding: 4px; border-radius: 999px; background: var(--switch-bg); box-shadow: 0 6px 18px rgba(0,0,0,0.16); }
    .provider-switch button { padding: 8px 13px; border: none; border-radius: 999px; background: transparent; color: #cfcfcf; font-size: 13px; font-weight: 650; cursor: pointer; transition: background 0.2s ease, color 0.2s ease; }
    .provider-switch button.active { background: #ffffff; color: #111111; box-shadow: 0 3px 10px rgba(0,0,0,0.2); }

    .stage { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; min-height: 0; }
    .traffic-light { --lamp: clamp(56px, 9.5vh, 96px); background: linear-gradient(180deg, var(--housing-edge), var(--housing) 18%); padding: calc(var(--lamp) * 0.24) calc(var(--lamp) * 0.27); border-radius: 999px; box-shadow: 0 18px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06); display: flex; flex-direction: column; gap: calc(var(--lamp) * 0.2); }
    .lamp { width: var(--lamp); height: var(--lamp); border-radius: 50%; border: none; cursor: pointer; outline: none; box-shadow: inset 0 -6px 14px rgba(0,0,0,0.35); transition: background-color 0.25s ease, box-shadow 0.25s ease, transform 0.12s ease; }
    .lamp:active { transform: scale(0.95); }
    .lamp.red { background-color: var(--red-off); }
    .lamp.yellow { background-color: var(--yellow-off); }
    .lamp.green { background-color: var(--green-off); }
    .lamp.red.active { background-color: var(--red); box-shadow: 0 0 28px var(--red), inset 0 -6px 14px rgba(0,0,0,0.15); }
    .lamp.yellow.active { background-color: var(--yellow); box-shadow: 0 0 28px var(--yellow), inset 0 -6px 14px rgba(0,0,0,0.12); }
    .lamp.green.active { background-color: var(--green); box-shadow: 0 0 28px var(--green), inset 0 -6px 14px rgba(0,0,0,0.12); }
    .hint { margin: 0; font-size: 13px; color: var(--muted); text-align: center; }

    .section { display: flex; flex-direction: column; gap: 10px; }
    .section-title { margin: 0 2px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .scenario-list { display: flex; gap: 10px; margin: -10px -16px; padding: 10px 16px 14px; overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding: 0 16px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
    .scenario-list::-webkit-scrollbar { display: none; }
    .scenario-list .scenario { flex: 0 0 156px; scroll-snap-align: start; }

    .scenario { display: flex; align-items: flex-start; gap: 12px; padding: 14px; min-height: 92px; border: 1px solid var(--card-border); border-radius: 20px; background: var(--card); color: var(--text); text-align: left; cursor: pointer; box-shadow: var(--shadow); transition: background 0.2s ease, color 0.2s ease, transform 0.12s ease; }
    .scenario:active { transform: scale(0.97); }
    .scenario.active { background: var(--active-card); color: var(--active-text); border-color: transparent; }
    .scenario-name { display: block; font-size: 16px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.2; }
    .scenario-desc { display: block; margin-top: 4px; font-size: 12.5px; line-height: 1.35; color: var(--muted); }
    .scenario.active .scenario-desc { color: inherit; opacity: 0.65; }
    .badge { display: none; align-items: center; gap: 5px; margin-top: 8px; padding: 3px 8px; border-radius: 999px; background: var(--red); color: #ffffff; font-size: 11px; font-weight: 700; }
    .badge::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #ffffff; animation: pulse 1.4s ease-in-out infinite; }
    .scenario.active .badge { display: inline-flex; }
    .scenario-text { min-width: 0; }

    .mini { flex: none; display: flex; flex-direction: column; gap: 3px; padding: 5px 4px; border-radius: 9px; background: var(--housing); }
    .scenario.active .mini { background: #000000; }
    .mini i { width: 10px; height: 10px; border-radius: 50%; opacity: 0.25; }
    .mini i:nth-child(1) { background: var(--red); }
    .mini i:nth-child(2) { background: var(--yellow); }
    .mini i:nth-child(3) { background: var(--green); }
    .mini i.lit { opacity: 1; }
    .scenario.active .mini-cycle i { animation: mini-cycle 9s steps(1) infinite; }
    .scenario.active .mini-cycle i:nth-child(2) { animation-delay: -6s; }
    .scenario.active .mini-cycle i:nth-child(3) { animation-delay: -3s; }
    .scenario.active .mini-pairs i { animation: mini-pairs 3.6s steps(1) infinite; }
    .scenario.active .mini-traffic i.lit { animation: pulse 2s ease-in-out infinite; }
    .scenario.active .mini-pairs i:nth-child(1) { animation-delay: -2.4s; }
    .scenario.active .mini-pairs i:nth-child(2) { animation-delay: -1.2s; }

    .stop { display: flex; align-items: center; justify-content: center; gap: 10px; height: 54px; border: none; border-radius: 18px; background: var(--red); color: #ffffff; font-size: 16px; font-weight: 700; letter-spacing: 0.01em; cursor: pointer; box-shadow: 0 8px 22px rgba(255,59,48,0.32); transition: opacity 0.2s ease, transform 0.12s ease, box-shadow 0.2s ease; }
    .stop::before { content: ""; width: 12px; height: 12px; border-radius: 3px; background: #ffffff; }
    .stop:active:not(:disabled) { transform: scale(0.98); }
    .stop:disabled { opacity: 0.35; cursor: default; box-shadow: none; }

    .power { display: flex; align-items: center; justify-content: center; gap: 10px; height: 56px; border: 1px solid var(--card-border); border-radius: 18px; background: var(--card); color: var(--text); font-size: 15px; font-weight: 650; cursor: pointer; box-shadow: var(--shadow); transition: transform 0.12s ease; }
    .power:active { transform: scale(0.97); }
    .dots { display: inline-flex; gap: 3px; }
    .dots i { width: 9px; height: 9px; border-radius: 50%; }
    .dots i:nth-child(1) { background: var(--red); }
    .dots i:nth-child(2) { background: var(--yellow); }
    .dots i:nth-child(3) { background: var(--green); }
    .dots.on i { box-shadow: 0 0 6px currentColor; }
    .dots.on i:nth-child(1) { color: var(--red); }
    .dots.on i:nth-child(2) { color: var(--yellow); }
    .dots.on i:nth-child(3) { color: var(--green); }
    .dots.off i { background: var(--muted); opacity: 0.35; }

    @media (max-width: 380px) {
      .title { font-size: 20px; }
      .header-controls { gap: 6px; }
      .provider-switch button { padding: 7px 10px; }
      .theme-toggle { width: 36px; height: 36px; }
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    @keyframes mini-cycle { 0% { opacity: 1; } 33.333% { opacity: 0.25; } }
    @keyframes mini-pairs { 0% { opacity: 0.25; } 33.333% { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  </style>
</head>
<body>
  <main class="page">
    <header class="header">
      <h1 class="title">Светофор</h1>
      <div class="header-controls">
        <div class="provider-switch">
          <button id="provider-tasmota" onclick="selectProvider('tasmota')">Tasmota</button>
          <button id="provider-yandex" onclick="selectProvider('yandex')">Yandex</button>
        </div>
        <button class="theme-toggle" onclick="toggleTheme()" aria-label="Переключить тему" title="Переключить тему">
          <svg class="icon-moon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z"/></svg>
          <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>
        </button>
      </div>
      <div id="mode" class="mode"><span class="mode-dot"></span><span id="mode-text">Ручное управление</span></div>
    </header>

    <section class="stage">
      <div class="traffic-light">
        <button id="red" class="lamp red" onclick="clickLamp('red')" aria-label="Красная лампа"></button>
        <button id="yellow" class="lamp yellow" onclick="clickLamp('yellow')" aria-label="Жёлтая лампа"></button>
        <button id="green" class="lamp green" onclick="clickLamp('green')" aria-label="Зелёная лампа"></button>
      </div>
      <p id="hint" class="hint">Нажмите на лампу, чтобы переключить её</p>
    </section>

    <section class="section">
      <h2 class="section-title">Сценарии</h2>
      <div class="scenario-list">
        <button class="scenario" data-script="cycle" onclick="startScript('cycle')">
          <span class="mini mini-cycle"><i class="lit"></i><i></i><i></i></span>
          <span class="scenario-text">
            <span class="scenario-name">Цикл</span>
            <span class="scenario-desc">Красный → жёлтый → зелёный</span>
            <span class="badge">Идёт</span>
          </span>
        </button>
        <button class="scenario" data-script="happyBirthday" onclick="startScript('happyBirthday')">
          <span class="mini mini-pairs"><i class="lit"></i><i class="lit"></i><i></i></span>
          <span class="scenario-text">
            <span class="scenario-name">С днём рождения</span>
            <span class="scenario-desc">Случайные пары ламп</span>
            <span class="badge">Идёт</span>
          </span>
        </button>
        <button class="scenario" data-script="traffic" onclick="startScript('traffic')">
          <span class="mini mini-traffic"><i></i><i></i><i class="lit"></i></span>
          <span class="scenario-text">
            <span class="scenario-name">Пробки</span>
            <span class="scenario-desc">Цвет по баллам Яндекс Пробок</span>
            <span class="badge">Идёт</span>
          </span>
        </button>
      </div>
      <button id="stop-script" class="stop" onclick="stopScript()">Остановить сценарий</button>
    </section>

    <section class="section">
      <h2 class="section-title">Все лампы</h2>
      <div class="grid">
        <button class="power" onclick="setAll(true)"><span class="dots on"><i></i><i></i><i></i></span>Включить</button>
        <button class="power" onclick="setAll(false)"><span class="dots off"><i></i><i></i><i></i></span>Выключить</button>
      </div>
    </section>
  </main>
  <script>
    let states = { red: false, yellow: false, green: false };
    let runningScript = null;
    let provider = localStorage.getItem('traffic-light-provider') || 'tasmota';
    let stateVersion = 0;
    let pendingToggles = 0;
    const pollIntervalMs = 5000;
    const scriptPollIntervalMs = 1000;
    const scriptTitles = { cycle: 'Цикл', happyBirthday: 'С днём рождения', traffic: 'Пробки' };
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
  </script>
</body>
</html>`;
