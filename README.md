Install Tasmota
https://tasmota.github.io/install/

## Usage

Create `.env` from `.env.example` and set `TASMOTA_HOST` or Yandex credentials.

Run in dev mode:

```bash
npm run dev -- --script cycle --provider tasmota
npm run dev -- --script red --provider tasmota
npm run dev -- --script green --provider yandex
```

Run web UI:

```bash
npm run dev:web
```

Build and run:

```bash
npm run build
npm run start -- --script cycle --provider tasmota
npm run start:web
```

Run with Docker Compose:

```bash
npm run docker
```