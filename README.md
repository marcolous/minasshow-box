# MinasShow Box

A mobile-first PWA that lets church community members receive anonymous push notifications when someone physically drops a message into their church box. Each box has a QR code; scanning it silently notifies the box owner.

## Key Technologies

| Layer              | Technology                                    |
| ------------------ | --------------------------------------------- |
| Framework          | TanStack Start (React 19, TanStack Router v1) |
| Build              | Vite 7                                        |
| Styling            | Tailwind CSS 4                                |
| Push Notifications | Firebase Cloud Messaging (FCM)                |
| Deployment         | Vercel                                        |

## Pages

| Route                      | Description                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `/`                        | Home — user enters their name, grants notification permission, registers FCM token |
| `/notify.html?token=TOKEN` | QR trigger — auto-sends a notification to the box owner (no UI interaction needed) |

## Local Development

```bash
npm install
npm run dev
```

Or with Vercel CLI (recommended for local function testing):

```bash
vercel dev
```

## Configuration

Before going live, replace the placeholder values in these files:

### `src/routes/index.tsx`

- `FIREBASE_CONFIG` — your Firebase project config object
- `VAPID_KEY` — your VAPID public key (Firebase Console → Cloud Messaging)
- `WEBHOOK_URL` — endpoint that stores the FCM token + username

### `public/firebase-messaging-sw.js`

- Same Firebase config object (needed in the service worker scope)

### `public/notify.html`

- `WEBHOOK_URL` — endpoint that triggers the FCM push to the stored token

## FCM Server-Side

Your webhook endpoint must:

1. **`/register`** — store `{ username, fcmToken }` in a database
2. **`/notify`** — look up the FCM token by the QR `token` param and call Firebase Admin SDK to send the push notification

## Build & Deploy

```bash
npm run build   # outputs to dist/client
```

Push to your Vercel-linked repo to deploy automatically.
