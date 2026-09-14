import {drawWorldSprite,preloadWorld,portraitImage,drawPortraitSprite} from './pixel-world.js';
import { JUMP_V16_RULES,jumpDifficultyLevel,jumpPatterns100,jumpPatternTypeForStage,jumpStage,jumpStageIndex,jumpTargetObstaclesPer10s,jumpV13NextPatternDistance,jumpV16NextPatternDistance,jumpV16TargetObstaclesPer10s,jumpWorldDelta,jumpWorldSpeedV11,jumpWorldSpeedV13,nextHeartMeters,shuffledJumpPatterns } from "./jump-patterns.js";
import {drawSceneCover,drawSceneTileX,preloadSceneArt,sceneImage,sceneImageReady} from './scene-art.js';

export const JUMP_FLOOR = 390;
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 450;
const PLAYER_DRAW_X = 108;
const METERS_PER_PIXEL = 1 / 20;
const JUMP_OBSTACLE_ART={basic:'jump-obstacle-short',wide:'jump-obstacle-wide',double:'jump-obstacle-double',slide:'jump-obstacle-slide'};

export function jumpPlayerBox(player) {
  const crouched = player.duck && player.y >= JUMP_FLOOR - .01;
  return { x: 116, y: player.y - (crouched ? 31 : 65), w: 48, h: crouched ? 27 : 61 };
}

export function jumpObstacleBox(obstacle) {
  return { x: obstacle.x + 6, y: obstacle.y + 6, w: obstacle.w - 12, h: obstacle.h - 12 };
}

export function jumpCollides(player, obstacle) {
  if (obstacle.passed) return false;
  const a = jumpPlayerBox(player);
  const b = jumpObstacleBox(obstacle);
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function stepJumpPlayer(player, seconds) {
  player.vy += (player.jumps === 2 ? 1250 : 1500) * seconds;
  player.y = Math.min(JUMP_FLOOR, player.y + player.vy * seconds);
  if (player.y >= JUMP_FLOOR) { player.vy = 0; player.jumps = 0; }
}

export function tryJump(player) {
  if (player.jumps >= 2) return false;
  player.duck = false;
  player.vy = player.jumps === 1 ? -700 : -610;
  player.jumps += 1;
  return true;
}

export function jumpDistanceMeters(pixelDistance) {
  return Math.round(Math.max(0, pixelDistance) * METERS_PER_PIXEL * 10) / 10;
}

export function jumpRunAfterHit(lives) {
  const remaining = Math.max(0, lives - 1);
  return { lives: remaining, finished: remaining === 0 };
}

export function jumpHeal(lives, amount = 1) {
  return Math.min(JUMP_V16_RULES.maxLives, Math.max(0, lives) + Math.max(0, amount));
}

export function canSpawnJumpHeart(obstacles, pendingCount, player) {
  const playerX=jumpPlayerBox(player).x;
  return pendingCount===0&&obstacles.every(obstacle=>obstacle.hit||obstacle.passed||obstacle.x+obstacle.w<playerX);
}

function rounded(pen, x, y, width, height, radius, color) {
  pen.fillStyle = color; pen.beginPath();
  if (pen.roundRect) pen.roundRect(x, y, width, height, radius); else pen.rect(x, y, width, height);
  pen.fill();
}

export function createJump(ctx,{version='v16'}={}) {
  preloadWorld(['heart','runner-run-a','runner-run-b','runner-jump','runner-slide','runner-dead']);
  ['runner','runner-run-b','runner-jump','runner-slide','runner-dead'].forEach(portraitImage);
  const sceneNames=['jump-forest','jump-ground','jump-obstacle-short','jump-obstacle-wide','jump-obstacle-double','jump-obstacle-slide'];
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
  if(version==='v16') warmStage(1);
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
  hint.textContent = "높은 벽은 점프를 두 번 눌러요. 두 번째 점프는 더 높고 여유롭게 떠요.";
  ctx.stage.append(canvas, controls, hint);

  const player = { y: JUMP_FLOOR, vy: 0, jumps: 0, duck: false };
  const obstacles = [], pendingEvents = [], hearts = [];
  let deck = [], currentPattern = null, previousPatternId = null, patternsSeen = 0, nextPatternDistance = 0;
  let elapsed = 0, distancePixels = 0, avoided = 0, lives = version === 'v16' ? 3 : 2, invincibleMs = 0, nextObstacleId = 1, scroll = 0;
  let pointerDuck = false, keyboardDuck = false, ending = null;
  let jumpBufferMs = 0, nextHeartAt = version === 'v16' ? nextHeartMeters(0, ctx.random, true) : Infinity, heartsCollected = 0;
  const heldJumpKeys = new Set();
  ctx.root?.classList.add('dg-game--jump-v16');

  function refillDeck() {
    deck = shuffledJumpPatterns(ctx.random);
    if (previousPatternId && deck[0]?.id === previousPatternId) deck.push(deck.shift());
  }
  function takePattern() {
    if (!deck.length) refillDeck();
    if(version==='v16') {
      const stageIndex=jumpStageIndex(jumpDistanceMeters(distancePixels));
      const wanted=jumpPatternTypeForStage(stageIndex,ctx.random);
      let match=deck.findIndex(pattern=>pattern.type===wanted&&(stageIndex<3||pattern.events.length===1));
      if(match<0&&stageIndex>=3) {
        refillDeck();
        match=deck.findIndex(pattern=>pattern.type===wanted&&pattern.events.length===1);
      }
      if(match>0) [deck[0],deck[match]]=[deck[match],deck[0]];
    }
    const pattern = deck.shift(); previousPatternId = pattern.id; return pattern;
  }
  function addObstacle(pattern, event, eventIndex) {
    obstacles.push({ ...event, id: nextObstacleId++, patternId: pattern.id, eventIndex, stageIndex: version==='v16'?jumpStageIndex(jumpDistanceMeters(distancePixels)):0, x: CANVAS_WIDTH + 28, hit: false, passed: false });
  }
  function beginPattern() {
    currentPattern = takePattern(); patternsSeen += 1;
    currentPattern.events.forEach((event, eventIndex) => {
      if (event.atDistance === 0) addObstacle(currentPattern, event, eventIndex);
      else pendingEvents.push({ pattern: currentPattern, event, eventIndex, remainingDistance: event.atDistance });
    });
    const meters = jumpDistanceMeters(distancePixels);
    nextPatternDistance = version==='v11'?Math.max(...currentPattern.events.map(({ atDistance }) => atDistance))+currentPattern.gapAfterDistance:version==='v16'?jumpV16NextPatternDistance(currentPattern,elapsed,meters):jumpV13NextPatternDistance(currentPattern,elapsed);
  }

  const jump = () => { if (!ctx.isFinished() && !ending) { if (!tryJump(player)) jumpBufferMs = JUMP_V16_RULES.jumpBufferMs; draw(); } };
  const stopDuck = () => { pointerDuck = false; player.duck = keyboardDuck; };
  const clearHeld = () => { pointerDuck = false; keyboardDuck = false; player.duck = false; jumpBufferMs = 0; heldJumpKeys.clear(); };
  ctx.listen(jumpButton, "pointerdown", (event) => { event.preventDefault(); jump(); });
  ctx.listen(jumpButton, "click", (event) => { if (event.detail === 0) jump(); });
  ctx.listen(canvas, "pointerdown", (event) => { event.preventDefault(); jump(); });
  ctx.listen(duckButton, "pointerdown", (event) => {
    event.preventDefault(); if(ending)return; pointerDuck = true; player.duck = true;
    try { duckButton.setPointerCapture?.(event.pointerId); } catch { /* Synthetic pointer events have no active pointer to capture. */ }
    draw();
  });
  ctx.listen(document, "pointerup", stopDuck); ctx.listen(document, "pointercancel", stopDuck); ctx.listen(duckButton, "lostpointercapture", stopDuck);
  ctx.listen(document, "keydown", (event) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName || "") || event.target?.isContentEditable) return;
    if(ending)return;
    if (["Space", "ArrowUp", "KeyW"].includes(event.code)) { event.preventDefault(); if (!heldJumpKeys.has(event.code)) { heldJumpKeys.add(event.code); jump(); } }
    if (event.code === "ArrowDown") { event.preventDefault(); keyboardDuck = true; player.duck = true; draw(); }
  });
  ctx.listen(document, "keyup", (event) => { heldJumpKeys.delete(event.code); if (event.code === "ArrowDown") { keyboardDuck = false; player.duck = pointerDuck; draw(); } });
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
    const image=sceneArt[obstacle.stageIndex ? `jump-stage-${obstacle.stageIndex+1}-${suffix}` : JUMP_OBSTACLE_ART[obstacle.kind]||JUMP_OBSTACLE_ART.basic];
    if(sceneImageReady(image))pen.drawImage(image,obstacle.x,obstacle.kind==='slide'?0:obstacle.y,obstacle.w,obstacle.kind==='slide'?obstacle.h:obstacle.h);
    else if(obstacle.kind==='slide')drawSlideObstacle(obstacle);else drawGroundObstacle(obstacle);
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
    pen.clearRect(0, 0, viewWidth, CANVAS_HEIGHT); drawWoodland(viewWidth, stage);
    const stageBackground=stage.id==='easy'?sceneArt['jump-forest']:sceneArt[`jump-stage-${jumpStageIndex(jumpDistanceMeters(distancePixels))+1}`];
    if(sceneImageReady(stageBackground)) drawSceneCover(pen,stageBackground,0,0,viewWidth,CANVAS_HEIGHT,.5,.46);
    const groundImage=stage.id==='easy'?sceneArt['jump-ground']:sceneArt[`jump-stage-${jumpStageIndex(jumpDistanceMeters(distancePixels))+1}-ground`];
    drawSceneTileX(pen,groundImage,JUMP_FLOOR,CANVAS_HEIGHT-JUMP_FLOOR,scroll,viewWidth);
    for (const obstacle of obstacles) { pen.globalAlpha = obstacle.hit ? .3 : 1; drawObstacle(obstacle); }
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
    pen.textAlign = "right"; pen.fillStyle = "#bc6f6c"; pen.font = "26px sans-serif"; pen.fillText(Array.from({length: version==='v16'?3:2},(_,i)=>i<lives?'♥':'♡').join(' '), viewWidth - 26, 47);
    if (version === 'v16') { rounded(pen,14,69,132,32,4,'#fff8e8dd'); pen.fillStyle='#284e3d'; pen.textAlign='left'; pen.font='700 17px Galmuri11, sans-serif'; pen.fillText(stage.label,25,92); }
    if (elapsed < 2300) { const hintWidth=Math.min(570,viewWidth-28);rounded(pen,(viewWidth-hintWidth)/2,136,hintWidth,43,10,'#fff9dddc');pen.textAlign = "center"; pen.fillStyle = "#345445"; pen.font = "700 22px Galmuri11, sans-serif"; pen.fillText("짧게 점프 · 높으면 두 번 · 천장은 숙이기", viewWidth / 2, 166); }
  }
  function finishRun() {
    const distance = jumpDistanceMeters(distancePixels); draw();
    ctx.finish({ value: distance, display: distance.toFixed(1), unit: "m", higherBetter: true, mode: `jump-distance-${version}`, details: { distance, avoided, survivedSeconds: Number((elapsed / 1000).toFixed(1)) } });
  }

  beginPattern(); draw(); ctx.setStatus(version === 'v16' ? '' : "0.0 m · 기회 2번");
  return {
    tick(ms) {
      if(ending){stepJumpPlayer(player,ms/1000);if(player.y>=JUMP_FLOOR-.01)ending.groundedMs+=ms;draw();ctx.setStatus("조금 쉬었다가, 다시 뛰어요.");if(ending.groundedMs>=650)finishRun();return;}
      const seconds = ms / 1000, speed = version==='v11'?jumpWorldSpeedV11(elapsed):jumpWorldSpeedV13(elapsed), worldDelta = jumpWorldDelta(speed, ms);
      elapsed += ms; distancePixels += worldDelta; scroll += worldDelta; invincibleMs = Math.max(0, invincibleMs - ms); nextPatternDistance -= worldDelta;
      if(version==='v16') warmStage(jumpStageIndex(jumpDistanceMeters(distancePixels))+1);
      const wasAirborne = player.y < JUMP_FLOOR - .01;
      stepJumpPlayer(player, seconds); player.duck = pointerDuck || keyboardDuck;
      if (jumpBufferMs > 0) {
        jumpBufferMs = Math.max(0, jumpBufferMs - ms);
        if (wasAirborne && player.y >= JUMP_FLOOR - .01) { tryJump(player); jumpBufferMs = 0; }
      }
      for (let index = pendingEvents.length - 1; index >= 0; index -= 1) {
        const pending = pendingEvents[index]; pending.remainingDistance -= worldDelta;
        if (pending.remainingDistance <= 0) { addObstacle(pending.pattern, pending.event, pending.eventIndex); pendingEvents.splice(index, 1); }
      }
      const distanceNow = jumpDistanceMeters(distancePixels);
      const heartDue=version==='v16'&&distanceNow>=nextHeartAt;
      const pickupLaneClear=canSpawnJumpHeart(obstacles,pendingEvents.length,player);
      if (heartDue && pickupLaneClear && hearts.length===0) {
        hearts.push({ x: canvas.width + 42, y: JUMP_FLOOR - 35, w: 28, h: 32 });
        nextHeartAt = nextHeartMeters(nextHeartAt, ctx.random);
        nextPatternDistance=Math.max(nextPatternDistance,canvas.width-PLAYER_DRAW_X+360);
      }
      if (nextPatternDistance <= 0 && !heartDue) beginPattern();
      for (const obstacle of obstacles) {
        obstacle.x -= worldDelta;
        if (!obstacle.hit && !obstacle.passed && !invincibleMs && jumpCollides(player, obstacle)) {
          obstacle.hit = true; const hit = jumpRunAfterHit(lives); lives = hit.lives; invincibleMs = 950;
          if (hit.finished) { ending={groundedMs:0};invincibleMs=0;clearHeld();draw();return; }
        }
        if (!obstacle.passed && obstacle.x + obstacle.w < jumpPlayerBox(player).x) { obstacle.passed = true; if (!obstacle.hit) avoided += 1; }
      }
      for (let index=hearts.length-1;index>=0;index-=1) {
        const heart=hearts[index]; heart.x-=worldDelta;
        const box=jumpPlayerBox(player);
        if (box.x < heart.x+heart.w && box.x+box.w > heart.x && box.y < heart.y+heart.h && box.y+box.h > heart.y) {
          lives=jumpHeal(lives); heartsCollected+=1; hearts.splice(index,1);
        } else if (heart.x+heart.w < -30) hearts.splice(index,1);
      }
      while (obstacles[0]?.x + obstacles[0]?.w < -30) obstacles.shift();
      const distance = jumpDistanceMeters(distancePixels);
      const target=version==='v16'?jumpV16TargetObstaclesPer10s(elapsed,distance):jumpTargetObstaclesPer10s(elapsed);
      const tuning=version==='v11'?'':` · 난도 ${jumpDifficultyLevel(elapsed)+1} · 목표 ${target.toFixed(version==='v16'?1:0)}개/10초`;
      ctx.setStatus(version === 'v16' ? '' : `${distance.toFixed(1)} m · ${avoided}개 회피 · 기회 ${lives}번${tuning}`); draw();
    },
    onPause(paused) { if (paused) clearHeld(); },
    getState: () => ({
      player: { ...player }, playerBox: jumpPlayerBox(player), obstacles: obstacles.map((obstacle) => ({ ...obstacle })),
      pendingEvents: pendingEvents.map(({ pattern, eventIndex, remainingDistance }) => ({ patternId: pattern.id, eventIndex, remainingDistance })),
      phase: ending ? "ending" : "playing", ending: ending ? {...ending} : null, elapsedMs: elapsed, worldDistance: distancePixels, distance: jumpDistanceMeters(distancePixels), avoided, score: jumpDistanceMeters(distancePixels), lives, maxLives:version==='v16'?3:2, invincibleMs,
      speed: version==='v11'?jumpWorldSpeedV11(elapsed):jumpWorldSpeedV13(elapsed),difficultyLevel:version==='v11'?null:jumpDifficultyLevel(elapsed),targetObstaclesPer10s:version==='v11'?null:version==='v16'?jumpV16TargetObstaclesPer10s(elapsed,jumpDistanceMeters(distancePixels)):jumpTargetObstaclesPer10s(elapsed),rulesVersion:version,currentPatternId: currentPattern?.id, currentPatternType: currentPattern?.type,
      patternsSeen, deckRemaining: deck.length, patternCount: jumpPatterns100.length, nextPatternDistance,
      stageIndex: version==='v16'?jumpStageIndex(jumpDistanceMeters(distancePixels)):null,stage:version==='v16'?jumpStage(jumpDistanceMeters(distancePixels)):null,
      hearts:hearts.map(heart=>({...heart})),heartsCollected,nextHeartAt,jumpBufferMs,
    }),
  };
}

export function createJumpV11(ctx){return createJump(ctx,{version:'v11'});}
