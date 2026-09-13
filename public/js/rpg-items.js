export const RPG_SLOTS={attack:'무기',defense:'방어구',heal:'회복 장신구'};
export const RPG_RARITIES=[
 {id:'common',name:'일반',chance:60,count:50,color:'white'},
 {id:'uncommon',name:'고급',chance:30,count:25,color:'blue'},
 {id:'rare',name:'희귀',chance:8,count:20,color:'purple'},
 {id:'legend',name:'전설',chance:1.5,count:6,color:'yellow'},
 {id:'divine',name:'신',chance:.5,count:3,color:'red'},
];

const legacy={
 attack:{common:['나무 연필검',5],uncommon:['은빛 펜촉검',10],rare:['유성 키보드',18],legend:['새벽의 만년필',28]},
 defense:{common:['종이 망토',2],uncommon:['단단한 책 표지',4],rare:['수호자의 사전',7],legend:['별빛 문장 갑옷',11]},
 heal:{common:['풀잎 책갈피',2],uncommon:['이슬 찻잔',4],rare:['달빛 잉크병',7],legend:['생명의 문장석',10]},
};
const slotNouns={attack:['연필검','펜촉검','키보드','만년필','문장검'],defense:['망토','책 표지','사전','문장 갑옷','수호패'],heal:['책갈피','찻잔','잉크병','문장석','부적']};
const rarityWords={
 common:['나무','종이','풀잎','햇살','구름','바람','모래','조약돌','이끼','새싹'],
 uncommon:['은빛','푸른','맑은','산들','파도','숲길','여울','비취','서리','청명'],
 rare:['유성','달빛','수호자의','보랏빛','황혼','신비한','별무리','몽환의','은하','예언의'],
 legend:['새벽의','별빛','태양의','영원의','황금빛','고대의'],
 divine:['천상의','신화의','창세의'],
};
const baseValues={attack:{common:5,uncommon:10,rare:18,legend:28,divine:38},defense:{common:2,uncommon:4,rare:7,legend:11,divine:15},heal:{common:2,uncommon:4,rare:7,legend:10,divine:14}};

function makeItem(slot,rarity,index){
 const old=index===0&&legacy[slot][rarity.id];
 const id=old?`${slot}-${rarity.id}`:`${slot}-${rarity.id}-${String(index+1).padStart(2,'0')}`;
 const word=rarityWords[rarity.id][index%rarityWords[rarity.id].length];
 const noun=slotNouns[slot][Math.floor(index/rarityWords[rarity.id].length)%slotNouns[slot].length];
 const cycle=Math.floor(index/(rarityWords[rarity.id].length*slotNouns[slot].length));
 const name=old?.[0]||`${word} ${noun}${cycle?` ${cycle+1}식`:''}`;
 const value=old?.[1]??baseValues[slot][rarity.id]+Math.floor(index/Math.max(1,Math.ceil(rarity.count/4)));
 return{id,slot,name,rarity:rarity.id,value,image:`/assets/pixel/items/${id}.svg`};
}

const generatedItems=Object.keys(RPG_SLOTS).flatMap(slot=>RPG_RARITIES.flatMap(rarity=>
 Array.from({length:rarity.count},(_,index)=>makeItem(slot,rarity,index))
));
const usedNames=new Set();
export const rpgItems=generatedItems.map(item=>{
 let name=item.name,suffix=2;while(usedNames.has(name))name=`${item.name} ${suffix++}식`;usedNames.add(name);return{...item,name};
});
const itemById=new Map(rpgItems.map(item=>[item.id,item]));

export function enhancedItemValue(item,enhancement=0){
 const level=Math.max(0,Math.min(10,Number(enhancement)||0));
 return Math.round(item.value*(1+level*.1));
}

export function gearStats(equipped={},inventory=[]){
 const stats={attack:0,defense:0,heal:0};
 const levels=new Map((inventory||[]).map(row=>[row.itemId??row.id,Number(row.enhancement)||0]));
 for(const slot of Object.keys(RPG_SLOTS)){
  const item=itemById.get(equipped[slot]);
  if(item?.slot===slot)stats[slot]=enhancedItemValue(item,levels.get(item.id)||0);
 }
 return stats;
}

export function chooseRpgItem(random=Math.random){
 let roll=random()*100,rarity=RPG_RARITIES.at(-1);
 for(const row of RPG_RARITIES){if(roll<row.chance){rarity=row;break;}roll-=row.chance;}
 const pool=rpgItems.filter(item=>item.rarity===rarity.id);
 return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
}
