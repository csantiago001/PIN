const CACHE = 'pin-mebuc-v2'; // Solo cambia esto si quieres FORZAR limpieza total de caché
const ASSETS = [
  '/PIN/index.html',
  '/PIN/manifest.json',
  '/PIN/icon-192.png',
  '/PIN/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia: stale-while-revalidate
// Sirve la caché al instante (rápido) y en paralelo busca la versión
// nueva en la red; si hay cambios, los guarda para la próxima carga
// y avisa a la página abierta para que ofrezca recargar.
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(fresh => {
        if (fresh && fresh.ok) {
          caches.open(CACHE).then(c => c.put(e.request, fresh.clone()));

          // Si el archivo cambió respecto a lo cacheado, avisa a la app
          if (cached) {
            cached.clone().text().then(oldText => {
              fresh.clone().text().then(newText => {
                if (oldText !== newText) {
                  self.clients.matchAll().then(clients => {
                    clients.forEach(c => c.postMessage({ type: 'NEW_VERSION' }));
                  });
                }
              });
            });
          }
        }
        return fresh;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
