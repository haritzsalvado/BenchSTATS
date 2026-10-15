// Bench Live Stats service worker · v0.12.0
// The tablet keeps running the version you approved ("current"). New versions are downloaded in the
// background but only switched on when the app asks for it (Update button on page 1).
const VERSION = '0.12.0';
const CACHE = 'bench-app-' + VERSION;
const META = 'bench-meta', FONTS = 'bench-fonts';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];
const current = () => caches.open(META).then(c => c.match('current')).then(r => r ? r.text() : null);
const setCurrent = name => caches.open(META).then(c => c.put('current', new Response(name)));
const dropOld = keep => caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('bench-app-') && !keep.includes(k)).map(k => caches.delete(k))));
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, {cache:'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(current()
    .then(cur => cur ? caches.has(cur).then(ok => ok ? cur : setCurrent(CACHE).then(() => CACHE)) : setCurrent(CACHE).then(() => CACHE))
    .then(cur => dropOld([cur, CACHE]))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', e => {
  const port = e.ports && e.ports[0];
  if(e.data === 'status') current().then(cur => port && port.postMessage({current: cur || CACHE, latest: CACHE}));
  if(e.data === 'apply') setCurrent(CACHE).then(() => dropOld([CACHE])).then(() => port && port.postMessage({ok:true}));
});
self.addEventListener('fetch', e => {
  const req = e.request; if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.searchParams.has('ping')) return;   // health check of the web address: always goes to the network
  if(url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; }))));
    return;
  }
  if(url.origin !== location.origin) return;
  const key = req.mode === 'navigate' ? './index.html' : req;
  e.respondWith(current()
    .then(cur => caches.open(cur || CACHE)).then(c => c.match(key, {ignoreSearch:true}))
    .then(hit => hit || caches.open(CACHE).then(c => c.match(key, {ignoreSearch:true})))
    .then(hit => hit || fetch(req)));
});
