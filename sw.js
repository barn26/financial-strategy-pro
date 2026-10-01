/* Financial Strategy 2026 PRO — service worker
   Змінюйте VERSION при кожному оновленні index.html, щоб користувачі отримали нову версію. */
const VERSION="fin26-v1";
const CORE=["./","./index.html","./manifest.json","./icon-192.png","./icon-512.png","./icon-maskable-512.png","./apple-touch-icon.png"];
const CDN=["https://cdn.jsdelivr.net/npm/chart.js"];
const RUNTIME_HOSTS=["cdn.jsdelivr.net","cdnjs.cloudflare.com","tessdata.projectnaptha.com","unpkg.com"];

self.addEventListener("install",e=>{
 e.waitUntil((async()=>{
  const c=await caches.open(VERSION);
  await Promise.all(CORE.map(u=>c.add(u).catch(()=>{})));
  await Promise.all(CDN.map(u=>c.add(new Request(u,{mode:"cors"})).catch(()=>{})));
 })());
});

self.addEventListener("message",e=>{
 if(e.data&&e.data.type==="SKIP_WAITING")self.skipWaiting();
});

self.addEventListener("activate",e=>{
 e.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});

self.addEventListener("fetch",e=>{
 const req=e.request;
 if(req.method!=="GET")return;
 const url=new URL(req.url);

 // Сторінка: спершу мережа (щоб отримувати оновлення), без мережі — з кешу
 if(req.mode==="navigate"){
  e.respondWith(
   fetch(req).then(r=>{
    const cp=r.clone();
    caches.open(VERSION).then(c=>c.put("./index.html",cp));
    return r;
   }).catch(async()=>(await caches.match("./index.html"))||(await caches.match("./"))||new Response("Офлайн",{status:503}))
  );
  return;
 }

 // Свої файли та бібліотеки з CDN: кеш + оновлення у фоні
 const allowed=url.origin===location.origin||RUNTIME_HOSTS.includes(url.hostname);
 if(!allowed)return; // JSONBin та інше — напряму в мережу

 e.respondWith((async()=>{
  const c=await caches.open(VERSION);
  const hit=await c.match(req);
  const net=fetch(req).then(r=>{
   if(r&&(r.ok||r.type==="opaque"))c.put(req,r.clone());
   return r;
  }).catch(()=>null);
  const res=hit||await net;
  return res||new Response("",{status:504});
 })());
});
