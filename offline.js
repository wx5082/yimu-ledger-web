export const offlineState={supported:'serviceWorker' in navigator&&'caches' in window,shell:false,ocr:false,loading:false,done:0,total:10,error:'',ready:false};
let registration,changed=()=>{};
function request(type,onProgress=()=>{}){return new Promise((resolve,reject)=>{
 const target=navigator.serviceWorker.controller||registration?.active;if(!target){reject(new Error('离线服务尚未就绪，请联网重新打开页面'));return;}
 const channel=new MessageChannel();let timer;
 const resetTimer=()=>{clearTimeout(timer);timer=setTimeout(()=>{channel.port1.close();reject(new Error('离线准备超时，请联网后重试，已下载资源会保留'));},120000);};resetTimer();
 channel.port1.onmessage=e=>{const data=e.data;resetTimer();if(data.type==='PROGRESS'){onProgress(data);return;}clearTimeout(timer);channel.port1.close();if(data.type==='ERROR')reject(new Error(data.message));else resolve(data);};
 target.postMessage({type},[channel.port2]);
});}
export async function initOffline(onChange){changed=onChange;if(!offlineState.supported){offlineState.error='当前浏览器不支持离线缓存，请用 iPhone 的 Safari 打开。';changed();return;}
 try{registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});registration=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('离线页面加载失败，请联网并登录后重新打开')),60000))]);Object.assign(offlineState,await request('STATUS'),{ready:true});changed();}
 catch(e){offlineState.error=e.message;changed();}
 navigator.serviceWorker.addEventListener('controllerchange',async()=>{try{Object.assign(offlineState,await request('STATUS'),{ready:true,error:''});changed();}catch{}});
}
export async function prepareOffline(){if(offlineState.loading)return;
 offlineState.loading=true;offlineState.done=0;offlineState.error='';changed();
 try{if(!registration?.active){registration=await navigator.serviceWorker.ready;}const result=await request('PREPARE_OFFLINE',p=>{offlineState.done=p.done;offlineState.total=p.total;changed();});Object.assign(offlineState,result);if(offlineState.shell&&offlineState.ocr)await navigator.storage?.persist?.().catch(()=>false);}
 catch(e){offlineState.error=e.message;}
 finally{offlineState.loading=false;changed();}
}
export function offlinePanel(){const s=offlineState,ready=s.shell&&s.ocr;return `<section class="panel offline-panel"><div class="settings-row"><div><h3>iPhone 离线使用</h3><p>添加到主屏幕后，从桌面图标打开，再准备离线资源。<br>完成后，断网也能打开账本、手动记账和识别截图。</p></div><span class="tag ${ready?'local':''}">${ready?'离线已就绪':s.loading?'正在准备':'需要准备'}</span></div><ol class="install-steps"><li>用 Safari 打开本网站，登录后点击「分享」。</li><li>选择「添加到主屏幕」，如有「作为网页 App 打开」请开启。</li><li>从桌面打开一目账本，在这里下载离线资源。</li></ol><div class="offline-status"><span>${s.shell?'✓ 页面已缓存':'页面缓存准备中'} · ${s.ocr?'✓ 截图识别已缓存':'截图识别待下载'}</span><button class="${ready?'secondary':'primary'}" data-action="prepare-offline" ${s.loading||!s.ready?'disabled':''}>${s.loading?`下载中 ${s.done} / ${s.total}`:ready?'检查离线资源':'准备离线使用（约 33 MB）'}</button></div>${s.loading?`<div class="progress-track"><div class="progress-fill" style="width:${s.done/s.total*100}%"></div></div><p class="tiny">请保持页面打开，下载中断后可以重试。</p>`:''}${s.error?'<p class="warning section-gap">'+s.error.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'</p>':''}<p class="hint section-gap">先在桌面 App 中准备离线资源，再开始正式记账。Safari 与桌面 App 的数据可能分开；已有账单请先导出备份，再在桌面 App 中恢复。删除桌面 App 或清理网站数据后，需要重新准备并恢复账单。</p></section>`;}
