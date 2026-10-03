const CACHE='agape-shell-v2';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/offline.html','/icon-192.png'])));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(e.request.mode==='navigate'&&url.origin===self.location.origin)e.respondWith(fetch(e.request).catch(()=>caches.match('/offline.html')))});
