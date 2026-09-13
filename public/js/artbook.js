const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const {assets}=await fetch('/artbook/manifest.json').then(r=>r.json());
const groups=[...new Set(assets.map(a=>a.group))];let current=groups[0];
const filters=document.querySelector('#filters'),gallery=document.querySelector('#gallery');
filters.innerHTML=groups.map((g,i)=>`<button type="button" aria-pressed="${i===0}" data-group="${esc(g)}">${esc(g)}</button>`).join('');
function render(){const query=document.querySelector('#search').value.trim().toLowerCase();const chosen=assets.filter(a=>a.group===current&&[a.name,a.kind,a.rarity,a.id,a.searchAliases].join(' ').toLowerCase().includes(query));document.querySelector('#count').textContent=`${current} · ${chosen.length}개`;gallery.className=current==='썸네일'?'scenes':'sprites';gallery.innerHTML=chosen.map(a=>`<figure><a data-gallery-frame href="${a.src}" target="_blank" rel="noopener" aria-label="${esc(a.name)} 원본 보기"><span class="gallery-image-fallback" aria-hidden="true">그림 없음</span><img data-gallery-image src="${a.preview||a.src}" width="${a.width}" height="${a.height}" loading="lazy" decoding="async" alt="${esc(a.name)}"></a><figcaption><strong>${esc(a.name)}</strong><small>${esc(a.rarity||a.kind)}</small></figcaption></figure>`).join('');}
filters.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;current=b.dataset.group;for(const btn of filters.children)btn.setAttribute('aria-pressed',String(btn===b));render();});
document.querySelector('#search').addEventListener('input',render);
gallery.addEventListener('error',event=>{const image=event.target;if(!(image instanceof HTMLImageElement)||!image.hasAttribute('data-gallery-image'))return;image.hidden=true;image.closest('[data-gallery-frame]')?.classList.add('is-unavailable');},true);
render();
