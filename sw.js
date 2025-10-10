self.addEventListener('install', e=>{
  e.waitUntil(caches.open('babine-v2').then(c=>c.addAll([
    './',
    './index.html',
    './manifest.webmanifest',
    './calendar_view.css',
    './calendar_view.js'
  ])));
});
self.addEventListener('fetch', e=>{
  e.respondWith(caches.match(e.request).then(resp=>resp || fetch(e.request)));
});
