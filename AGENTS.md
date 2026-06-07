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

## Commands

- `npm run dev -- --script cycle --provider tasmota` runs a script in watch mode.
- `npm run dev -- --script cycle --provider yandex` runs the same script through Yandex Smart Home.
- `npm run build` compiles with `tsc`.
- `npm run start -- --script cycle --provider yandex` runs compiled CLI code with the production provider.
- `npm run dev:web` starts the web UI server.
- `npm run start:web` runs the compiled web UI server.
- `npm run docker` runs `docker compose down && docker compose up --build -d`.
- `npm run yandex:oauth-url` prints a Yandex OAuth authorization URL.
- `npm run yandex:exchange-code -- <code>` exchanges an OAuth code for tokens.
- `npm run yandex:user-info` calls `GET https://api.iot.yandex.net/v1.0/user/info`.
- `npm run yandex:traffic-light-group` prints the `Светофор` group id and its lamp ids/names.

## Environment And Secrets

Use `.env.example` as the public template. Do not commit `.env`.

Current env variables:

- `TASMOTA_HOST`
- `YANDEX_CLIENT_ID`
- `YANDEX_CLIENT_SECRET`
- `YANDEX_REFRESH_TOKEN`
- `YANDEX_RED_DEVICE_ID`
- `YANDEX_YELLOW_DEVICE_ID`
- `YANDEX_GREEN_DEVICE_ID`

Yandex tokens are stored in `.tokens/yandex.json` after OAuth exchange or refresh. `.tokens` is ignored by git. Do not print token values in summaries or logs. On VPS, `YANDEX_REFRESH_TOKEN` in `.env` is the source of truth; `.tokens` is only a local cache and should not be required as persistent container state.

## Providers

`TasmotaProvider` is the local HTTP backend. It maps:

- `red` -> `Power1`
- `yellow` -> `Power2`
- `green` -> `Power3`

`YandexProvider` uses Yandex Smart Home API. It does not store a static access token in env; it obtains one via `getYandexAccessToken()` from `src/providers/yandexAuth.ts`.

For Yandex Smart Home, the target traffic light is the group named `Светофор` from `groups`, not the bridge device with the same name from `devices`.

VPS production uses only `YandexProvider`. Keep Tasmota support for local LAN/dev control unless the user explicitly asks to remove it.

## Scripts

Scripts must implement `TrafficLightScript` and be registered in `src/scripts/index.ts`.

The `cycle` script switches `red -> yellow -> green`, waits 1.5 seconds for each color, then awaits `controller.turnOff()` before moving to the next color.

## Web UI

`src/web/server.ts` is intentionally small and can switch between `TasmotaProvider` and `YandexProvider` from the UI. It serves:

- `GET /`
- `GET /status`
- `POST /toggle`

The current server keeps state in memory. If devices are changed outside this process, `/status` may be stale. The UI stores the selected provider in `localStorage` and sends it in `/toggle` payloads.

Before exposing the web UI beyond localhost, add authentication or bind it explicitly to localhost. Basic auth was discussed as the preferred simple option.

## Known Sharp Edges

- `dist/`, `node_modules/`, `.env`, and `.tokens` should not be committed.
- The Docker default command starts the `cycle` script with Yandex, which can immediately control real lamps.
- If files under `src/scripts/` are deleted or consolidated, keep `src/scripts/index.ts` in sync; stale imports break `npm run build`.
- Avoid adding comments unless explicitly requested by the user.
- Do not reformat unrelated files or change existing comments/blank lines unless asked.
