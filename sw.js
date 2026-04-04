// ==============================
// SERVICE WORKER — AnimeFlux
// ==============================

const CACHE_NAME = 'animeflux-v3';
const API_CACHE  = 'animeflux-api-v3';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/public/icons/android/mipmap-xxxhdpi/ic_launcher.png',
    '/public/icons/playstore.png'
];

// ==============================
// INSTALL
// ==============================
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ==============================
// ACTIVATE
// ==============================
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME && k !== API_CACHE)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// ==============================
// FETCH
// ==============================
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (event.request.method !== 'GET') return;
    if (url.protocol === 'chrome-extension:') return;

    if (url.hostname === 'api.jikan.moe') {
        event.respondWith(networkFirst(event.request, API_CACHE));
        return;
    }

    if (url.hostname.includes('youtube.com')) return;

    event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const fallback = await caches.match('/index.html');
        return fallback || new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        return cached || new Response(
            JSON.stringify({ error: 'Offline' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// ==============================
// 🔔 NOTIFICAÇÃO — CLIQUE
// Ao tocar na notificação, abre o app
// ==============================
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Se o app já estiver aberto, foca nele
            for (const client of clientList) {
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            // Senão, abre uma nova janela
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// ==============================
// PUSH (para futura integração com servidor)
// ==============================
self.addEventListener('push', (event) => {
    if (!event.data) return;
    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title || 'AnimeFlux', {
            body:    data.body || 'Nova atualização disponível!',
            icon:    '/public/icons/android/mipmap-xxxhdpi/ic_launcher.png',
            badge:   '/public/icons/android/mipmap-mdpi/ic_launcher.png',
            vibrate: [100, 50, 100],
            data:    { url: data.url || '/' }
        })
    );
});