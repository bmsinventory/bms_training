/* ══════════════════════════════════════════════
   BMS Training — Service Worker
   บันทึกไฟล์หลักไว้ใช้งานแบบออฟไลน์บางส่วน + โหลดหน้าเว็บเร็วขึ้น
   หมายเหตุ: ให้เพิ่มเลข CACHE_VERSION ทุกครั้งที่ deploy โค้ดใหม่
   (คู่กับการเพิ่ม ?v=N ท้าย app.js/style.css ใน index.html) เพื่อบังคับล้าง cache เก่า
══════════════════════════════════════════════ */
const CACHE_VERSION='v1';
const PRECACHE=`bms-precache-${CACHE_VERSION}`;
const RUNTIME_CACHE=`bms-runtime-${CACHE_VERSION}`;
const OFFLINE_URL='./offline.html';

const PRECACHE_URLS=[
  './offline.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './bms-logo.png',
];

// โดเมนไลบรารี CDN แบบ versioned (cache-first ได้ปลอดภัย เพราะ URL ผูกเลขเวอร์ชันอยู่แล้ว)
const CDN_HOSTS=['cdn.jsdelivr.net','cdnjs.cloudflare.com'];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache=>cache.addAll(PRECACHE_URLS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys.filter(k=>k!==PRECACHE&&k!==RUNTIME_CACHE).map(k=>caches.delete(k))
      ))
      .then(()=>self.clients.claim())
  );
});

// ให้หน้าเว็บสั่งข้าม "waiting" ได้ทันทีเมื่อผู้ใช้กดปุ่มอัปเดต
self.addEventListener('message',event=>{
  if(event.data==='SKIP_WAITING')self.skipWaiting();
});

async function networkFirstNav(req){
  try{
    const res=await fetch(req);
    const cache=await caches.open(RUNTIME_CACHE);
    cache.put(req,res.clone());
    return res;
  }catch(e){
    const cache=await caches.open(RUNTIME_CACHE);
    return (await cache.match(req))
      || (await cache.match('./index.html'))
      || (await caches.match(OFFLINE_URL));
  }
}

async function staleWhileRevalidate(req){
  const cache=await caches.open(RUNTIME_CACHE);
  const cached=await cache.match(req);
  const fetchPromise=fetch(req).then(res=>{
    if(res&&res.status===200)cache.put(req,res.clone());
    return res;
  }).catch(()=>cached);
  return cached||fetchPromise;
}

async function cacheFirst(req){
  const cache=await caches.open(RUNTIME_CACHE);
  const cached=await cache.match(req);
  if(cached)return cached;
  try{
    const res=await fetch(req);
    cache.put(req,res.clone());
    return res;
  }catch(e){
    return cached||Response.error();
  }
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  // หน้า HTML (SPA navigation) — network-first, ออฟไลน์ค่อย fallback cache/offline.html
  if(req.mode==='navigate'){
    event.respondWith(networkFirstNav(req));
    return;
  }

  // Supabase / API ภายนอกอื่น ๆ — ปล่อยผ่านตรง ไม่ cache (ข้อมูลต้องสดเสมอ)
  if(url.origin!==self.location.origin&&!CDN_HOSTS.includes(url.hostname)){
    return;
  }

  // ไฟล์หลักของระบบ (same-origin: app.js, style.css, รูปภาพ ฯลฯ)
  if(url.origin===self.location.origin){
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // ไลบรารี CDN แบบผูกเวอร์ชัน
  event.respondWith(cacheFirst(req));
});
