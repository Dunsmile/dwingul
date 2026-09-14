import sharp from 'sharp';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {RPG_CHARACTERS,RPG_MONSTER_NAMES_25} from '../public/js/rpg-characters.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sources=JSON.parse(await readFile(path.join(root,'design/scene-sources-v12.json'),'utf8'));
const input=id=>path.join(root,sources.find(s=>s.id===id).path);
const output=path.join(root,'public/assets/pixel/scenes');
await mkdir(output,{recursive:true});
const records=[];
async function save(id,name,buffer,width,height){
 const dest=path.join(output,id+'.png');
 await sharp(buffer).resize(width,height,{fit:'fill',kernel:'lanczos3'}).png({palette:true,colours:256,compressionLevel:9,dither:0,effort:8}).toFile(dest);
 records.push({id,name,src:'/assets/pixel/scenes/'+id+'.png',width,height});
}
for(const [id,name]of [['jump-forest','멀리 뛰기 · 숲 풍경'],['sort-lodge','좌우로 쏙쏙 · 숲속 우체국'],['city-village','도심 질주 · 숲마을 풍경']])await save(id,name,input(id),1152,768);
// Preserve the level top of the ground texture and the exact runtime floor.
await save('jump-ground','멀리 뛰기 · 흙길',input('ground-strip'),384,96);
const table=input('tabletops');const tm=await sharp(table).metadata();
const tx=Math.round(tm.width/2),ty=Math.round(tm.height*.474);
for(const [i,[id,name]]of [['memory-table','반짝 기억판 · 별빛 책상'],['color-table','다른 색 한 칸 · 화가의 책상'],['timing-desk','랜덤 초 맞추기 · 시계공 책상'],['rhythm-stage','따라해 뒹굴 · 작은 무대']].entries()){
 const x=i%2?tx:0,y=i<2?0:ty,w=i%2?tm.width-tx:tx,h=i<2?ty:tm.height-ty;
 const buffer=await sharp(table).extract({left:x,top:y,width:w,height:h}).png().toBuffer();await save(id,name,buffer,640,640);
}
// This illustrated wood grain is neutral; gameplay states are separate overlays.
const wood=await sharp(table).extract({left:Math.round(tx*.32),top:Math.round(ty*.36),width:Math.round(tx*.32),height:Math.round(ty*.32)}).png().toBuffer();
await save('wood-token','기억·숫자 게임 나무 패',wood,128,128);
const paper=await sharp(table).extract({left:tx+Math.round(tx*.38),top:Math.round(ty*.36),width:Math.round(tx*.3),height:Math.round(ty*.3)}).png().toBuffer();
await save('paper-texture','안내·주문 두루마리',paper,256,256);
const cm=await sharp(input('city-village')).metadata();
const road=await sharp(input('city-village')).extract({left:Math.round(cm.width*.42),top:Math.round(cm.height*.73),width:Math.round(cm.width*.16),height:Math.round(cm.height*.23)}).png().toBuffer();
await save('road-texture','도심 질주 · 도로 노면',road,256,256);
// Generated sprites can extend beyond an equal grid. Cut at the emptiest alpha
// column/row around the divider, then trim transparency before runtime fitting.
async function split(id){
 const meta=await sharp(input(id)).metadata();if(!meta.hasAlpha)throw Error(id+' requires real transparency');
 const {data,info}=await sharp(input(id)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const divider=axis=>{const size=axis==='x'?info.width:info.height,other=axis==='x'?info.height:info.width;let best=Math.round(size/2),bestScore=Infinity;for(let at=Math.floor(size*.37);at<Math.ceil(size*.63);at++){let opacity=0;for(let cross=0;cross<other;cross++){const x=axis==='x'?at:cross,y=axis==='x'?cross:at;opacity+=data[(y*info.width+x)*4+3]/255;}const score=opacity+Math.abs(at-size/2)*.002;if(score<bestScore){bestScore=score;best=at;}}return best;};
 const xs=[0,divider('x'),info.width],ys=[0,divider('y'),info.height],cells=[];
 for(let y=0;y<2;y++)for(let x=0;x<2;x++){const cell=await sharp(input(id)).extract({left:xs[x],top:ys[y],width:xs[x+1]-xs[x],height:ys[y+1]-ys[y]}).png().toBuffer();cells.push(await sharp(cell).trim({background:'#00000000',threshold:8}).png().toBuffer());}
 return cells;
}
const obstacles=await split('jump-obstacles');
for(const [i,[id,name,width,height]]of [['short','이끼 그루터기',256,256],['wide','두 칸 돌담',384,160],['double','높은 통나무',192,384],['slide','매달린 나무뿌리',192,576]].entries())await save('jump-obstacle-'+id,name,obstacles[i],width,height);
const props=await split('road-props');
for(const [i,[id,name]]of [['tree','길가 나무'],['cottage','숲마을 오두막'],['lamp','길가 가로등'],['shrub','길가 꽃덤불']].entries()){
 const meta=await sharp(props[i]).metadata(),height=320,width=Math.round(320*meta.width/meta.height);await save('city-prop-'+id,name,props[i],width,height);
}
const reader=await sharp(input('analysis-reader')).trim({background:'#00000000',threshold:8}).png().toBuffer();
await save('analysis-reader','이야기를 읽는 고양이 마법사',reader,384,384);
// Authored camera poses use a reserved chroma backing when the image tool
// returns RGB. Encode that backing as alpha; never ship checkerboard pixels.
const poseSources=JSON.parse(await readFile(path.join(root,'design/pose-sources-v12.json'),'utf8'));
for(const source of poseSources){
 const {data,info}=await sharp(path.join(root,source.path)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(source.key==='magenta'){
  const count=info.width*info.height,mask=new Uint8Array(count),queue=new Uint32Array(count);let head=0,tail=0;
  const enqueue=p=>{if(mask[p])return;mask[p]=1;queue[tail++]=p;};
  for(let p=0;p<count;p++){const i=p*4;if(data[i]>240&&data[i+2]>240&&data[i+1]<20)enqueue(p);}
  while(head<tail){const p=queue[head++],x=p%info.width,y=Math.floor(p/info.width);for(const q of [x>0?p-1:-1,x+1<info.width?p+1:-1,y>0?p-info.width:-1,y+1<info.height?p+info.width:-1])if(q>=0&&!mask[q]){const i=q*4,r=data[i],g=data[i+1],b=data[i+2];if(r-g>45&&b-g>45&&Math.max(r,b)>100)enqueue(q);}}
  for(let p=0;p<count;p++)if(mask[p])data[p*4+3]=0;
 }
 const png=await sharp(data,{raw:info}).png().toBuffer();
 // Atlas seams are chosen in empty columns/rows near each expected grid edge.
 const divisions=(count,axis)=>{const size=axis==='x'?info.width:info.height,other=axis==='x'?info.height:info.width,result=[0];for(let n=1;n<count;n++){const ideal=size*n/count,radius=size/count*.25;let best=Math.round(ideal),score=Infinity;for(let a=Math.floor(ideal-radius);a<Math.ceil(ideal+radius);a++){let sum=0;for(let b=0;b<other;b++){const x=axis==='x'?a:b,y=axis==='x'?b:a;sum+=data[(y*info.width+x)*4+3]/255;}const value=sum+Math.abs(a-ideal)*.002;if(value<score){score=value;best=a;}}result.push(best);}return [...result,size];};
 const xs=divisions(source.cols,'x'),ys=divisions(source.rows,'y');
 for(let row=0;row<source.rows;row++)for(let col=0;col<source.cols;col++){
  const index=row*source.cols+col,crop=await sharp(png).extract({left:xs[col],top:ys[row],width:xs[col+1]-xs[col],height:ys[row+1]-ys[row]}).png().toBuffer();
  const cell=await sharp(crop).trim({background:'#00000000',threshold:8}).png().toBuffer(),meta=await sharp(cell).metadata();
  let id,name;
  if(source.id==='traffic-angles'){const type=['car','van','truck','bus'][row],view=['left-edge','left','front','right','right-edge'][col];id='traffic-'+type+'-'+view;name=['승용차','밴','트럭','버스'][row]+' · '+['왼쪽 가장자리','왼쪽','정면','오른쪽','오른쪽 가장자리'][col];}
  else if(source.id==='players-rear'){id='player-'+['basic','sport','touring','compact','rally','pickup','van','roadster'][index]+'-rear';name=['시티 원','스프린터','롱런','도토리','솔방울 랠리','오크 픽업','모스 캠퍼','반딧불 로드스터'][index]+' · 후면';}
  else if(source.id==='duel-heroes'){id='duel-hero-'+index;name=RPG_CHARACTERS.find(c=>c.index===index).name+' · 오른쪽 전투 자세';}
  else if(source.id==='duel-monsters'){id='duel-monster-'+String(index+1).padStart(2,'0');name=RPG_MONSTER_NAMES_25[index]+' · 왼쪽 전투 자세';}
  else throw Error('Unknown pose atlas '+source.id);
  const width=256,height=Math.round(width*meta.height/meta.width);
  await save(id,name,cell,width,height);
 }
}
await writeFile(path.join(root,'design/scene-assets-v12.json'),JSON.stringify(records,null,2));
console.log('Scene artwork: '+records.length+' PNG assets');
