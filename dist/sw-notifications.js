// VoltBody – Service Worker notification handlers
// Imported by the workbox-generated SW via importScripts.

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow('/');
      }),
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'VoltBody', body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'VoltBody', {
      body: data.body || '',
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: data.tag || 'voltbody',
    }),
  );
});
