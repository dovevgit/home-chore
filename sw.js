// Service worker מינימלי: שומר את קבצי המעטפת לפתיחה מהירה. נתונים תמיד מהרשת.
const CACHE = 'habayit-v34';
const SHELL = ['./','./index.html','./login.html','./css/style.css','./js/splash.js','./splash.jpg','./splash.jpg','./js/config.js','./js/supabase.js','./js/common.js','./js/icons.js','./js/generate.js','./js/points.js','./tasks.html','./task.html','./admin.html','./report.html','./history.html','./chat.html','./calendar.html','./requests.html','./js/events.js','./manifest.webmanifest','./logo.png','./login-bg.jpg','./logo-text.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
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
