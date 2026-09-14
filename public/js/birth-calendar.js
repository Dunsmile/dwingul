let pending;
// The calendar is needed only when a birth profile is submitted, never for games.
export function ensureBirthCalendar(){
 if(globalThis.Solar&&globalThis.Lunar)return Promise.resolve();
 if(pending)return pending;
 pending=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/js/lunar.js';script.async=true;script.onload=()=>{if(globalThis.Solar&&globalThis.Lunar)resolve();else{pending=null;script.remove();reject(new Error('생일 정보를 준비하지 못했어요. 다시 시도해주세요.'));}};script.onerror=()=>{pending=null;script.remove();reject(new Error('생일 정보를 불러오지 못했어요. 다시 시도해주세요.'));};document.head.append(script);});return pending;
}
