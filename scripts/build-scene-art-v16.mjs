import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sources=JSON.parse(await readFile(path.join(root,'design/scene-sources-v16.json'),'utf8'));
const source=id=>path.join(root,sources.find(s=>s.id===id).path);
const out=path.join(root,'public/assets/pixel/scenes');await mkdir(out,{recursive:true});
const records=[];
async function save(id,name,input,width,height){
 const dest=path.join(out,id+'.png');
 await sharp(input).resize(width,height,{fit:'fill'}).png({palette:true,colours:256,compressionLevel:9,dither:0,effort:8}).toFile(dest);
 records.push({id,name,src:'/assets/pixel/scenes/'+id+'.png',width,height});
}
const names=['깊은 숲','버섯 마을','고대 유적','수정 동굴','설산 정상'];
for(let n=2;n<=6;n++){
 const input=source('jump-stage-'+n),m=await sharp(input).metadata();
 await save('jump-stage-'+n,names[n-2]+' · 배경',input,1152,768);
 const floor=await sharp(input).extract({left:Math.round(m.width*.25),top:Math.round(m.height*.8),width:Math.round(m.width*.5),height:Math.round(m.height*.12)}).png().toBuffer();
 await save('jump-stage-'+n+'-ground',names[n-2]+' · 바닥',floor,384,96);
}
async function split(id,cols,rows){
 const input=source(id),{data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const div=(count,axis)=>{const size=axis==='x'?info.width:info.height,other=axis==='x'?info.height:info.width,result=[0];for(let n=1;n<count;n++){const ideal=size*n/count,radius=size/count*.28;let best=Math.round(ideal),score=Infinity;for(let at=Math.floor(ideal-radius);at<Math.ceil(ideal+radius);at++){let opacity=0;for(let cross=0;cross<other;cross++){const x=axis==='x'?at:cross,y=axis==='x'?cross:at;opacity+=data[(y*info.width+x)*4+3]/255;}const v=opacity+Math.abs(at-ideal)*.003;if(v<score){score=v;best=at;}}result.push(best);}return [...result,size];};
 const xs=div(cols,'x'),ys=div(rows,'y'),cells=[];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const cell=await sharp(input).extract({left:xs[x],top:ys[y],width:xs[x+1]-xs[x],height:ys[y+1]-ys[y]}).png().toBuffer();cells.push(await sharp(cell).trim({background:'#00000000',threshold:8}).png().toBuffer());}
 return cells;
}
const obstacles=await split('jump-obstacles-v16',4,5),types=['short','wide','double','slide'];
for(let n=2;n<=6;n++)for(let col=0;col<4;col++){
 const cell=obstacles[(n-2)*4+col],m=await sharp(cell).metadata();
 await save(`jump-stage-${n}-${types[col]}`,names[n-2]+' · '+['낮은 장애물','넓은 장애물','높은 장애물','슬라이딩 장애물'][col],cell,256,Math.round(256*m.height/m.width));
}
const mascots=await split('sort-mascots-v16',2,3);
for(let row=0;row<3;row++)for(let col=0;col<2;col++){
 const cell=mascots[row*2+col],m=await sharp(cell).metadata();
 await save(`sort-v16-${['blue','white'][col]}-${['normal','smile','cry'][row]}`,['파란 여우','하얀 구름'][col]+' · '+['기본','웃음','눈물'][row],cell,256,Math.round(256*m.height/m.width));
}
await writeFile(path.join(root,'design/scene-assets-v16.json'),JSON.stringify(records,null,2));
console.log('v16 scene artwork: '+records.length+' PNG assets');
