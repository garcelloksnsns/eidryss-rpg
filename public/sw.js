const STATIC_CACHE='eidryss-static-v700';
const STATIC=['/style.css?v=701','/app.js?v=701','/icon.svg','/manifest.json'];
self.addEventListener('install',event=>event.waitUntil(caches.open(STATIC_CACHE).then(cache=>cache.addAll(STATIC)).catch(()=>{}).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==STATIC_CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();if(event.data?.type==='CLEAR_EIDRYSS_CACHE')event.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))));});
self.addEventListener('fetch',event=>{
 const request=event.request; const url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/')||url.pathname==='/ws')return;
 if(request.mode==='navigate'){
   event.respondWith(fetch(request,{cache:'no-store'}).catch(()=>caches.match('/').then(hit=>hit||new Response('<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width"><title>Eidryss offline</title><body style="background:#070912;color:#f4f2ff;font:18px system-ui;padding:32px"><h1>O portal está desconectado</h1><p>O mundo continua salvo no celular servidor. Ligue o servidor ou reconecte a internet e tente novamente.</p></body></html>',{headers:{'content-type':'text/html;charset=utf-8'}}))));
   return;
 }
 if(['/style.css','/app.js','/icon.svg','/manifest.json'].includes(url.pathname)){
   event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{const copy=response.clone();caches.open(STATIC_CACHE).then(cache=>cache.put(request,copy));return response;}).catch(()=>caches.match(request)));
 }
});
