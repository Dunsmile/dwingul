import { jumpPatterns100, shuffledJumpPatterns } from "./jump-patterns.js";

export const JUMP_FLOOR = 390;
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 450;
const PLAYER_DRAW_X = 108;
const METERS_PER_PIXEL = 1 / 20;

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

function rounded(pen, x, y, width, height, radius, color) {
  pen.fillStyle = color; pen.beginPath();
  if (pen.roundRect) pen.roundRect(x, y, width, height, radius); else pen.rect(x, y, width, height);
  pen.fill();
}

export function createJump(ctx) {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH; canvas.height = CANVAS_HEIGHT; canvas.className = "dg-game__canvas jump--v4";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "장애물을 뛰거나 숙여 피하며 거리를 늘리는 멀리 뛰기 게임");
  const pen = canvas.getContext("2d");
  const controls = document.createElement("div"); controls.className = "dg-game__split-controls";
  const duckButton = document.createElement("button"), jumpButton = document.createElement("button");
  duckButton.textContent = "↓ 꾹 눌러 숙이기"; jumpButton.textContent = "↑ 점프 · 두 번 가능";
  for (const button of [duckButton, jumpButton]) { button.type = "button"; button.className = "dg-game__control"; }
  controls.append(duckButton, jumpButton);
  const hint = document.createElement("p"); hint.className = "dg-game__jump-hint";
  hint.textContent = "높은 벽은 점프를 두 번 눌러요. 두 번째 점프는 더 높고 여유롭게 떠요.";
  ctx.stage.append(canvas, controls, hint);

  const player = { y: JUMP_FLOOR, vy: 0, jumps: 0, duck: false };
  const obstacles = [], pendingEvents = [];
  let deck = [], currentPattern = null, previousPatternId = null, patternsSeen = 0, nextPatternMs = 0;
  let elapsed = 0, distancePixels = 0, avoided = 0, lives = 2, invincibleMs = 0, nextObstacleId = 1, scroll = 0;
  let pointerDuck = false, keyboardDuck = false, ending = null;

  function refillDeck() {
    deck = shuffledJumpPatterns(ctx.random);
    if (previousPatternId && deck[0]?.id === previousPatternId) deck.push(deck.shift());
  }
  function takePattern() {
    if (!deck.length) refillDeck();
    const pattern = deck.shift(); previousPatternId = pattern.id; return pattern;
  }
  function addObstacle(pattern, event, eventIndex) {
    obstacles.push({ ...event, id: nextObstacleId++, patternId: pattern.id, eventIndex, x: CANVAS_WIDTH + 28, hit: false, passed: false });
  }
  function beginPattern() {
    currentPattern = takePattern(); patternsSeen += 1;
    currentPattern.events.forEach((event, eventIndex) => {
      if (event.atMs === 0) addObstacle(currentPattern, event, eventIndex);
      else pendingEvents.push({ pattern: currentPattern, event, eventIndex, remainingMs: event.atMs });
    });
    nextPatternMs = Math.max(...currentPattern.events.map(({ atMs }) => atMs)) + currentPattern.gapAfterMs;
  }

  const jump = () => { if (!ctx.isFinished() && !ending) { tryJump(player); draw(); } };
  const stopDuck = () => { pointerDuck = false; player.duck = keyboardDuck; };
  const clearHeld = () => { pointerDuck = false; keyboardDuck = false; player.duck = false; };
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
    if (["Space", "ArrowUp"].includes(event.code)) { event.preventDefault(); if (!event.repeat) jump(); }
    if (event.code === "ArrowDown") { event.preventDefault(); keyboardDuck = true; player.duck = true; draw(); }
  });
  ctx.listen(document, "keyup", (event) => { if (event.code === "ArrowDown") { keyboardDuck = false; player.duck = pointerDuck; draw(); } });
  ctx.listen(window, "blur", clearHeld);

  function drawGroundObstacle(obstacle) {
    const color = obstacle.kind === "double" ? "#996854" : obstacle.kind === "wide" ? "#a96f54" : "#b98068";
    rounded(pen, obstacle.x, obstacle.y, obstacle.w, obstacle.h, 12, color);
    if (obstacle.kind === "wide") {
      pen.strokeStyle = "#784d3b"; pen.lineWidth = 4; pen.beginPath();
      pen.moveTo(obstacle.x + obstacle.w / 2, obstacle.y + 7); pen.lineTo(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h - 7); pen.stroke();
    }
    if (obstacle.kind === "double") {
      pen.fillStyle = "#c89a79";
      for (let y = obstacle.y + 12; y < JUMP_FLOOR - 8; y += 30) pen.fillRect(obstacle.x + 8, y, obstacle.w - 16, 5);
      pen.fillStyle = "#fff8e8"; pen.textAlign = "center"; pen.font = "800 18px sans-serif";
      pen.fillText("2단!", obstacle.x + obstacle.w / 2, obstacle.y + 27);
    }
  }
  function drawSlideObstacle(obstacle) {
    pen.fillStyle = "#71828b"; pen.fillRect(obstacle.x, 0, obstacle.w, obstacle.h - 18);
    rounded(pen, obstacle.x - 7, obstacle.h - 32, obstacle.w + 14, 32, 12, "#657680");
    pen.fillStyle = "#eef4ed"; pen.textAlign = "center"; pen.font = "800 17px sans-serif";
    pen.fillText("↓ 숙이기", obstacle.x + obstacle.w / 2, obstacle.h - 10);
  }
  function draw() {
    pen.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); pen.fillStyle = "#e9f0e8"; pen.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    pen.fillStyle = "#f6df94"; pen.beginPath(); pen.arc(CANVAS_WIDTH - 116, 83, 40, 0, Math.PI * 2); pen.fill();
    pen.fillStyle = "#d2e1d0";
    for (let index = 0; index < 8; index += 1) { const x = index * 180 - (scroll * .18 % 180); pen.beginPath(); pen.ellipse(x, 356, 135, 58 + index % 2 * 17, 0, 0, Math.PI * 2); pen.fill(); }
    pen.fillStyle = "#afc7a9"; pen.fillRect(0, JUMP_FLOOR, CANVAS_WIDTH, 60); pen.fillStyle = "#8fab89";
    for (let x = -(scroll % 90); x < CANVAS_WIDTH + 30; x += 90) pen.fillRect(x, 419, 38, 4);
    for (const obstacle of obstacles) { pen.globalAlpha = obstacle.hit ? .3 : 1; if (obstacle.kind === "slide") drawSlideObstacle(obstacle); else drawGroundObstacle(obstacle); }
    pen.globalAlpha = 1;
    const duck = player.duck && player.y >= JUMP_FLOOR - .01, height = duck ? 34 : 72;
    if (!invincibleMs || Math.floor(invincibleMs / 95) % 2 === 0) {
      rounded(pen, PLAYER_DRAW_X, player.y - height, 64, height, duck ? 17 : 26, "#f7f4e8"); pen.fillStyle = "#284e3d";
      for (const x of [129, 151]) { const y=player.y-height+(duck?12:27);pen.beginPath(); if(ending&&player.y>=JUMP_FLOOR-.01){pen.strokeStyle="#284e3d";pen.lineWidth=3;pen.moveTo(x-5,y-5);pen.lineTo(x+5,y+5);pen.moveTo(x+5,y-5);pen.lineTo(x-5,y+5);pen.stroke();}else{pen.ellipse(x,y,3,4,0,0,Math.PI*2);pen.fill();} }
      pen.strokeStyle = "#284e3d"; pen.lineWidth = 2; pen.beginPath(); pen.arc(140, player.y - height + (duck ? 19 : 39), 8, 0, Math.PI); pen.stroke();
    }
    pen.fillStyle = "#284e3d"; pen.textAlign = "left"; pen.font = "800 32px sans-serif"; pen.fillText(`${jumpDistanceMeters(distancePixels).toFixed(1)} m`, 26, 48);
    pen.textAlign = "right"; pen.fillStyle = "#bc6f6c"; pen.font = "28px sans-serif"; pen.fillText(lives === 2 ? "♥ ♥" : lives === 1 ? "♥ ♡" : "♡ ♡", CANVAS_WIDTH - 28, 48);
    if (elapsed < 2300) { pen.textAlign = "center"; pen.fillStyle = "#4c6859"; pen.font = "700 22px sans-serif"; pen.fillText("짧게 점프 · 높으면 두 번 · 천장은 숙이기", CANVAS_WIDTH / 2, 168); }
  }
  function finishRun() {
    const distance = jumpDistanceMeters(distancePixels); draw();
    ctx.finish({ value: distance, display: distance.toFixed(1), unit: "m", higherBetter: true, mode: "jump-distance-v6", details: { distance, avoided, survivedSeconds: Number((elapsed / 1000).toFixed(1)) } });
  }

  beginPattern(); draw(); ctx.setStatus("0.0 m · 기회 2번");
  return {
    tick(ms) {
      if(ending){stepJumpPlayer(player,ms/1000);if(player.y>=JUMP_FLOOR-.01)ending.groundedMs+=ms;draw();ctx.setStatus("조금 쉬었다가, 다시 뛰어요.");if(ending.groundedMs>=650)finishRun();return;}
      const seconds = ms / 1000, speed = Math.min(420, 220 + elapsed * .002);
      elapsed += ms; distancePixels += speed * seconds; scroll += speed * seconds; invincibleMs = Math.max(0, invincibleMs - ms); nextPatternMs -= ms;
      stepJumpPlayer(player, seconds); player.duck = pointerDuck || keyboardDuck;
      for (let index = pendingEvents.length - 1; index >= 0; index -= 1) {
        const pending = pendingEvents[index]; pending.remainingMs -= ms;
        if (pending.remainingMs <= 0) { addObstacle(pending.pattern, pending.event, pending.eventIndex); pendingEvents.splice(index, 1); }
      }
      if (nextPatternMs <= 0) beginPattern();
      for (const obstacle of obstacles) {
        obstacle.x -= speed * obstacle.speedScale * seconds;
        if (!obstacle.hit && !obstacle.passed && !invincibleMs && jumpCollides(player, obstacle)) {
          obstacle.hit = true; const hit = jumpRunAfterHit(lives); lives = hit.lives; invincibleMs = 950;
          if (hit.finished) { ending={groundedMs:0};invincibleMs=0;clearHeld();draw();return; }
        }
        if (!obstacle.passed && obstacle.x + obstacle.w < jumpPlayerBox(player).x) { obstacle.passed = true; if (!obstacle.hit) avoided += 1; }
      }
      while (obstacles[0]?.x + obstacles[0]?.w < -30) obstacles.shift();
      const distance = jumpDistanceMeters(distancePixels);
      ctx.setStatus(`${distance.toFixed(1)} m · ${avoided}개 회피 · 기회 ${lives}번`); draw();
    },
    onPause(paused) { if (paused) clearHeld(); },
    getState: () => ({
      player: { ...player }, playerBox: jumpPlayerBox(player), obstacles: obstacles.map((obstacle) => ({ ...obstacle })),
      pendingEvents: pendingEvents.map(({ pattern, eventIndex, remainingMs }) => ({ patternId: pattern.id, eventIndex, remainingMs })),
      phase: ending ? "ending" : "playing", ending: ending ? {...ending} : null, elapsedMs: elapsed, distance: jumpDistanceMeters(distancePixels), avoided, score: jumpDistanceMeters(distancePixels), lives, invincibleMs,
      speed: Math.min(420, 220 + elapsed * .002), currentPatternId: currentPattern?.id, currentPatternType: currentPattern?.type,
      patternsSeen, deckRemaining: deck.length, patternCount: jumpPatterns100.length, nextPatternMs,
    }),
  };
}
