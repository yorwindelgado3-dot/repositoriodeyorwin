// Aumenta este número a 'V2', 'V3', etc. cada vez que hagas cambios importantes
const CACHE_NAME = 'inventario-yorwin.V3.2.7';

const urlsToCache = [
  './',
  './index.html',
  './basededato.js',
  './estadisticas.js',
  './inventario.js',
  './perfil.js',
  './productos.js',
  './ventas.js',
  './chart.js',
  './html5-qrcode.min.js',
  './bcv.png',
  './alimentos.png',
  './bebidas.png',
  './confiteria.png',
  './licores.png',
  './limpieza.png',
  './caja.png'
];

// 1. Instalación: Fuerza la instalación y descarga de los archivos
self.addEventListener('install', event => {
  self.skipWaiting(); // Fuerza al nuevo SW a tomar el control inmediatamente
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 2. Activación: Borra el caché viejo cuando detecta una versión nueva
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Borrando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Intercepción: Entrega archivos del caché o busca en la red
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});