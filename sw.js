const CACHE_NAME = 'rdv-cache-v1';
const urlsToCache = [
    '/',
    '/tableau-de-bord',
    '/file-d-attente',
    '/static/css/style_tableau_de_bord.css',
    '/static/js/script_tableau_de_bord.js',
    '/manifest.json'
];

// Installation du service worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            console.log('[ServiceWorker] Mise en cache des fichiers');
            await cache.addAll(urlsToCache);

            const externalResources = [
                'https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.0.1/socket.io.js',
                'https://unpkg.com/feather-icons'
            ];
            for (const url of externalResources) {
                try {
                    await cache.add(url);
                } catch (err) {
                    console.warn(`[ServiceWorker] Impossible de mettre en cache ${url}`, err);
                }
            }
        })
    );
});
