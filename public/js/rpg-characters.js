const characterRows = [
  ['leaf-cloak-traveler','잎망토 여행자','common',0],
  ['owl-scholar','빨간모자 부엉이 학자','common',150],
  ['sleepy-sheep','파란 잠꾸러기 양','common',150],
  ['fox-knight','주황여우 기사','common',150],
  ['flower-healer','꽃토끼 치유사','uncommon',300],
  ['lantern-sprite','잎사귀 등불요정','uncommon',300],
  ['raccoon-explorer','갈색망토 너구리 탐험가','uncommon',300],
  ['telescope-wizard','망원경 보랏빛 고양이 마법사','uncommon',300],
  ['bird-mail-carrier','노랑새 우편배달부','rare',600],
  ['teacup-otter','찻잔 수달','rare',600],
  ['red-panda-drummer','레서판다 북잡이','rare',600],
  ['moon-cat','달빛 등불고양이','rare',600],
  ['raccoon-mechanic','고글 너구리 정비사','legend',1000],
  ['rabbit-painter','흰토끼 화가','legend',1000],
  ['leaf-gardener','잎사귀 정원사','legend',1000],
  ['owl-aviator','고글 부엉이 비행사','legend',1000],
];

export const RPG_CHARACTER_TIERS = Object.freeze({
  common:'일반',
  uncommon:'고급',
  rare:'희귀',
  legend:'전설',
});

export const RPG_CHARACTERS = Object.freeze(characterRows.map(([id,name,tier,price],index)=>Object.freeze({id,name,tier,price,index})));
export const RPG_DEFAULT_CHARACTER_ID = RPG_CHARACTERS[0].id;
const characterById = new Map(RPG_CHARACTERS.map(character=>[character.id,character]));

export function rpgCharacter(characterId){
  return characterById.get(characterId) || characterById.get(RPG_DEFAULT_CHARACTER_ID);
}

export function rpgCharacterArtPath(characterId){
  return `/assets/pixel/illustrated/personas/${rpgCharacter(characterId).index}.png`;
}

export function rpgCharacterFallbackPath(characterId){
  return `/assets/pixel/personas/${rpgCharacter(characterId).index}.svg`;
}

export const RPG_MONSTER_NAMES_25 = Object.freeze([
  '숲 슬라임','버섯 고블린','달빛 해파리','이끼 골렘','에메랄드 드래곤',
  '도토리 미믹','꿀벌 기사','솔방울 고슴도치','호박 임프','뿔토끼',
  '수정 달팽이','불꽃 도롱뇽','아홀로틀','태엽 딱정벌레','구름 숫양',
  '등불 유령','산호 게','종이학 마법사','산딸기 박쥐','그루터기 부엉이',
  '그림자 아기늑대','모래 전갈','해바라기 사자','얼음 펭귄','별빛 불사조',
]);

export function rpgMonsterIndex(stage){
  const current=Math.max(1,Math.floor(Number(stage)||1));
  return (current-1)%RPG_MONSTER_NAMES_25.length;
}

export function rpgMonsterName(stage,boss=false){
  const name=RPG_MONSTER_NAMES_25[rpgMonsterIndex(stage)];
  return boss?`${name} 대장`:name;
}

export function rpgMonsterArtPath(stage){
  return `/assets/pixel/illustrated/monsters/${String(rpgMonsterIndex(stage)+1).padStart(2,'0')}.png`;
}
