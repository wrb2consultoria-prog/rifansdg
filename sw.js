// 🧩 Versão do cache — altere quando fizer mudanças nos arquivos
const CACHE_NAME = 'rifa-cache-v1';

// 🗂️ Lista de arquivos que serão armazenados em cache
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 🪣 INSTALAÇÃO — salva os arquivos no cache
self.addEventListener('install', (event) => {
  console.log('📦 Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📁 Armazenando arquivos no cache...');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // ativa imediatamente
  );
});

// 🧹 ATIVAÇÃO — remove caches antigos e recarrega as abas
self.addEventListener('activate', (event) => {
  console.log('⚙️ Ativando nova versão do Service Worker...');
  event.waitUntil(
    (async () => {
      // Deleta caches antigos
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ Deletando cache antigo:', key);
            return caches.delete(key);
          }
        })
      );

      await self.clients.claim();

      // 🔄 Recarrega automaticamente as páginas controladas
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });
      for (const client of clients) {
        client.navigate(client.url);
      }

      console.log('✅ Nova versão ativa!');
    })()
  );
});

// 🌐 FETCH — estratégia Cache First + atualização em segundo plano
self.addEventListener('fetch', (event) => {
  // Ignora requisições de navegação do próprio service worker
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Faz a requisição em rede e atualiza o cache em segundo plano
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Se offline, retorna o cache se existir
          return cachedResponse;
        });

      // Se houver cache, responde imediatamente; senão, espera a rede
      return cachedResponse || fetchPromise;
    })
  );
});

// 📨 Recebe mensagens do cliente (ex: pedido de atualização imediata)
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
