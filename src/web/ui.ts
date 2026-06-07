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
  <script>
    let states = { red: false, yellow: false, green: false };
    let provider = localStorage.getItem('traffic-light-provider') || 'tasmota';
    function updateUI() {
      for (const color in states) {
        const element = document.getElementById(color);
        if (states[color]) element.classList.add('active');
        else element.classList.remove('active');
      }
    }
    function updateProviderUI() {
      document.getElementById('provider-tasmota').classList.toggle('active', provider === 'tasmota');
      document.getElementById('provider-yandex').classList.toggle('active', provider === 'yandex');
    }
    function selectProvider(nextProvider) {
      provider = nextProvider;
      localStorage.setItem('traffic-light-provider', provider);
      updateProviderUI();
    }
    window.onload = function() {
      updateProviderUI();
      fetch('/status').then(res => res.json()).then(data => { states = data; updateUI(); });
    };
    function clickLamp(color) {
      const payload = { provider }; payload[color] = !states[color];
      fetch('/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(res => res.json()).then(data => { states = data; updateUI(); });
    }
    setInterval(() => {
      fetch('/status').then(res => res.json()).then(data => { states = data; updateUI(); });
    }, 1500);
  </script>
</body>
</html>`;
