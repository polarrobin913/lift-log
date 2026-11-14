/* Lift Log offline support. Change the version to push an update. */
var CACHE = 'liftlog-v1';
var CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
var FONT_CSS = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&display=swap';

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return cache.addAll(CORE).then(function () {
      /* Fonts are a nicety: never let them block the install. */
      return fetch(FONT_CSS).then(function (res) {
        if (!res.ok) return;
        var copy = res.clone();
        return res.text().then(function (css) {
          var urls = (css.match(/https:\/\/fonts\.gstatic\.com\/[^)'"]+/g) || []);
          return Promise.all([cache.put(FONT_CSS, copy)].concat(urls.map(function (u) {
            return fetch(u).then(function (r) { if (r.ok) return cache.put(u, r); }).catch(function () {});
          })));
        });
      }).catch(function () {});
    });
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* Serve from the phone first, refresh the copy in the background when online. */
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(req, { ignoreSearch: req.mode === 'navigate' }).then(function (hit) {
      var fresh = fetch(req).then(function (res) {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(function () { return hit || (req.mode === 'navigate' ? cache.match('index.html') : Response.error()); });
      return hit || fresh;
    });
  }));
});
