const PLAYER_HALF_WIDTH = 29;
const PLAYER_TOP = 588;
const PLAYER_BOTTOM = 660;
const PLAYER_CENTER_Y = 626;
const OBSTACLE_HALF_WIDTH = 30;
const OBSTACLE_HALF_HEIGHT = 33;
const COIN_RADIUS = 21;

function laneCenter(lane) {
  return 205 + lane * 155;
}

function validPosition(playerX, item) {
  return Number.isFinite(playerX) && Number.isFinite(item?.lane) && Number.isFinite(item?.y);
}

export function hasPassedPlayer(item) {
  return Number.isFinite(item?.y) && item.y > PLAYER_CENTER_Y;
}

export function racingCollision(playerX, item) {
  if (!validPosition(playerX, item) || item.passed) return false;

  const obstacleX = laneCenter(item.lane);
  const horizontalOverlap = playerX - PLAYER_HALF_WIDTH < obstacleX + OBSTACLE_HALF_WIDTH
    && playerX + PLAYER_HALF_WIDTH > obstacleX - OBSTACLE_HALF_WIDTH;
  const verticalOverlap = PLAYER_TOP < item.y + OBSTACLE_HALF_HEIGHT
    && PLAYER_BOTTOM > item.y - OBSTACLE_HALF_HEIGHT;

  return horizontalOverlap && verticalOverlap;
}

export function racingCoinContact(playerX, item) {
  if (!validPosition(playerX, item)) return false;

  const coinX = laneCenter(item.lane);
  const nearestX = Math.max(playerX - PLAYER_HALF_WIDTH, Math.min(coinX, playerX + PLAYER_HALF_WIDTH));
  const nearestY = Math.max(PLAYER_TOP, Math.min(item.y, PLAYER_BOTTOM));
  const deltaX = coinX - nearestX;
  const deltaY = item.y - nearestY;

  return deltaX * deltaX + deltaY * deltaY <= COIN_RADIUS * COIN_RADIUS;
}
