# AGENTS.md

Project architecture guide for AI agents and developers.

## What This Is

**MinasShow Box** — a mobile-first PWA for anonymous church push notifications. People physically drop messages into real church boxes. Each box has a printed QR code. Scanning it triggers a push notification to the box owner via Firebase Cloud Messaging (FCM).

Built with TanStack Start and deployed on Vercel.

## Tech Stack

| Layer              | Technology                                           |
| ------------------ | ---------------------------------------------------- |
| Framework          | TanStack Start (React 19, TanStack Router v1)        |
| Build              | Vite 7                                               |
| Styling            | Tailwind CSS 4 (dark mode via `.dark` class variant) |
| Push notifications | Firebase Cloud Messaging (FCM)                       |
| Language           | TypeScript 5.7 (strict mode)                         |
| Deployment         | Vercel (build: `vite build`, publish: `dist/client`) |

## Directory Layout

```
public/
  firebase-messaging-sw.js   # FCM service worker — handles background push messages
  manifest.json              # PWA manifest (icons, theme, display mode)
  notify.html                # Static QR trigger page — no React, pure HTML/JS
src/
  routes/
    __root.tsx               # Root shell: HTML head (PWA meta, manifest link), body wrapper
    index.tsx                # Home page: name input → notification permission → FCM token registration
  styles.css                 # Tailwind import + dark mode variant declaration
```

## Key Architectural Decisions

### `notify.html` is intentionally static (not a React route)

The QR trigger page loads as vanilla HTML with zero JS framework overhead. Speed matters because users scan and walk away — any hydration delay feels broken. Vercel serves it directly from `dist/client/notify.html`.

### Dark mode via class strategy

Tailwind is configured with `@custom-variant dark (&:where(.dark, .dark *))`. The root div in `index.tsx` toggles the `dark` class via a `prefers-color-scheme` media query listener. No flash of unstyled content.

### Firebase SDK loaded dynamically

In `index.tsx`, Firebase modules are `import()`ed from CDN only when the user clicks "Enable Notifications", keeping the initial bundle small.

### Service worker scope requirement

`firebase-messaging-sw.js` is placed in `public/` so it is served at `/firebase-messaging-sw.js` (site root). FCM mandates root scope for the service worker.

### Placeholder config pattern

All Firebase credentials and webhook URLs are placeholder strings. Locations:

- `src/routes/index.tsx` — `FIREBASE_CONFIG`, `VAPID_KEY`, `WEBHOOK_URL`
- `public/firebase-messaging-sw.js` — `firebase.initializeApp({...})`
- `public/notify.html` — `WEBHOOK_URL`

## Backend Contract

This repo is frontend only. Two webhook endpoints are expected:

| Endpoint         | Called by                          | Payload                                                 |
| ---------------- | ---------------------------------- | ------------------------------------------------------- |
| `POST /register` | Home page after FCM token obtained | `{ username, fcmToken, registeredAt }`                  |
| `POST /notify`   | `notify.html` on QR scan           | `{ token, triggeredAt, notification: { title, body } }` |

The backend stores `(username, fcmToken)` pairs and calls Firebase Admin SDK to send the push.

## Conventions

- **Components**: PascalCase; colocated with route files
- **Utilities**: camelCase
- **Styling**: Tailwind utilities; CSS custom properties for theme tokens
- **TypeScript**: strict mode; `type` keyword for type-only imports; `@/` path alias for `src/*`
- **Comments**: only for non-obvious constraints (e.g., FCM scope requirement, placeholder markers)

## Development Commands

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build → dist/client
vercel dev       # Vercel local emulation for API routes
```
