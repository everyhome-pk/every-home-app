const CACHE = 'eh-mvkte789';
const SHELL = ['./', 'index.html', 'ordi.webmanifest', 'ordi-192.png', 'ordi-512.png', 'ordi-maskable-512.png', 'ordi-apple-180.png'];
// 'reload': a new version always takes the files from the server, never from the browser's own (older) copy.
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Notifications sent by W1 (PushAlerts.js) through Firebase: data { title, body, url, tag }.
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) {}
  const m = Object.assign({}, d, d.notification || {}, d.data || {});
  e.waitUntil(self.registration.showNotification(m.title || 'ORDI', {
    body: m.body || '', icon: 'ordi-192.png', tag: m.tag || undefined, renotify: !!m.tag, data: { url: m.url || './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    const w = ws.find(x => 'focus' in x);
    return w ? w.navigate(url).then(x => (x || w).focus()) : clients.openWindow(url);
  }));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || /script\.google(usercontent)?\.com/.test(req.url)) return;
  // App name and icons: network first, so the phone always gets the current ones (Chrome reads them to update the app).
  if (/\.(webmanifest|png)(\?|$)/.test(req.url)) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return r;
    }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  })));
});
