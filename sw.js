const CACHE="financial-strategy-pro-plus-v1";
const APP=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{
    if(new URL(e.request.url).origin===location.origin){
      const copy=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy));
    }
    return res;
  }).catch(()=>cached)));
});
