const CACHE_NAME = 'fit-analyzer-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle Web Share Target API
  if (url.pathname === '/share' && request.method === 'POST') {
    event.respondWith(
      (async () => {
        const formData = await request.formData();
        const file = formData.get('file');
        
        if (file) {
          // Store the file in cache for the app to retrieve
          const cache = await caches.open(CACHE_NAME);
          const fileBlob = new Blob([file], { type: 'application/octet-stream' });
          const fileResponse = new Response(fileBlob, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'X-File-Name': file.name
            }
          });
          await cache.put('/shared-file', fileResponse);
          
          // Redirect to home page with a flag
          return Response.redirect('/?shared=true', 303);
        }
        
        return Response.redirect('/', 303);
      })()
    );
    return;
  }

  if (request.method !== 'GET') {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'オフラインです' }),
          { 
            status: 503, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
