import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ink='#49382d',cream='#fff1d3',gold='#dfb665',sage='#85985f';
const rect=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const poly=(points,c)=>`<polygon points="${points}" fill="${c}"/>`;
const svg=(body,w=32,h=32)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${body}</svg>`;
async function save(name,body,w,h){const target=path.join(root,'public/assets/pixel/world',name+'.svg');await mkdir(path.dirname(target),{recursive:true});await writeFile(target,svg(body,w,h));}
function eyes(x,y,face='normal',c=ink){let s='';for(const dx of [0,9]){if(face==='dead'){s+=rect(x+dx,y,1,1,c)+rect(x+dx+2,y,1,1,c)+rect(x+dx+1,y+1,1,1,c)+rect(x+dx,y+2,1,1,c)+rect(x+dx+2,y+2,1,1,c);}else if(face==='cry')s+=rect(x+dx,y,3,1,c)+rect(x+dx,y+1,1,4,'#79b8df')+rect(x+dx+2,y+1,1,4,'#79b8df');else if(face==='smile')s+=rect(x+dx,y,3,1,c)+rect(x+dx-1,y+1,1,1,c)+rect(x+dx+3,y+1,1,1,c);else s+=rect(x+dx,y,2,3,c);}return s;}
export function blobArt(color,face){const p=color==='blue'?['#76abd0','#afd5e9','#477fa7']:color==='purple'?['#a182be','#d4b4e0','#715388']:['#fff4db','#ffffff','#d3bfa0'];return poly('8,2 24,2 24,4 28,4 28,8 30,8 30,25 27,25 27,29 22,29 22,30 18,30 18,28 12,28 12,30 6,30 6,26 2,26 2,8 4,8 4,4 8,4',ink)+poly('8,4 23,4 23,6 26,6 26,9 28,9 28,24 24,24 24,27 20,27 20,26 10,26 10,28 7,28 7,24 4,24 4,9 6,9 6,6 8,6',p[0])+rect(8,5,14,2,p[1])+rect(5,9,2,8,p[1])+rect(25,12,2,12,p[2])+rect(10,24,13,2,p[2])+rect(5,20,4,2,'#e8a79c')+rect(22,20,4,2,'#e8a79c')+eyes(10,15,face)+rect(14,21,4,1,ink)+rect(15,22,2,1,ink);}
export function runnerArt(pose){const dead=pose==='dead',step=pose==='run-b'?2:0;let s=poly('6,2 11,2 13,5 21,5 23,2 27,3 28,11 30,14 29,23 25,26 25,30 19,30 18,28 12,28 11,31 5,31 5,27 2,25 2,21 4,18 3,11',ink);s+=rect(6,5,19,18,'#92714e')+rect(7,4,3,5,'#c4a274')+rect(23,5,3,5,'#c4a274')+rect(6,9,19,2,'#bda174')+rect(4,12,23,10,'#a58159')+poly('9,11 21,11 24,14 24,21 20,24 11,24 7,21 7,15',cream)+rect(10,12,11,2,'#fffbeb')+eyes(10,16,dead?'dead':'normal')+rect(7,20,4,2,'#e6a29a')+rect(21,20,3,2,'#e6a29a')+rect(15,21,3,1,ink)+rect(7,24,17,3,'#638153')+rect(5,27+step,6,3,'#92714e')+rect(20,29-step,5,2,'#b29367')+rect(3,21,4,5,'#b29367')+rect(25,22,5,3,'#92714e')+rect(26,21,3,1,cream)+rect(7,25,2,2,gold);if(pose==='jump')s+=rect(2,28,3,1,'#e3cf9f');return s;}
function symbol(kind,c=gold){const r=(x,y,w,h)=>rect(x,y,w,h,c);const gem=poly('16,3 24,11 24,19 16,27 8,19 8,11',c);switch(kind){
case 'leaf':return poly('5,23 5,15 10,9 20,5 27,5 27,12 23,22 16,27 8,27',c)+rect(10,21,12,2,cream)+rect(15,14,2,9,cream);
case 'fire':return poly('14,2 20,10 20,16 25,12 28,22 24,29 8,29 4,23 8,13 10,20 14,14',c)+poly('16,14 21,23 19,27 12,27 11,23',cream);
case 'rock':return poly('8,10 20,6 27,13 28,24 23,28 6,28 3,22',c)+rect(8,13,13,3,cream)+rect(6,19,3,6,'#b6935e');
case 'star':return poly('14,2 18,2 18,10 21,10 21,13 30,13 30,17 21,17 21,21 18,21 18,29 14,29 14,21 10,21 10,17 2,17 2,13 10,13 10,10 14,10',c)+r(14,12,4,7);
case 'drop':return poly('15,2 17,2 17,6 22,12 27,20 27,25 22,30 10,30 5,25 5,20 10,12 15,6',c)+rect(9,20,3,6,cream);
case 'sun':return rect(10,8,12,16,c)+rect(8,10,16,12,c)+r(14,1,4,4)+r(14,27,4,4)+r(1,14,4,4)+r(27,14,4,4)+r(4,4,4,4)+r(24,24,4,4)+r(24,4,4,4)+r(4,24,4,4)+eyes(11,14,'smile');
case 'moon':return poly('16,2 23,4 16,6 12,12 12,20 17,25 25,25 20,30 11,28 5,22 3,15 6,7',c)+r(23,9,3,3)+r(26,13,2,2);
case 'heart':return poly('3,8 6,5 12,5 16,9 20,5 26,5 29,8 29,16 16,29 3,16',c)+rect(6,8,5,3,cream);
case 'crown':return poly('3,7 10,13 16,3 22,13 29,7 26,27 6,27',c)+rect(7,22,18,2,cream)+rect(14,15,4,5,'#ba725e');
case 'book':return rect(4,5,24,24,ink)+rect(6,7,9,19,cream)+rect(17,7,9,19,cream)+rect(9,10,4,2,c)+rect(19,10,4,2,c)+rect(9,15,4,2,c)+rect(19,15,4,2,c);
case 'flower':return rect(15,15,3,16,sage)+rect(8,5,16,16,c)+rect(5,8,22,10,c)+rect(11,9,10,9,cream)+rect(13,11,6,5,gold)+rect(5,22,10,4,sage);
case 'lantern':return rect(11,2,10,3,c)+rect(9,5,3,5,c)+rect(20,5,3,5,c)+rect(6,10,20,3,c)+rect(7,13,3,14,c)+rect(22,13,3,14,c)+rect(6,27,20,3,c)+rect(12,15,8,10,cream);
case 'wheel':return rect(6,4,20,4,c)+rect(3,8,4,16,c)+rect(25,8,4,16,c)+rect(6,24,20,4,c)+rect(14,6,4,22,c)+rect(6,14,20,4,c)+rect(12,12,8,8,cream);
case 'tower':return rect(7,7,18,23,c)+rect(5,2,6,7,c)+rect(14,2,5,7,c)+rect(23,2,5,7,c)+rect(11,12,4,4,cream)+rect(19,12,3,4,cream)+rect(14,23,5,7,ink);
case 'scales':return rect(15,3,3,24,c)+rect(3,7,26,3,c)+rect(5,9,2,10,c)+rect(25,9,2,10,c)+rect(2,19,9,4,c)+rect(22,19,9,4,c)+rect(9,28,16,3,c);
case 'hourglass':return rect(7,3,18,3,c)+rect(7,27,18,3,c)+poly('9,6 23,6 23,11 18,16 23,21 23,27 9,27 9,21 14,16 9,11',c)+rect(13,8,6,3,cream);
case 'world':return rect(8,3,16,3,c)+rect(3,8,3,16,c)+rect(26,8,3,16,c)+rect(8,26,16,3,c)+rect(6,6,20,20,'#668d85')+poly('8,7 18,7 18,12 14,12 14,18 8,18',sage)+rect(19,18,7,7,sage);
case 'wand':return poly('5,26 8,29 25,12 22,9',c)+rect(18,3,8,8,cream)+rect(21,0,2,3,c)+rect(27,6,3,2,c);
case 'bell':return rect(12,5,8,3,c)+rect(8,8,16,15,c)+rect(5,23,22,4,c)+rect(14,28,4,3,c)+rect(11,9,3,8,cream);
case 'cups':return rect(3,9,11,12,c)+rect(19,3,11,12,c)+rect(7,21,3,7,c)+rect(23,15,3,7,c)+rect(3,28,11,2,c)+rect(19,23,11,2,c);
case 'chain':return rect(3,8,13,4,c)+rect(3,8,4,12,c)+rect(3,18,13,4,c)+rect(12,13,8,5,c)+rect(18,11,12,4,c)+rect(26,11,4,12,c)+rect(18,21,12,4,c);
case 'chariot':return rect(4,11,24,13,c)+rect(8,7,16,4,c)+rect(6,24,5,6,ink)+rect(22,24,5,6,ink)+rect(8,12,16,7,cream);
case 'lion':return rect(4,7,24,19,c)+rect(7,3,18,26,c)+rect(10,10,12,14,cream)+eyes(10,13)+rect(14,21,4,2,ink);
case 'butterfly':return poly('3,4 11,6 16,14 21,6 29,4 29,17 22,20 26,27 19,28 16,22 13,28 6,27 10,20 3,17',c)+rect(15,10,3,14,ink);
default:return gem+rect(14,9,4,12,cream);}}
function vehicle(kind){const p=kind==='sport'?['#b9694f','#e4a278']:kind==='touring'?['#60856d','#aec798']:kind==='bus'?['#b29551','#efd99a']:kind==='truck'?['#638594','#a8c8d0']:kind==='van'?['#8b799d','#c4b0d5']:['#ba8d44','#f0cc75'];const tall=['bus','truck','van'].includes(kind);return rect(7,4,18,25,ink)+rect(4,12,4,7,ink)+rect(24,12,4,7,ink)+rect(5,24,4,7,ink)+rect(24,24,4,7,ink)+rect(8,5,16,24,p[0])+rect(10,4,12,3,p[1])+rect(8,20,16,7,p[1])+rect(9,10,14,tall?12:7,'#344950')+rect(10,11,5,3,'#c0d8d3')+rect(17,11,5,3,'#87b5ba')+rect(9,25,4,2,'#bf5c4e')+rect(20,25,3,2,'#bf5c4e')+rect(13,27,6,1,cream)+(kind==='sport'?rect(5,23,22,3,ink)+rect(6,23,20,1,p[1]):kind==='touring'?rect(12,6,8,3,'#5b4939'):kind==='bus'?rect(9,16,14,2,p[1])+rect(9,21,14,2,p[1]):'');}
export async function generateWorldAssets(){
for(const color of ['blue','white','purple'])for(const face of ['normal','smile','cry'])await save(`sort-${color}-${face}`,blobArt(color,face));
for(const pose of ['run-a','run-b','jump','slide','dead'])await save(`runner-${pose}`,runnerArt(pose));
for(const kind of ['basic','sport','touring','car','van','truck','bus'])await save(`vehicle-${kind}`,vehicle(kind));
const elements=[['wood','leaf',sage],['fire','fire','#ba6b52'],['earth','rock','#b39663'],['metal','star','#c8ba95'],['water','drop','#6d9ea9']];for(const [name,kind,color] of elements)await save(`element-${name}`,symbol(kind,color));
for(const [kind,color] of [['coin',gold],['fuel',sage],['boost','#a58aba'],['trophy',gold],['book',gold],['heart','#c98679'],['lantern',gold],['star',gold]]){const body=kind==='coin'?rect(6,3,20,26,ink)+rect(3,7,26,18,ink)+rect(7,5,18,22,gold)+rect(5,9,22,14,gold)+rect(11,9,9,3,cream)+rect(11,12,3,11,cream)+rect(11,21,9,3,cream):kind==='fuel'?rect(8,2,11,5,ink)+rect(11,3,5,2,gold)+rect(4,7,24,24,ink)+rect(6,9,20,20,sage)+rect(8,10,4,15,'#b4c993')+poly('20,13 14,19 18,19 13,25 23,18 19,18',cream):symbol(kind==='boost'?'fire':kind==='trophy'?'crown':kind,color);await save(kind,body);}
const majors=['leaf','wand','moon','flower','crown','book','heart','chariot','lion','lantern','wheel','scales','hourglass','butterfly','cups','chain','tower','star','moon','sun','bell','world'];
for(let i=0;i<22;i++){const color=['#748950','#aa6853','#638791','#96805c','#857394'][i%5];let b=rect(2,2,60,100,ink)+rect(4,4,56,96,cream)+rect(7,7,50,90,color)+rect(9,9,46,86,'#f5e5c3');b+=rect(12,13,40,61,color)+rect(14,15,36,57,'#263e3c');b+=`<g transform="translate(16 29)">${symbol(majors[i],gold)}</g>`;b+=rect(18,79,28,2,color)+rect(24,85,16,2,color);for(const [x,y]of [[19,21],[44,25],[20,64],[46,61]])b+=rect(x,y,2,2,cream);for(let j=0;j<=i%7;j++)b+=rect(18+j*4,91,2,2,color);await save(`tarot-${i}`,b,64,104);}
let back=rect(2,2,60,100,ink)+rect(4,4,56,96,cream)+rect(7,7,50,90,'#405c4a');for(let y=12;y<94;y+=8)for(let x=12;x<54;x+=8)back+=rect(x,y,2,2,'#76916c');back+=rect(14,31,36,40,ink)+rect(16,33,32,36,'#405c4a')+`<g transform="translate(16 34)">${symbol('moon',gold)}</g>`;await save('tarot-back',back,64,104);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){await generateWorldAssets();console.log('Generated 57 woodland world assets');}
