export const CITY_TRAFFIC_VIEWS = Object.freeze(['left-edge', 'left', 'front', 'right', 'right-edge']);
export const CITY_TRAFFIC_TYPES = Object.freeze(['car', 'van', 'truck', 'bus']);
export const CITY_PLAYER_CARS = Object.freeze(['basic', 'sport', 'touring', 'compact', 'rally', 'pickup', 'van', 'roadster']);

const trafficTypes = new Set(CITY_TRAFFIC_TYPES);
const trafficViews = new Set(CITY_TRAFFIC_VIEWS);
const playerCars = new Set(CITY_PLAYER_CARS);
const imageCache = new Map();

export function cityTrafficView(projection) {
  const scale = Number(projection?.scale) || 0;
  if (scale <= 0) return 'front';
  const lateral = Math.max(-1, Math.min(1, (projection.x - 500) / (328 * scale)));
  // Below scale .25, silhouettes are too small for a useful yaw cue. The cue
  // then grows continuously until scale 1 so vehicles turn toward the camera.
  const depthWeight = Math.max(0, Math.min(1, (scale - .25) / .75));
  const cameraAngle = lateral * depthWeight;
  if (cameraAngle <= -.7) return 'left-edge';
  if (cameraAngle < -.2) return 'left';
  if (cameraAngle >= .7) return 'right-edge';
  if (cameraAngle > .2) return 'right';
  return 'front';
}

export function cityTrafficArtSource(type, view) {
  return trafficTypes.has(type) && trafficViews.has(view) ? `/assets/pixel/scenes/traffic-${type}-${view}.png` : null;
}

export function cityPlayerArtSource(car) {
  return playerCars.has(car) ? `/assets/pixel/scenes/player-${car}-rear.png` : null;
}

export function cityVehicleImage(source) {
  if (!source || typeof Image === 'undefined') return null;
  if (!imageCache.has(source)) {
    const image = new Image();
    image.decoding = 'async';
    image.src = source;
    imageCache.set(source, image);
  }
  return imageCache.get(source);
}

export function cityVehicleImageReady(image) {
  return Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
}

export function preloadCityVehicleArt() {
  for (const type of CITY_TRAFFIC_TYPES) for (const view of CITY_TRAFFIC_VIEWS) cityVehicleImage(cityTrafficArtSource(type, view));
  for (const car of CITY_PLAYER_CARS) cityVehicleImage(cityPlayerArtSource(car));
}

export function cityVehicleDrawBox(box, image) {
  const ratio = image?.naturalWidth > 0 && image?.naturalHeight > 0 ? image.naturalHeight / image.naturalWidth : box.height / box.width;
  const height = box.width * ratio;
  return { x: box.x, y: box.floorY - height, width: box.width, height };
}
