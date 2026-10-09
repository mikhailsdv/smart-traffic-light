# Smart Traffic Light

Traffic light controller for three smart home lamps: red, yellow, and green.

## Setup

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example`.

## Hardware

Wiring diagram, parts list, Tasmota flashing and step-by-step build guide: [docs/hardware.md](docs/hardware.md).

## Scenarios

| Script | What it does | Required `.env` |
|---|---|---|
| `cycle` | Red → yellow → green, 3 seconds each | — |
| `happyBirthday` | Random pairs of lamps every 3 seconds | — |
| `traffic` | City traffic level from Yandex: 0–3 green, 4–6 yellow, 7–10 red | `TRAFFIC_REGION_ID` |
| `airQuality` | City air quality (US AQI) from WAQI: 0–50 green, 51–100 yellow, above 100 red | `AIR_QUALITY_CITY`, `WAQI_TOKEN` |
| `telegram-hearts` | Blinks a lamp when a heart emoji arrives in Telegram | `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_CHAT_ID` |

Every script also needs the variables of its provider:

- `tasmota`: `TASMOTA_HOST`
- `yandex`: `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`, `YANDEX_REFRESH_TOKEN`, `YANDEX_RED_DEVICE_ID`, `YANDEX_YELLOW_DEVICE_ID`, `YANDEX_GREEN_DEVICE_ID`

## Usage

Run a script in watch mode:

```bash
npm run dev -- --script <script> --provider tasmota|yandex
```

Examples:

```bash
npm run dev -- --script cycle --provider tasmota
npm run dev -- --script happyBirthday --provider yandex
npm run dev -- --script traffic --provider yandex
npm run dev -- --script airQuality --provider yandex
npm run dev -- --script telegram-hearts --provider yandex
```

Build and run compiled code:

```bash
npm run build
npm run start -- --script <script> --provider yandex
```

## Web UI

```bash
npm run dev:web
npm run start:web
```

Opens on `http://localhost:3000`; set `PORT` in `.env` to change the port.

- The header shows the current mode and has the `Tasmota` / `Yandex` provider switch and a light/dark theme toggle.
- Tap a lamp to toggle it.
- "Сценарии" starts `cycle`, `happyBirthday`, `traffic` or `airQuality` inside the web server; the red button stops the running scenario and turns all lamps off. Tapping a lamp also stops the scenario.
- "Все лампы" turns all lamps on or off at once.
- Lamp state is read from the selected provider every 5 seconds, so changes made from the Yandex app or by voice show up in the UI.

The web UI has no authentication. Do not expose it beyond your local network.

## Yandex OAuth

OAuth is done locally once. The VPS only needs Yandex credentials and lamp ids in `.env`.

Useful local commands:

```bash
npm run yandex:oauth-url
npm run yandex:exchange-code -- <code>
npm run yandex:user-info
npm run yandex:traffic-light-group
```

Authorization flow:

1. Create `.env` from `.env.example`.
2. Set `YANDEX_CLIENT_ID` and `YANDEX_CLIENT_SECRET`.
3. Run:
   ```bash
   npm run yandex:oauth-url
   ```
4. Open the printed URL in a browser and allow access to smart home devices.
5. Copy `code` from the redirect URL.
6. Exchange it for tokens:
   ```bash
   npm run yandex:exchange-code -- <code>
   ```
7. Copy the printed `YANDEX_REFRESH_TOKEN=...` line into `.env`.
8. Check access:
   ```bash
   npm run yandex:user-info
   ```
9. Find the lamp ids and put them into `YANDEX_RED_DEVICE_ID`, `YANDEX_YELLOW_DEVICE_ID` and `YANDEX_GREEN_DEVICE_ID`. `npm run yandex:user-info` lists all devices; if the lamps are in the `Светофор` group, this prints only them:
   ```bash
   npm run yandex:traffic-light-group
   ```

## Telegram Userbot

Set these values in `.env`:

```env
TELEGRAM_API_ID=
TELEGRAM_API_HASH=
TELEGRAM_CHAT_ID=5105631123
```

Run the listener:

```bash
npm run dev -- --script telegram-hearts --provider yandex
```

On first login, scan the QR code printed in the terminal. The Telegram session is stored in `.sessions/telegram.session`; this directory is ignored by git and mounted into Docker Compose.

The listener reacts only to messages from `TELEGRAM_CHAT_ID`:

- `❤️` blinks the red lamp 3 times
- `💛` blinks the yellow lamp 3 times
- `💚` blinks the green lamp 3 times

A new heart message interrupts the previous blink sequence. Animated heart messages do the same blink sequence.

## Traffic

The `traffic` script uses the unofficial Yandex endpoint `export.yandex.ru/bar/reginfo.xml`; it may change or stop working without notice. Set `TRAFFIC_REGION_ID` to the Yandex region id (Almaty `162`, Moscow `213`) and check that the region has traffic data:

```bash
curl -sS -A "Mozilla/5.0" "https://export.yandex.ru/bar/reginfo.xml?region=162"
```

The response must contain `<level>` inside `<traffic>`. The script polls every 5 minutes.

## Air Quality

The `airQuality` script uses the [WAQI API](https://aqicn.org/api/). Get a free token at https://aqicn.org/data-platform/token/ and set:

```env
AIR_QUALITY_CITY=almaty
WAQI_TOKEN=
```

`AIR_QUALITY_CITY` can also be `geo:<lat>;<lon>` for the nearest station or `@<station id>` for a specific station. Check the response:

```bash
curl -sS "https://api.waqi.info/feed/almaty/?token=<token>"
```

The response must have `"status":"ok"` and a number in `"aqi"`. The script polls every 10 minutes.

If `traffic` or `airQuality` cannot get data, all lamps are turned off and the request is retried every minute.

## VPS Docker

VPS uses only the Yandex provider. Set these values in `.env`:

```env
YANDEX_CLIENT_ID=
YANDEX_CLIENT_SECRET=
YANDEX_REFRESH_TOKEN=
YANDEX_RED_DEVICE_ID=
YANDEX_YELLOW_DEVICE_ID=
YANDEX_GREEN_DEVICE_ID=
```

Add the variables of the script you run (see [Scenarios](#scenarios)):

```env
TRAFFIC_REGION_ID=162
AIR_QUALITY_CITY=almaty
WAQI_TOKEN=
TELEGRAM_API_ID=
TELEGRAM_API_HASH=
TELEGRAM_CHAT_ID=
```

`TASMOTA_HOST` is not needed on VPS.

The Docker Compose service runs `cycle` by default and starts switching real lamps right away:

```bash
node dist/index.js --script cycle --provider yandex
```

To run another script, change `command` in `compose.yaml`, for example:

```yaml
command: ["node", "dist/index.js", "--script", "traffic", "--provider", "yandex"]
```

For `telegram-hearts`, the login QR code is printed in the container logs on the first start; scan it once. The session is saved to `.sessions/`, which is mounted from the host, so restarts do not need a new login.

Start or restart it:

```bash
npm run docker
```

Check logs:

```bash
docker compose logs -f traffic-light
```
