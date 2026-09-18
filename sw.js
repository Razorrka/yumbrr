/* Offline cache, so the notebook still opens in the back room with no signal. */
var CACHE = "fish-notes-v1";
var ASSETS = ["./", "./index.html", "./manifest.webmanifest",
              "./assets/icon-180.png", "./assets/icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); })
    .then(function(){ return self.skipWaiting(); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; })
                           .map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function(hit){
      if(hit) return hit;
      return fetch(e.request).then(function(resp){
        if(resp && resp.status === 200 && resp.type !== "opaque"){
          var copy = resp.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }
        return resp;
      }).catch(function(){
        return e.request.mode === "navigate" ? caches.match("./index.html") : Response.error();
      });
    })
  );
});
