/* Cache only this app's static assets. Account sign-in routes and user data are never cached here. */
const SHELL_CACHE='yimu-shell-v6';
const OCR_CACHE='yimu-ocr-v7-int';
const SHELL_FILES=['./index.html','./style.css','./app.js','./domain.js','./offline.js','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png'];
const OCR_FILES=['./assets/ocr/tesseract.min.js','./assets/ocr/worker.min.js',
 ...['','-simd','-lstm','-simd-lstm','-relaxedsimd','-relaxedsimd-lstm'].map(v=>`./assets/ocr/core/tesseract-core${v}.wasm.js`),
 './assets/ocr/lang/chi_sim.traineddata.gz','./assets/ocr/lang/eng.traineddata.gz'];
const absolute=file=>new URL(file,self.registration.scope).href;
const knownShell=new Set(SHELL_FILES.map(absolute)),knownOcr=new Set(OCR_FILES.map(absolute));
async function fetchAsset(file){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);
 try{const url=absolute(file),res=await fetch(url,{credentials:'same-origin',cache:'no-cache',signal:controller.signal});
  if(!res.ok||res.type==='opaque')throw new Error('资源下载失败，请联网并登录网站后重试');
  // Hosting can canonicalize /index.html to /. Validate the final app body,
  // while rejecting redirects to another origin or an HTML sign-in page.
  if(res.redirected&&new URL(res.url).origin!==self.location.origin)throw new Error('需要先登录账本站点');
  const type=res.headers.get('content-type')||'';
  if(file.endsWith('index.html')){if(!(await res.clone().text()).includes('id="main"'))throw new Error('需要先登录账本站点');}
  else if(type.includes('text/html'))throw new Error('需要先登录账本站点');
  return res;
 }finally{clearTimeout(timer);}
}
async function cacheShell(){const cache=await caches.open(SHELL_CACHE);for(const file of SHELL_FILES)await cache.put(absolute(file),await fetchAsset(file));}
async function allPresent(cacheName,files){const cache=await caches.open(cacheName);return (await Promise.all(files.map(f=>cache.match(absolute(f))))).every(Boolean);}
async function status(){return {shell:await allPresent(SHELL_CACHE,SHELL_FILES),ocr:await allPresent(OCR_CACHE,OCR_FILES)};}
let preparing=null;
async function prepareOcr(report){const cache=await caches.open(OCR_CACHE);for(let i=0;i<OCR_FILES.length;i++){const file=OCR_FILES[i];if(!await cache.match(absolute(file)))await cache.put(absolute(file),await fetchAsset(file));report({type:'PROGRESS',done:i+1,total:OCR_FILES.length});}return status();}
self.addEventListener('install',event=>event.waitUntil(cacheShell().then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const names=await caches.keys();await Promise.all(names.filter(n=>n.startsWith('yimu-shell-')&&n!==SHELL_CACHE).map(n=>caches.delete(n)));await self.clients.claim();})()));
self.addEventListener('message',event=>{
 const port=event.ports?.[0];if(!port)return;
 const report=data=>port.postMessage(data);
 if(event.data?.type==='STATUS')event.waitUntil(status().then(s=>report({type:'STATUS',...s})).catch(e=>report({type:'ERROR',message:e.message})));
 if(event.data?.type==='PREPARE_OFFLINE')event.waitUntil((async()=>{
  try{if(preparing){await preparing;report({type:'DONE',...await status()});return;}
   preparing=prepareOcr(report);const s=await preparing;report({type:'DONE',...s});
  }catch(e){report({type:'ERROR',message:e.name==='AbortError'?'下载超时，已下载部分会保留，请重试':e.message||'离线资源下载失败，请检查网络或存储空间'});}
  finally{preparing=null;}
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;
 const url=new URL(request.url);if(url.origin!==self.location.origin)return;
 const clean=url.origin+url.pathname;
 if(knownShell.has(clean)||knownOcr.has(clean)){
  const name=knownOcr.has(clean)?OCR_CACHE:SHELL_CACHE;
  event.respondWith((async()=>{const cache=await caches.open(name),saved=await cache.match(clean);if(saved)return saved;const res=await fetchAsset('./'+url.pathname.slice(new URL(self.registration.scope).pathname.length));await cache.put(clean,res.clone());return res;})());return;
 }
 // A Home Screen app can restart from its cached index, including without a connection.
 if(request.mode==='navigate'&&url.pathname===new URL(self.registration.scope).pathname){
  event.respondWith((async()=>{const cache=await caches.open(SHELL_CACHE),saved=await cache.match(absolute('./index.html'));if(saved)return saved;return fetch(request);})());
 }
});
