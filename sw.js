// Nombre del caché (Si actualizas la app en el futuro, cambia el v1 a v2, etc.)
const CACHE_NAME = 'inventario-yorwin.V1';

// Lista de TODOS los archivos que la app necesita para funcionar sin internet
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

// Instalación: Descarga y guarda todos los archivos en el teléfono
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Archivos cacheados exitosamente');
        return cache.addAll(urlsToCache);
      })
  );
});

// Intercepción: Cuando la app pide un archivo, lo busca en la memoria del teléfono primero
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si el archivo está en el caché (offline), lo devuelve. Si no, usa internet.
        return response || fetch(event.request);
      })
  );
});