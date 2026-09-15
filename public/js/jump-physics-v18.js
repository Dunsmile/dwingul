import {JUMP_V18_RULES} from './jump-combos-v18.js';
export const JUMP_FLOOR = 390;
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

export function stepJumpPlayer(player, seconds, fastFall = false) {
  if(fastFall&&player.y<JUMP_FLOOR-.01)player.vy=Math.max(player.vy,JUMP_V18_RULES.fastFallMinVy);
  player.vy += (fastFall ? JUMP_V18_RULES.fastFallGravity : player.jumps === 2 ? 1250 : 1500) * seconds;
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
  return Math.min(JUMP_V18_RULES.maxLives, Math.max(0, lives) + Math.max(0, amount));
}

