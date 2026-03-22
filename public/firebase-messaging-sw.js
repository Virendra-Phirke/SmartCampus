// CampusMate Service Worker for Push Notifications
// Service workers cannot use ES module imports

// Push notification handler
self.addEventListener('push', function (event) {
    if (!event.data) return;

    var data;
    try {
        data = event.data.json();
    } catch (e) {
        data = { title: 'CampusMate', body: event.data.text() };
    }

    var title = data.title || (data.notification && data.notification.title) || 'CampusMate';
    var options = {
        body: data.body || (data.notification && data.notification.body) || 'New notification',
        icon: '/icon.png',
        badge: '/icon.png',
        tag: data.tag || ('push-' + Date.now()),
        data: data.data || {},
        requireInteraction: data.requireInteraction || false,
        vibrate: data.requireInteraction ? [500, 200, 500] : [100],
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    var data = event.notification.data || {};
    var url = '/';

    if (data.type === 'event' && data.eventId) {
        url = '/?tab=events';
    } else if (data.type === 'announcement' && data.announcementId) {
        url = '/?tab=events';
    } else if (data.type === 'attendance') {
        url = '/?tab=attendance';
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            for (var i = 0; i < clientList.length; i++) {
                if (clientList[i].url.indexOf(self.location.origin) === -1) continue;
                clientList[i].focus();
                clientList[i].navigate(url);
                return;
            }
            return clients.openWindow(url);
        })
    );
});

// Install and activate
self.addEventListener('install', function () {
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(clients.claim());
});
