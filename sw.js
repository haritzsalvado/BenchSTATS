// Bench Live Stats service worker · v0.5.0
const CACHE = 'bench-app-0.5.0';
const FONTS = 'bench-fonts';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONTS).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; }))));
    return;
  }
  if(url.origin !== location.origin) return;
  const key = req.mode === 'navigate' ? './index.html' : req;
  // offline first: answer from the cache, refresh the cache in the background
  e.respondWith(caches.open(CACHE).then(c => c.match(key, {ignoreSearch:true}).then(hit => {
    const net = fetch(req).then(res => { if(res.ok) c.put(key, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
