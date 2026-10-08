# Project Notes For Agents

## Project Shape

This is a Node.js + TypeScript + ESM project for controlling three smart home lamps as a traffic light: `red`, `yellow`, `green`.

Main code lives in `src/`:

- `src/index.ts` is the CLI entrypoint for running traffic light scripts.
- `src/types.ts` defines shared traffic light types and interfaces.
- `src/controller/SmartTrafficLightController.ts` turns high-level traffic light state into provider calls.
- `src/providers/` contains control backends.
- `src/scripts/` contains traffic light scripts implementing `TrafficLightScript`.
- `src/web/` contains a small HTTP server and embedded UI.
- `src/tools/` contains one-off CLI helpers, mostly for Yandex OAuth.
- `src/utils/` contains small utilities. Keep utility types inline in the same utility file unless splitting is clearly useful.
- `firmware/traffic-light-matter/traffic-light-matter.ino` is an old Arduino/Matter firmware sketch kept for reference.
- `docs/hardware.md` is the hardware build guide: wiring, parts, Tasmota flashing and configuration. `docs/images/wiring.svg` is the wiring diagram; keep its labels in English and keep GPIO/relay mapping in sync with `TasmotaProvider`.

## Commands

- `npm run dev -- --script cycle --provider tasmota` runs a script in watch mode.
- `npm run dev -- --script cycle --provider yandex` runs the same script through Yandex Smart Home.
- `npm run dev -- --script happyBirthday --provider yandex` runs random two-lamp pairs.
- `npm run dev -- --script telegram-hearts --provider yandex` listens to Telegram heart commands.
- `npm run build` compiles with `tsc`.
- `npm run start -- --script cycle --provider yandex` runs compiled CLI code with the production provider.
- `npm run dev:web` starts the web UI server.
- `npm run start:web` runs the compiled web UI server.
- `npm run docker` runs `docker compose down && docker compose up --build -d`.
- `npm run yandex:oauth-url` prints a Yandex OAuth authorization URL.
- `npm run yandex:exchange-code -- <code>` exchanges an OAuth code and prints `YANDEX_REFRESH_TOKEN=...` for `.env`.
- `npm run yandex:user-info` calls `GET https://api.iot.yandex.net/v1.0/user/info`.
- `npm run yandex:traffic-light-group` prints the `Светофор` group id and its lamp ids/names.

## Environment And Secrets

Use `.env.example` as the public template. Do not commit `.env`.

Current env variables:

- `TASMOTA_HOST`
- `TELEGRAM_API_ID`
- `TELEGRAM_API_HASH`
- `TELEGRAM_CHAT_ID`
- `YANDEX_CLIENT_ID`
- `YANDEX_CLIENT_SECRET`
- `YANDEX_REFRESH_TOKEN`
- `YANDEX_RED_DEVICE_ID`
- `YANDEX_YELLOW_DEVICE_ID`
- `YANDEX_GREEN_DEVICE_ID`

`YANDEX_REFRESH_TOKEN` in `.env` is the only persisted Yandex secret. Access tokens are never written to disk: each process exchanges the refresh token for an access token on first use and keeps it in memory. If Yandex returns a new refresh token, it is used for later refreshes within the same process only. Do not print token values in summaries or logs.

Telegram userbot sessions are stored in `.sessions/telegram.session`. `.sessions` is ignored by git and mounted in Docker Compose. Do not commit Telegram session files.

## Providers

`TasmotaProvider` is the local HTTP backend. It maps:

- `red` -> `Power1`
- `yellow` -> `Power2`
- `green` -> `Power3`

`TasmotaProvider.setState(...)` sends all three relays in one `Backlog0 Power1 ...; Power2 ...; Power3 ...` command, so they switch at the same time. Plain `Backlog` adds a delay between commands; do not use it for lamp state changes.

`YandexProvider` uses Yandex Smart Home API. It does not store a static access token in env; it obtains one via `getYandexAccessToken()` from `src/providers/yandexAuth.ts` on every request. `yandexAuth.ts` keeps tokens in memory only, refreshes them shortly before expiry, and shares one in-flight refresh between concurrent callers.

All Yandex IoT API calls go through `requestYandexIot(...)` in `src/providers/yandexApi.ts`. It adds the bearer token, forces a token refresh and retries once on `401`, and throws unless the HTTP status is OK and the top-level `status` is `"ok"`. `/v1.0/devices/actions` returns HTTP 200 even when a lamp fails, so `YandexProvider` also calls `assertYandexActionsDone(...)`, which throws when a sent device is missing from `devices` or any `devices[].capabilities[].state.action_result.status` is not `DONE`.

Providers implement `setLight(...)` and may implement optional `setState(...)`. `SmartTrafficLightController.set(...)` uses `setState(...)` when available; `YandexProvider` sends all three lamps in one `/devices/actions` request, `TasmotaProvider` uses one `Backlog0` command.

Provider names live in `providerNames` in `src/providers/createProvider.ts`; use `isProviderName(...)` instead of hardcoding the list.

All outgoing `fetch` calls use `AbortSignal.timeout(...)`: 5 seconds for Tasmota, 10 seconds for Yandex.

For Yandex Smart Home, the target traffic light is the group named `Светофор` from `groups`, not the bridge device with the same name from `devices`.

VPS production uses only `YandexProvider`. Keep Tasmota support for local LAN/dev control unless the user explicitly asks to remove it.

## Scripts

Scripts must implement `TrafficLightScript` and be registered in `src/scripts/index.ts`.

The `cycle` script switches `red -> yellow -> green`, waits 3 seconds for each color, then awaits `controller.turnOff()` before moving to the next color.

The `happyBirthday` script switches every 3 seconds between random two-lamp pairs and avoids repeating the same pair twice in a row. It uses `controller.set(...)`, not `turnOff()`, so transition requests directly update the three lamp states.

The `telegram-hearts` script logs into a Telegram user account with `@mtcute/node`, prints QR login codes with `qrcode`, listens to `TELEGRAM_CHAT_ID`, and maps `❤️`, `💛`, `💚` to `red`, `yellow`, `green`. Regular heart messages and animated heart/dice messages blink the selected lamp 3 times. New heart commands cancel the previous blink sequence.

## Web UI

`src/web/server.ts` is intentionally small and can switch between `TasmotaProvider` and `YandexProvider` from the UI. It serves:

- `GET /`
- `GET /status`
- `POST /toggle` (requires `Content-Type: application/json`, otherwise `415`)

The current server keeps state in memory. If devices are changed outside this process, `/status` may be stale. The UI stores the selected provider in `localStorage` and sends it in `/toggle` payloads.

Before exposing the web UI beyond localhost, add authentication or bind it explicitly to localhost. Basic auth was discussed as the preferred simple option.

## Known Sharp Edges

- `dist/`, `node_modules/`, and `.env` should not be committed.
- The Docker default command starts the `cycle` script with Yandex, which can immediately control real lamps.
- If files under `src/scripts/` are deleted or consolidated, keep `src/scripts/index.ts` in sync; stale imports break `npm run build`.
- Avoid adding comments unless explicitly requested by the user.
- Do not reformat unrelated files or change existing comments/blank lines unless asked.
