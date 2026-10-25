// Service worker מינימלי: שומר את קבצי המעטפת לפתיחה מהירה. נתונים תמיד מהרשת.
const CACHE = 'habayit-v57';
const SHELL = ['./','./index.html','./login.html','./css/style.css','./js/splash.js','./splash.jpg','./splash.jpg','./js/config.js','./js/supabase.js','./js/common.js','./js/icons.js','./js/generate.js','./js/points.js','./tasks.html','./task.html','./admin.html','./report.html','./history.html','./chat.html','./calendar.html','./requests.html','./info.html','./fridge.html','./shop.html','./outing.html','./js/outings.js', './important.html', './js/important.js', './js/push.js','./js/bonus.js','./game.html','./games.html','./js/gamepage.js','./js/game.js','./game-bg.jpg','./js/events.js','./manifest.webmanifest','./logo.png','./login-bg.jpg','./logo-text.png'];
// כל קובץ נשמר בנפרד וללא כפילויות: קובץ חסר או כפול לא מפיל את ההתקנה של ה-Service Worker
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled([...new Set(SHELL)].map(u => c.add(u))))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Supabase וגופנים: ישר לרשת
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request)));
});

// התראות Push: חייבים להציג התראה על כל push (דרישה של אייפון)
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data.json(); } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'הבית שלנו', {
    body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: d.tag || undefined, lang: 'he', dir: 'rtl',
    data: { url: d.url || './index.html' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './index.html', self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { if ('navigate' in c) c.navigate(url).catch(() => {}); return c.focus(); } }
    return clients.openWindow(url);
  }));
});
