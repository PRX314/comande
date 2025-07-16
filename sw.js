// Service Worker for Push Notifications
const CACHE_NAME = 'comande-v1';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './manifest.json'
];

// Install Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// Fetch event
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

// Push event handler
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Nuovo aggiornamento disponibile',
        icon: './icon-192x192.png',
        badge: './badge-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            url: './'
        },
        actions: [
            {
                action: 'view',
                title: 'Visualizza'
            },
            {
                action: 'close',
                title: 'Chiudi'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Comande Restaurant', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('./')
        );
    }
});

// Background sync for offline functionality
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

function doBackgroundSync() {
    // Handle background sync logic here
    return Promise.resolve();
}