// firebase-messaging-sw.js
// Service Worker for Firebase Cloud Messaging (FCM) push notifications.
//
// SETUP INSTRUCTIONS:
//   1. Replace the Firebase config below with your project's config from:
//      Firebase Console → Project Settings → Your apps → Firebase SDK snippet
//   2. Deploy this file to the root of your site so it is accessible at /firebase-messaging-sw.js
//   3. Make sure your VAPID key in the main app matches the one in Firebase Console → Cloud Messaging

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
// Import Firebase scripts (keep versions in sync with your app)
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Replace with your actual Firebase project config
firebase.initializeApp({
  apiKey:            'AIzaSyDPYS2zUzJXZ9Zold_N1EjVCIHLKTH3Cpw',
  authDomain:        'minasshow-box.firebaseapp.com',
  projectId:         'minasshow-box',
  storageBucket:     'minasshow-box.firebasestorage.app',
  messagingSenderId: '194477969451',
  appId:             '1:194477969451:web:df3295899d7d6b0e39da6e',
});
// ──────────────────────────────────────────────────────────────────────────────

const messaging = firebase.messaging();

// Handle background messages (when the app is not in the foreground)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw] Received background message:', payload);

  const data = payload.data || {};
  const DEFAULT_TITLE = '💌 MinasShow Box';
  const DEFAULT_BODY =
    'روح شوف البوكس بتاعك.\n\nفي رسالة جديدة مستنياك في أوضة العرايس 👀';

  const notificationTitle =
    (typeof data.push_title === 'string' && data.push_title) ||
    (typeof data.title === 'string' && data.title) ||
    payload.notification?.title ||
    DEFAULT_TITLE;
  const notificationBody =
    (typeof data.push_body === 'string' && data.push_body) ||
    (typeof data.body === 'string' && data.body) ||
    payload.notification?.body ||
    DEFAULT_BODY;
  const openUrl =
    (typeof data.url === 'string' && data.url) || '/';

  // Data-only sends: show exactly once here.
  // Legacy `notification` payloads: platform may auto-display; avoid double UI.
  if (
    payload.notification &&
    !(data.push_title || data.push_body || data.title || data.body)
  ) {
    return;
  }

  const notificationOptions = {
    body: notificationBody,
    icon: '/logo.png',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    tag: 'minasshow-box-message',
    renotify: false,
    data: { url: openUrl },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Open the app when the user clicks the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there is already a window open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
