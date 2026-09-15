import {drawWorldSprite,preloadWorld,portraitImage,drawPortraitSprite} from './pixel-world.js';
import {jumpStage,jumpStageIndex} from './jump-patterns-v17.js';
import {createJumpEngineV18} from './jump-engine-v18.js';
import {JUMP_FLOOR,jumpDistanceMeters} from './jump-physics-v18.js';
export * from './jump-physics-v18.js';
import {drawSceneCover,drawSceneTileX,preloadSceneArt,sceneImage,sceneImageReady} from './scene-art.js';

const CANVAS_WIDTH=1080,CANVAS_HEIGHT=450,PLAYER_DRAW_X=108;
const JUMP_OBSTACLE_ART={ground:'jump-obstacle-short',wide:'jump-obstacle-wide',double:'jump-obstacle-double',slide:'jump-obstacle-slide',middle:'jump-obstacle-middle'};
function rounded(pen, x, y, width, height, radius, color) {
  pen.fillStyle = color; pen.beginPath();
  if (pen.roundRect) pen.roundRect(x, y, width, height, radius); else pen.rect(x, y, width, height);
  pen.fill();
}

export function createJump(ctx) {
  preloadWorld(['heart','runner-run-a','runner-run-b','runner-jump','runner-slide','runner-dead']);
  ['runner','runner-run-b','runner-jump','runner-slide','runner-dead'].forEach(portraitImage);
  const sceneNames=['jump-forest','jump-ground','jump-obstacle-short','jump-obstacle-wide','jump-obstacle-double','jump-obstacle-slide','jump-obstacle-middle'];
  preloadSceneArt(sceneNames);const sceneArt=Object.fromEntries(sceneNames.map(name=>[name,sceneImage(name)]));
  const stageAssetNames = index => index === 0 ? [] : [
    `jump-stage-${index+1}`,
    `jump-stage-${index+1}-ground`,
    ...['short','wide','double','slide'].map(kind=>`jump-stage-${index+1}-${kind}`),
  ];
  const warmedStages = new Set([0]);
  function warmStage(index) {
    if (index < 1 || index > 5 || warmedStages.has(index)) return;
    const names=stageAssetNames(index); preloadSceneArt(names);
    for(const name of names) sceneArt[name]=sceneImage(name);
    warmedStages.add(index);
  }
  warmStage(1);
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH; canvas.height = CANVAS_HEIGHT; canvas.className = "dg-game__canvas jump--v4";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "장애물을 뛰거나 숙여 피하며 거리를 늘리는 멀리 뛰기 게임");
  const pen = canvas.getContext("2d");
  // A closer camera on phones preserves the world-space collision boxes while
  // making the runner readable. Obstacles continue to approach from the same world.
  const fitCamera = () => { const width = window.innerWidth < 680 ? 640 : CANVAS_WIDTH; if(canvas.width !== width)canvas.width=width; };
  fitCamera();
  const controls = document.createElement("div"); controls.className = "dg-game__split-controls";
  const duckButton = document.createElement("button"), jumpButton = document.createElement("button");
  duckButton.textContent = "↓ 꾹 눌러 숙이기"; jumpButton.textContent = "↑ 점프 · 두 번 가능";
  for (const button of [duckButton, jumpButton]) { button.type = "button"; button.className = "dg-game__control"; }
  controls.append(duckButton, jumpButton);
  const hint = document.createElement("p"); hint.className = "dg-game__jump-hint";
  hint.textContent = "점프 → 공중에서 ↓ 급강하! 빛나는 룬 돌은 위로 뛰거나 아래로 숙여 피하세요.";
  ctx.stage.append(canvas, controls, hint);

  const engine=createJumpEngineV18(ctx.random),{player,obstacles,hearts}=engine.state;
  let elapsed=0,distancePixels=0,scroll=0,lives=3,invincibleMs=0,ending=null;
  let pointerDuck=false,keyboardDuck=false,duckPointerId=null;const heldJumpKeys=new Set();
  ctx.root?.classList.add('dg-game--jump-v18');
  const jump=()=>{if(!ctx.isFinished()&&!ending){pointerDuck=false;keyboardDuck=false;duckPointerId=null;engine.input('jump');draw();}};
  const stopDuck=event=>{if(event&&duckPointerId!==event.pointerId)return;pointerDuck=false;duckPointerId=null;if(!keyboardDuck)engine.input('release');};
  const clearHeld=()=>{pointerDuck=false;keyboardDuck=false;duckPointerId=null;heldJumpKeys.clear();engine.clearHeld();};
  ctx.listen(jumpButton, "pointerdown", (event) => { event.preventDefault(); jump(); });
  ctx.listen(jumpButton, "click", (event) => { if (event.detail === 0) jump(); });
  ctx.listen(canvas, "pointerdown", (event) => { event.preventDefault(); jump(); });
  ctx.listen(duckButton, "pointerdown", (event) => {
    event.preventDefault(); if(ending)return; pointerDuck = true; duckPointerId=event.pointerId; engine.input('duck');
    try { duckButton.setPointerCapture?.(event.pointerId); } catch { /* Synthetic pointer events have no active pointer to capture. */ }
    draw();
  });
  ctx.listen(document, "pointerup", stopDuck); ctx.listen(document, "pointercancel", stopDuck); ctx.listen(duckButton, "lostpointercapture", stopDuck);
  ctx.listen(document, "keydown", (event) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName || "") || event.target?.isContentEditable) return;
    if(ending)return;
    if (["Space", "ArrowUp", "KeyW"].includes(event.code)) { event.preventDefault(); if (!heldJumpKeys.has(event.code)) { heldJumpKeys.add(event.code); jump(); } }
    if (event.code === "ArrowDown") { event.preventDefault(); if(!event.repeat){keyboardDuck = true; engine.input('duck'); draw();} }
  });
  ctx.listen(document, "keyup", (event) => { heldJumpKeys.delete(event.code); if (event.code === "ArrowDown") { keyboardDuck = false; if(!pointerDuck)engine.input('release'); draw(); } });
  ctx.listen(window, "blur", clearHeld);

  function drawGroundObstacle(obstacle) {
    const color = obstacle.kind === "double" ? "#996854" : obstacle.kind === "wide" ? "#a96f54" : "#b98068";
    pen.fillStyle="#49382d"; pen.fillRect(obstacle.x,obstacle.y,obstacle.w,obstacle.h); pen.fillStyle=color; pen.fillRect(obstacle.x+3,obstacle.y+3,obstacle.w-6,obstacle.h-3); pen.fillStyle="#92a86b"; pen.fillRect(obstacle.x,obstacle.y,obstacle.w,7); pen.fillStyle="#bed09b"; for(let x=obstacle.x+4;x<obstacle.x+obstacle.w-4;x+=12)pen.fillRect(x,obstacle.y+2,5,2);
    if (obstacle.kind === "wide") {
      pen.strokeStyle = "#784d3b"; pen.lineWidth = 4; pen.beginPath();
      pen.moveTo(obstacle.x + obstacle.w / 2, obstacle.y + 7); pen.lineTo(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h - 7); pen.stroke();
    }
    if (obstacle.kind === "double") {
      pen.fillStyle = "#c89a79";
      for (let y = obstacle.y + 12; y < JUMP_FLOOR - 8; y += 30) pen.fillRect(obstacle.x + 8, y, obstacle.w - 16, 5);
    }
  }
  function drawSlideObstacle(obstacle) {
    pen.fillStyle = "#937a58"; pen.fillRect(obstacle.x, 0, obstacle.w, obstacle.h - 18);
    pen.fillStyle="#49382d";pen.fillRect(obstacle.x-7,obstacle.h-32,obstacle.w+14,32);pen.fillStyle="#647f52";pen.fillRect(obstacle.x-4,obstacle.h-29,obstacle.w+8,25);
  }
  function drawObstacle(obstacle){
    const suffix=JUMP_OBSTACLE_ART[obstacle.kind]?.replace('jump-obstacle-','')||'short';
    const image=obstacle.kind==='middle'?sceneArt['jump-obstacle-middle']:sceneArt[obstacle.stageIndex ? `jump-stage-${obstacle.stageIndex+1}-${suffix}` : JUMP_OBSTACLE_ART[obstacle.kind]||JUMP_OBSTACLE_ART.ground];
    if(sceneImageReady(image))pen.drawImage(image,obstacle.x,obstacle.kind==='slide'?0:obstacle.y,obstacle.w,obstacle.kind==='slide'?obstacle.h:obstacle.h);
    else if(obstacle.kind==='slide')drawSlideObstacle(obstacle);else drawGroundObstacle(obstacle);
    if(obstacle.kind==='middle'){pen.fillStyle='#fff8e8';pen.strokeStyle='#49382d';pen.lineWidth=3;pen.textAlign='center';pen.font='800 18px sans-serif';pen.strokeText('↕',obstacle.x+obstacle.w/2,obstacle.y-8);pen.fillText('↕',obstacle.x+obstacle.w/2,obstacle.y-8);}
    if(obstacle.kind==='double'){pen.fillStyle='#fff8e8';pen.strokeStyle='#49382d';pen.lineWidth=4;pen.textAlign='center';pen.font='800 18px sans-serif';pen.strokeText('2단!',obstacle.x+obstacle.w/2,obstacle.y+27);pen.fillText('2단!',obstacle.x+obstacle.w/2,obstacle.y+27);}
    if(obstacle.kind==='slide'){pen.fillStyle='#eef4ed';pen.strokeStyle='#49382d';pen.lineWidth=4;pen.textAlign='center';pen.font='800 17px sans-serif';pen.strokeText('↓ 숙이기',obstacle.x+obstacle.w/2,obstacle.h-10);pen.fillText('↓ 숙이기',obstacle.x+obstacle.w/2,obstacle.h-10);}
  }
  function drawWoodland(viewWidth, stage) {
    pen.fillStyle = stage.sky; pen.fillRect(0, 0, viewWidth, CANVAS_HEIGHT);
    pen.fillStyle = "#f6df94"; pen.fillRect(viewWidth - 148, 51, 64, 64); pen.fillRect(viewWidth - 140, 43, 48, 80);
    pen.fillStyle = stage.ridge;
    for (let index = -1; index < 7; index += 1) {
      const x = index * 190 - (scroll * .08 % 190);
      pen.beginPath(); pen.moveTo(x, JUMP_FLOOR); pen.lineTo(x + 90, 224); pen.lineTo(x + 180, JUMP_FLOOR); pen.fill();
    }
    pen.fillStyle = "#b9d0b2";
    for (let index = -1; index < 8; index += 1) {
      const x = index * 160 - (scroll * .18 % 160);
      pen.fillRect(x + 66, 276, 22, 114);
      pen.fillRect(x + 12, 263, 130, 34); pen.fillRect(x + 30, 232, 92, 42); pen.fillRect(x + 51, 207, 52, 38);
    }
    pen.fillStyle = stage.ridge; pen.fillRect(0, JUMP_FLOOR, viewWidth, 60);
    pen.fillStyle = stage.ground;
    for (let x = -(scroll % 90); x < viewWidth + 30; x += 90) {
      pen.fillRect(x, 419, 38, 4); pen.fillRect(x + 12, 397, 4, 9); pen.fillRect(x + 7, 400, 14, 3);
    }
    pen.fillStyle = "#e6b95f";
    for (let x = 58 - (scroll * .55 % 210); x < viewWidth; x += 210) { pen.fillRect(x, 405, 5, 5); pen.fillRect(x + 2, 410, 2, 8); }
  }
  function draw() {
    fitCamera();
    const viewWidth = canvas.width;
    const stage = jumpStage(jumpDistanceMeters(distancePixels));
    pen.clearRect(0, 0, viewWidth, CANVAS_HEIGHT);
    const stageBackground=stage.id==='easy'?sceneArt['jump-forest']:sceneArt[`jump-stage-${jumpStageIndex(jumpDistanceMeters(distancePixels))+1}`];
    if(sceneImageReady(stageBackground)) drawSceneCover(pen,stageBackground,0,0,viewWidth,CANVAS_HEIGHT,.5,.46);
    else drawWoodland(viewWidth, stage);
    const groundImage=stage.id==='easy'?sceneArt['jump-ground']:sceneArt[`jump-stage-${jumpStageIndex(jumpDistanceMeters(distancePixels))+1}-ground`];
    drawSceneTileX(pen,groundImage,JUMP_FLOOR,CANVAS_HEIGHT-JUMP_FLOOR,scroll,viewWidth);
    for (const obstacle of obstacles) { if(obstacle.x>viewWidth+20||obstacle.x+obstacle.w<0)continue;pen.globalAlpha = obstacle.hit ? .3 : 1; drawObstacle(obstacle); }
    pen.globalAlpha = 1;
    for (const heart of hearts) drawWorldSprite(pen,'heart',heart.x,heart.y,heart.w,heart.h);
    pen.globalAlpha = 1;
    const duck = player.duck && player.y >= JUMP_FLOOR - .01, height = duck ? 34 : 72;
    if (!invincibleMs || Math.floor(invincibleMs / 95) % 2 === 0) {
      const pose=ending&&player.y>=JUMP_FLOOR-.01?'dead':duck?'slide':player.y<JUMP_FLOOR-.01?'jump':Math.floor(elapsed/140)%2?'run-a':'run-b';
      const portrait=pose==='run-a'?'runner':'runner-'+pose;
      const drawnHeight=pose==='dead'?62:height;
      const bob=pose.startsWith('run')?Math.floor(elapsed/140)%2*2:0;
      if(!drawPortraitSprite(pen,portrait,PLAYER_DRAW_X,player.y-drawnHeight-bob,64,drawnHeight)&&!drawWorldSprite(pen,'runner-'+pose,PLAYER_DRAW_X,player.y-height,64,height)){pen.fillStyle='#92714e';pen.fillRect(PLAYER_DRAW_X+7,player.y-height,50,height);}

    }
    pen.font = "800 32px Galmuri11, sans-serif";
    const distanceLabel = `${jumpDistanceMeters(distancePixels).toFixed(1)} m`;
    rounded(pen,14,14,Math.max(158,pen.measureText(distanceLabel).width+24),47,4,'#fff8e8ef');
    rounded(pen,viewWidth-152,14,138,47,4,'#fff8e8ef');
    pen.fillStyle = "#284e3d"; pen.textAlign = "left"; pen.fillText(distanceLabel, 26, 48);
    pen.textAlign = "right"; pen.fillStyle = "#bc6f6c"; pen.font = "26px sans-serif"; pen.fillText(Array.from({length:3},(_,i)=>i<lives?'♥':'♡').join(' '), viewWidth - 26, 47);
    { rounded(pen,14,69,132,32,4,'#fff8e8dd'); pen.fillStyle='#284e3d'; pen.textAlign='left'; pen.font='700 17px Galmuri11, sans-serif'; pen.fillText(`${jumpStageIndex(jumpDistanceMeters(distancePixels))+1}구간 · 연계`,25,92); }
    if (elapsed < 1000) { const hintWidth=Math.min(570,viewWidth-28);rounded(pen,(viewWidth-hintWidth)/2,136,hintWidth,43,10,'#fff9dddc');pen.textAlign = "center"; pen.fillStyle = "#345445"; pen.font = "700 21px Galmuri11, sans-serif"; pen.fillText("점프 두 번 · 공중에서 ↓ 빠른 착지", viewWidth / 2, 166); }
  }
  function sync(){({elapsedMs:elapsed,worldDistance:distancePixels,lives,invincibleMs,ending}=engine.state);scroll=distancePixels;}
  draw();ctx.setStatus('');
  return {
    tick(ms){
      engine.tick(ms);sync();warmStage(jumpStageIndex(engine.state.distance)+1);draw();
      if(ending?.groundedMs>=650&&!ctx.isFinished())ctx.finish({value:engine.state.distance,display:engine.state.distance.toFixed(1),unit:'m',higherBetter:true,mode:'jump-distance-v18',details:{distance:engine.state.distance,avoided:engine.state.avoided,survivedSeconds:Number((elapsed/1000).toFixed(1))}});
    },
    onPause(paused){if(paused)clearHeld();},
    getState:()=>({...engine.getState(),stage:jumpStage(engine.state.distance)}),
  };
}
