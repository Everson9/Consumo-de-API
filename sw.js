// ==============================
// SERVICE WORKER — AnimeFlux
// Estratégia: Cache First para assets estáticos
//             Network First para a API
// ==============================

const CACHE_NAME    = 'animeflux-v2';
const API_CACHE     = 'animeflux-api-v2';

// Assets estáticos que serão cacheados no install
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
// INSTALL — pré-cacheia os assets
// ==============================
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting()) // Ativa imediatamente
    );
});

// ==============================
// ACTIVATE — remove caches velhos
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
// FETCH — estratégia híbrida
// ==============================
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Ignora requisições não-GET e extensões do Chrome
    if (event.request.method !== 'GET') return;
    if (url.protocol === 'chrome-extension:') return;

    // JIKAN API → Network First (dados sempre frescos)
    if (url.hostname === 'api.jikan.moe') {
        event.respondWith(networkFirst(event.request, API_CACHE));
        return;
    }

    // YouTube iframes → deixa passar sem cache
    if (url.hostname.includes('youtube.com')) return;

    // Assets estáticos → Cache First
    event.respondWith(cacheFirst(event.request));
});

// ==============================
// ESTRATÉGIAS
// ==============================

// Cache First: usa cache, busca na rede se não tiver
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        // Só cacheia respostas válidas
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        // Offline fallback: retorna index.html para navegação
        const fallback = await caches.match('/index.html');
        return fallback || new Response('Offline', { status: 503 });
    }
}

// Network First: tenta rede, cai no cache se falhar
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