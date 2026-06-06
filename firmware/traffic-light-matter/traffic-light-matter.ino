#include <WiFi.h>
#include <Matter.h>
#include <esp_http_server.h>
#include <ArduinoJson.h>

// Актуальная конфигурация GPIO строго в вашей последовательности
#define RELAY_RED_PIN 10
#define RELAY_YELLOW_PIN 1
#define RELAY_GREEN_PIN 0

// Ваша Wi-Fi сеть
const char* ssid = "";
const char* password = "";

// Объявляем три независимых объекта ламп для Matter
MatterOnOffLight red_light;
MatterOnOffLight yellow_light;
MatterOnOffLight green_light;

bool redState = false;
bool yellowState = false;
bool greenState = false;

httpd_handle_t server = NULL;
bool webServerStarted = false; 

void setRelayState(int pin, bool state) {
  if (state) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, LOW); // Срабатывает от нуля (LOW)
  } else {
    pinMode(pin, INPUT);    // Высокое сопротивление (OFF)
  }
}

void updateMatterEndpoints() {
  red_light = redState;
  yellow_light = yellowState;
  green_light = greenState;
}

// Коллбэки Matter для ядра 3.3.9 (возвращают bool)
bool onRedChange(bool state) {
  redState = state;
  setRelayState(RELAY_RED_PIN, redState);
  return true;
}

bool onYellowChange(bool state) {
  yellowState = state;
  setRelayState(RELAY_YELLOW_PIN, yellowState);
  return true;
}

bool onGreenChange(bool state) {
  greenState = state;
  setRelayState(RELAY_GREEN_PIN, greenState);
  return true;
}

// --- HTML и UI (Минимализм, белый фон, без скролла) ---
const char root_html[] = R"rawliteral(
<!DOCTYPE html>
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
  </style>
</head>
<body>
  <div class="traffic-light">
    <button id="red" class="lamp red" onclick="clickLamp('red')"></button>
    <button id="yellow" class="lamp yellow" onclick="clickLamp('yellow')"></button>
    <button id="green" class="lamp green" onclick="clickLamp('green')"></button>
  </div>
  <script>
    let states = { red: false, yellow: false, green: false };
    function updateUI() {
      for (const color in states) {
        const element = document.getElementById(color);
        if (states[color]) element.classList.add('active');
        else element.classList.remove('active');
      }
    }
    window.onload = function() {
      fetch('/status').then(res => res.json()).then(data => { states = data; updateUI(); });
    };
    function clickLamp(color) {
      const payload = {}; payload[color] = !states[color];
      fetch('/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(res => res.json()).then(data => { states = data; updateUI(); });
    }
    setInterval(() => {
      fetch('/status').then(res => res.json()).then(data => { states = data; updateUI(); });
    }, 1500);
  </script>
</body>
</html>
)rawliteral";

esp_err_t get_root_handler(httpd_req_t *req) {
  httpd_resp_set_type(req, "text/html");
  return httpd_resp_send(req, root_html, HTTPD_RESP_USE_STRLEN);
}

esp_err_t get_status_handler(httpd_req_t *req) {
  JsonDocument doc;
  doc["red"] = redState;
  doc["yellow"] = yellowState;
  doc["green"] = greenState;
  String response;
  serializeJson(doc, response);
  httpd_resp_set_type(req, "application/json");
  return httpd_resp_send(req, response.c_str(), HTTPD_RESP_USE_STRLEN);
}

esp_err_t post_toggle_handler(httpd_req_t *req) {
  char content[100]; // Массив фиксированной длины под буфер JSON
  int total_len = req->content_len;
  int cur_len = 0;
  int received = 0;
  
  if (total_len >= 100) {
    httpd_resp_send_err(req, HTTPD_500_INTERNAL_SERVER_ERROR, "Too long body");
    return ESP_FAIL;
  }
  
  while (cur_len < total_len) {
    received = httpd_req_recv(req, content + cur_len, total_len - cur_len);
    if (received <= 0) {
      if (received == HTTPD_SOCK_ERR_TIMEOUT) continue;
      return ESP_FAIL;
    }
    cur_len += received;
  }
  content[total_len] = '\0';

  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, content);
  if (!error) {
    if (doc.containsKey("red")) { redState = doc["red"]; setRelayState(RELAY_RED_PIN, redState); }
    if (doc.containsKey("yellow")) { yellowState = doc["yellow"]; setRelayState(RELAY_YELLOW_PIN, yellowState); }
    if (doc.containsKey("green")) { greenState = doc["green"]; setRelayState(RELAY_GREEN_PIN, greenState); }
    updateMatterEndpoints(); 
  }
  return get_status_handler(req);
}

void start_web_server() {
  if (webServerStarted) return; 
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.stack_size = 4096; 
  if (httpd_start(&server, &config) == ESP_OK) {
    httpd_uri_t root_uri = { .uri = "/", .method = HTTP_GET, .handler = get_root_handler, .user_ctx = NULL };   httpd_register_uri_handler(server, &root_uri);
    httpd_uri_t status_uri = { .uri = "/status", .method = HTTP_GET, .handler = get_status_handler, .user_ctx = NULL }; httpd_register_uri_handler(server, &status_uri);
    httpd_uri_t toggle_uri = { .uri = "/toggle", .method = HTTP_POST, .handler = post_toggle_handler, .user_ctx = NULL }; httpd_register_uri_handler(server, &toggle_uri);
    webServerStarted = true;
    Serial.println("Web-сервер запущен!");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1500);

  // Глубокий сброс старых реле при старте
  setRelayState(RELAY_RED_PIN, false);
  setRelayState(RELAY_YELLOW_PIN, false);
  setRelayState(RELAY_GREEN_PIN, false);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.print("\nConnected! IP: ");
  Serial.println(WiFi.localIP());

  // Назначаем эндпоинты
  red_light.begin(1); // Эндпоинт 1 - Красный
  red_light.onChange(onRedChange);

  yellow_light.begin(2); // Эндпоинт 2 - Желтый
  yellow_light.onChange(onYellowChange);

  green_light.begin(3); // Эндпоинт 3 - Зеленый
  green_light.onChange(onGreenChange);

  // Запуск Matter
  Matter.begin();

  Serial.println("\n==============================================");
  Serial.println("         ДАННЫЕ ДЛЯ ПОДКЛЮЧЕНИЯ MATTER         ");
  Serial.println("==============================================");
  
  if (!Matter.isDeviceCommissioned()) {
    Serial.print("Цифровой код для Яндекса (Manual Code): ");
    Serial.println(Matter.getManualPairingCode().c_str());
    Serial.print("Ссылка на QR-код: ");
    Serial.println(Matter.getOnboardingQRCodeUrl().c_str());
  } else {
    Serial.println("Устройство уже успешно привязано к вашему Хабу!");
  }
  Serial.println("==============================================\n");
}

void loop() {
  // Веб-сервер запустится строго ТОЛЬКО после успешного сопряжения с Хабом Яндекса.
  // Это освобождает 100% ресурсов процессора под криптографию на этапе подключения.
  if (!webServerStarted) {
    if (Matter.isDeviceCommissioned()) {
      start_web_server();
    }
  }
  delay(1);
}
