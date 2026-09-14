import sharp from 'sharp';
import {mkdir,readFile,writeFile,readdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {rpgItems,RPG_RARITIES} from '../public/js/rpg-items.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'public/assets/pixel/illustrated');
const sources=JSON.parse(await readFile(path.join(root,'design/atlas-sources-v11.json'),'utf8'));
const cells=new Map(),records=[];
const png={palette:true,colours:256,compressionLevel:9,effort:8,dither:0};
// Generated atlases can drift a few pixels. Cut in the emptiest alpha valley
// near each expected divider, rather than severing a foot or ornament.
function dividers(data,width,height,n,axis){
 const size=axis==='x'?width:height,orth=axis==='x'?height:width,projection=[];
 for(let at=0;at<size;at++){let sum=0;for(let other=0;other<orth;other++){const x=axis==='x'?at:other,y=axis==='x'?other:at;sum+=data[(y*width+x)*4+3]/255;}projection.push(sum);}
 const points=[0];
 for(let i=1;i<n;i++){const ideal=size*i/n,radius=size/n*.2;let best=Math.round(ideal),score=Infinity;for(let at=Math.max(points.at(-1)+1,Math.floor(ideal-radius));at<Math.min(size,ideal+radius);at++){const value=projection[at]+Math.abs(at-ideal)*.003;if(value<score){score=value;best=at;}}points.push(best);}
 return [...points,size];
}
async function splitAtlas(source){
 const p=path.join(root,source.path),meta=await sharp(p).metadata();
 if(!meta.hasAlpha)throw Error(source.id+' requires actual transparent alpha before slicing');
 const {data,info}=await sharp(p).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const xs=dividers(data,info.width,info.height,source.cols,'x'),ys=dividers(data,info.width,info.height,source.rows,'y'),result=[];
 for(let row=0;row<source.rows;row++)for(let col=0;col<source.cols;col++){
  const cropped=await sharp(p).extract({left:xs[col],top:ys[row],width:xs[col+1]-xs[col],height:ys[row+1]-ys[row]}).png().toBuffer();
  const buffer=await sharp(cropped).trim({background:'#00000000',threshold:10}).png().toBuffer();
  result.push(buffer);
 }
 cells.set(source.id,result);
 return result;
}
async function save(buffer,relative,size=256,ratio=1){
 const filename=path.join(out,relative),height=Math.round(size/ratio);
 await mkdir(path.dirname(filename),{recursive:true});
 await sharp(buffer).resize({width:size,height,fit:'contain',background:'#00000000'}).png(png).toFile(filename);
 records.push({path:'/assets/pixel/illustrated/'+relative,width:size,height});
}
async function alias(from,to){const input=path.join(out,from),dest=path.join(out,to);await mkdir(path.dirname(dest),{recursive:true});await copyFile(input,dest);const m=await sharp(dest).metadata();records.push({path:'/assets/pixel/illustrated/'+to,width:m.width,height:m.height});}
for(const source of sources)if(source.cols&&source.rows)await splitAtlas(source);
const required=id=>{const value=cells.get(id);if(!value)throw Error('Missing atlas: '+id);return value;};
const persons=await splitAtlas({id:'personas',path:'public/assets/pixel/woodland-pets.png',cols:4,rows:4});
for(let i=0;i<16;i++)await save(persons[i],'personas/'+i+'.png');
for(let i=0;i<25;i++){const number=String(i+1).padStart(2,'0');await save(required('monsters')[i],'monsters/'+number+'.png',288);await alias('monsters/'+number+'.png','rpg/monster-'+number+'.png');await alias('monsters/'+number+'.png','rpg/boss-'+number+'.png');}
await alias('personas/0.png','rpg/hero.png');
const nounSets={attack:['연필검','펜촉검','키보드','만년필','문장검'],defense:['망토','책 표지','사전','문장 갑옷','수호패'],heal:['책갈피','찻잔','잉크병','문장석','부적']},atlasFor={attack:'weapons',defense:'armor',heal:'accessories'};
const tones=['#bda985','#75a5cf','#ad89c7','#e1b54f','#cf6456'];
for(const [index,item]of rpgItems.entries()){
 const row=RPG_RARITIES.findIndex(r=>r.id===item.rarity),col=Math.max(0,nounSets[item.slot].findIndex(n=>item.name.includes(n)));
 const base=await sharp(required(atlasFor[item.slot])[row*5+col]).resize({width:190,height:190,fit:'inside'}).png().toBuffer();
 const m=await sharp(base).metadata(),color=tones[row];
 // Each named equipment variant has its own small engraved seal. Gameplay
 // rarity remains text-labelled; this ornament never replaces an effect label.
 const bits=Array.from({length:9},(_,b)=>index&(1<<b)?'<rect x="'+(12+b%3*5)+'" y="'+(12+Math.floor(b/3)*5)+'" width="3" height="3" fill="'+color+'"/>':'').join('');
 const frame=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224"><rect x="3" y="3" width="218" height="218" rx="18" fill="#fff7e8" stroke="'+color+'" stroke-width="5"/><rect x="8" y="8" width="28" height="28" rx="7" fill="#49382d"/>'+bits+'</svg>');
 const buffer=await sharp(frame).composite([{input:base,left:Math.round((224-m.width)/2),top:Math.round((224-m.height)/2)}]).png(png).toBuffer();
 await save(buffer,'items/'+item.id+'.png',224);
}
const vehicleIds=['basic','sport','touring','compact','rally','pickup','van','roadster'];
for(let i=0;i<8;i++)await save(required('vehicles')[i],'vehicles/'+vehicleIds[i]+'.png',384);
for(let i=0;i<4;i++)await save(required('traffic')[i],'traffic/'+['car','van','truck','bus'][i]+'.png',384);
for(const kind of ['basic','sport','touring'])await alias('vehicles/'+kind+'.png','world/vehicle-'+kind+'.png');
for(const kind of ['car','van','truck','bus'])await alias('traffic/'+kind+'.png','world/vehicle-'+kind+'.png');
const names=['coin','fuel','boost','heart','trophy','lantern','star','spell-attack','spell-heal','rhythm-drum','element-wood','element-fire','element-earth','element-metal','element-water'];
for(let i=0;i<names.length;i++)await save(required('world')[i],'world/'+names[i]+'.png',192);
for(const name of ['spell-attack','spell-heal'])await alias('world/'+name+'.png','rpg/'+name+'.png');
for(const [i,color]of ['white','blue','purple'].entries())for(const [j,face]of ['normal','smile','cry'].entries())await save(required('sort')[i*3+j],'world/sort-'+color+'-'+face+'.png',256);
for(const [i,rarity]of RPG_RARITIES.entries())for(const [j,state]of ['closed','open'].entries())await save(required('chests')[i*2+j],'rpg/chest-'+rarity.id+'-'+state+'.png',320);
await save(required('chests')[10],'rpg/chest-sealed.png',320);
await save(required('chests')[11],'world/book.png',192);
const tarots=[...required('tarot-a'),...required('tarot-b'),...required('tarot-c')];
for(let i=0;i<22;i++)await save(tarots[i],'world/tarot-'+i+'.png',256,2/3);
await save(tarots[22],'world/tarot-back.png',256,2/3);
for(const [i,name]of ['tarot-back-purple','tarot-deck','tarot-fan','tarot-pouch'].entries())await save(tarots[23+i],'world/'+name+'.png',256,2/3);
for(const pose of ['run-a','run-b','jump','slide','dead']){const name=pose==='run-a'?'runner':'runner-'+pose;await save(path.join(root,'public/assets/pixel/portraits/'+name+'.webp'),'world/runner-'+pose+'.png',256);}
const battle=sources.find(x=>x.id==='battlefield');if(!battle)throw Error('Missing battlefield');
await save(path.join(root,battle.path),'rpg/battlefield.png',960,3/2);
await writeFile(path.join(out,'manifest.json'),JSON.stringify({version:'pixel-v11',equipmentBaseIllustrations:75,equipmentVariants:312,assets:records},null,2));
console.log('Illustrated package: '+records.length+' PNG assets');

