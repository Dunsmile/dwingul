import {esc} from './catalog.js';
export const nicknameOnly=id=>['shop','energy','chat','taste'].includes(id);
export function normalizeBirth(value){
 const raw=String(value?.birthday||'').trim();
 const match=/^(\d{4})[-./]?(\d{2})[-./]?(\d{2})$/.exec(raw);
 const name=String(value?.name||'').trim(),calendar=String(value?.calendar||'solar'),time=String(value?.time||'');
 if(!name||name.length>12||!match||!['solar','lunar','leap'].includes(calendar))throw Error('닉네임과 생년월일 8자리를 확인해주세요.');
 const [,y,m,d]=match,year=Number(y),month=Number(m),day=Number(d);
 if(year<1900||year>new Date().getFullYear()||month<1||month>12||day<1||day>(calendar==='solar'?31:30))throw Error('실제 생년월일을 입력해주세요.');
 if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('태어난 시와 분을 모두 선택하거나 시간 모름을 선택해주세요.');
 const birthday=`${y}-${m}-${d}`;
 if(calendar==='solar'){const check=new Date(Date.UTC(year,month-1,day));if(check.getUTCFullYear()!==year||check.getUTCMonth()+1!==month||check.getUTCDate()!==day)throw Error('실제 생년월일을 입력해주세요.');if(birthday>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'}))throw Error('미래의 생일은 입력할 수 없어요.');}
 return {name,birthday,calendar,time};
}
export function birthFromForm(data){
 const unknown=data.has('timeUnknown'),hour=data.get('birthHour')||'',minute=data.get('birthMinute')||'';
 const year=String(data.get('birthYear')||''),month=String(data.get('birthMonth')||''),day=String(data.get('birthDay')||'');
 const hasSeparateDate=year||month||day;
 const birthday=hasSeparateDate?(year&&month&&day?`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`:'invalid'):data.get('birthday');
 return normalizeBirth({name:data.get('name'),birthday,calendar:data.get('calendar'),time:unknown?'':(hour&&minute?`${hour}:${minute}`:'invalid')});
}
export function birthFields(saved={}){
 const date=/^(\d{4})[-./]?(\d{2})[-./]?(\d{2})$/.exec(String(saved.birthday||''));
 const [,year='',month='',day='']=date||[];
 const [hour='',minute='']=String(saved.time||'').split(':'),unknown=!saved.time;
 const opts=(n,current)=>'<option value="">선택</option>'+Array.from({length:n},(_,i)=>{const v=String(i).padStart(2,'0');return `<option value="${v}" ${v===current?'selected':''}>${v}</option>`;}).join('');
 const currentYear=new Date().getFullYear();
 return `<label>달력<select name="calendar">${[['solar','양력'],['lunar','음력'],['leap','음력 윤달']].map(([v,n])=>`<option value="${v}" ${(saved.calendar||'solar')===v?'selected':''}>${n}</option>`).join('')}</select></label><fieldset class="birth-date"><legend>생년월일</legend><div class="field-row"><label>연도<input name="birthYear" type="number" inputmode="numeric" autocomplete="bday-year" min="1900" max="${currentYear}" required placeholder="1990" value="${esc(year)}"></label><label>월<input name="birthMonth" type="number" inputmode="numeric" autocomplete="bday-month" min="1" max="12" required placeholder="5" value="${esc(month)}"></label><label>일<input name="birthDay" type="number" inputmode="numeric" autocomplete="bday-day" min="1" max="31" required placeholder="12" value="${esc(day)}"></label></div></fieldset><fieldset class="birth-time"><legend>태어난 시간 · 24시간 기준</legend><label class="check"><input type="checkbox" name="timeUnknown" ${unknown?'checked':''}><span>시간 모름</span></label><div class="field-row"><label>시<select name="birthHour" ${unknown?'disabled':''}>${opts(24,hour)}</select></label><label>분<select name="birthMinute" ${unknown?'disabled':''}>${opts(60,minute)}</select></label></div></fieldset>`;
}
export function fillBirthForm(form,saved){
 for(const key of ['name','birthday','calendar'])if(form.elements[key])form.elements[key].value=key==='birthday'?(saved[key]||'').replaceAll('-',''):saved[key]|| (key==='calendar'?'solar':'');
 const date=/^(\d{4})[-./]?(\d{2})[-./]?(\d{2})$/.exec(String(saved.birthday||''));
 for(const [key,value]of [['birthYear',date?.[1]||''],['birthMonth',date?.[2]||''],['birthDay',date?.[3]||'']])if(form.elements[key])form.elements[key].value=value;
 const [hour='',minute='']=(saved.time||'').split(':');
 if(form.elements.timeUnknown){form.elements.timeUnknown.checked=!saved.time;for(const [k,v]of [['birthHour',hour],['birthMinute',minute]]){form.elements[k].disabled=!saved.time;form.elements[k].value=v;}}
}
