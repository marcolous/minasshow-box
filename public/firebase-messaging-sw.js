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

  const notificationTitle = payload.notification?.title ?? '💌 MinasShow Box';
  const notificationOptions = {
    body: payload.notification?.body ?? 'Someone left you a message in church. Go check your box 👀',
    icon: '/logo.png',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    tag: 'minasshow-box-message',
    // Clicking the notification opens the app
    data: { url: '/' },
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
