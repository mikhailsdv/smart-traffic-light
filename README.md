# Smart Traffic Light

Traffic light controller for three smart home lamps: red, yellow, and green.

## Setup

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example`.

## Tasmota

Flash ESP32 with Tasmota using this installer:

https://tasmota.github.io/install/

## Usage

Run `cycle` locally with Tasmota:

```bash
npm run dev -- --script cycle --provider tasmota
```

Run `cycle` locally with Yandex:

```bash
npm run dev -- --script cycle --provider yandex
```

Run Telegram heart listener locally:

```bash
npm run dev -- --script telegram-hearts --provider yandex
```

Run Happy Birthday mode locally:

```bash
npm run dev -- --script happyBirthday --provider yandex
```

Build and run compiled code:

```bash
npm run build
npm run start -- --script cycle --provider yandex
npm run start -- --script telegram-hearts --provider yandex
npm run start -- --script happyBirthday --provider yandex
```

## Web UI

The web UI has a floating provider switch for `Tasmota` and `Yandex`.

```bash
npm run dev:web
npm run start:web
```

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
7. Tokens will be saved to `.tokens/yandex.json`. This directory is ignored by git.
8. Check access:
   ```bash
   npm run yandex:user-info
   ```
9. Find the `Светофор` group and its lamp ids:
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

A new heart message interrupts the previous blink sequence.

Animated heart messages do the same blink sequence.

## VPS Docker

On VPS, set these values in `.env`:

```env
YANDEX_CLIENT_ID=
YANDEX_CLIENT_SECRET=
YANDEX_REFRESH_TOKEN=
TELEGRAM_API_ID=
TELEGRAM_API_HASH=
TELEGRAM_CHAT_ID=5105631123
YANDEX_RED_DEVICE_ID=
YANDEX_YELLOW_DEVICE_ID=
YANDEX_GREEN_DEVICE_ID=
```

The Docker Compose service runs:

```bash
node dist/index.js --script cycle --provider yandex
```

Start or restart it:

```bash
npm run docker
```

Check logs:

```bash
docker compose logs -f traffic-light
```