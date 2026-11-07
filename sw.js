/* PandaUI: cache only application files; never erase dose storage. */
const PREFIX='pandaui-shell-',CACHE=PREFIX+'1.3.0-1';
const FILES=['./','./index.html','./manifest.webmanifest','./icon.svg','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim()})())});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 const known=FILES.some(path=>new URL(path,self.registration.scope).pathname===url.pathname);if(!known&&event.request.mode!=='navigate')return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(event.request);if(response.ok){await cache.put(event.request,response.clone());return response}const stored=await cache.match(event.request);return stored||response}catch(error){const stored=await cache.match(event.request);if(stored)return stored;if(event.request.mode==='navigate'){const shell=await cache.match(new URL('./index.html',self.registration.scope).href);if(shell)return shell}return Response.error()}})())});
