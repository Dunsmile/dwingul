import {assetUrl,readyImage} from './asset-delivery.js';
export const SCENE_ART_SOURCES = Object.freeze({
  ...Object.fromEntries(Array.from({length:5},(_,i)=>i+2).flatMap(n=>['','-ground','-short','-wide','-double','-slide'].map(s=>{const id=`jump-stage-${n}${s}`;return [id,`/assets/pixel/scenes/${id}.png`];}))),
  ...Object.fromEntries(['blue','white'].flatMap(c=>['normal','smile','cry'].map(f=>{const id=`sort-v16-${c}-${f}`;return [id,`/assets/pixel/scenes/${id}.png`];}))),
  'jump-obstacle-middle': '/assets/pixel/scenes/jump-obstacle-middle.png',
  'jump-forest': '/assets/pixel/scenes/jump-forest.png',
  'jump-ground': '/assets/pixel/scenes/jump-ground.png',
  'jump-obstacle-short': '/assets/pixel/scenes/jump-obstacle-short.png',
  'jump-obstacle-wide': '/assets/pixel/scenes/jump-obstacle-wide.png',
  'jump-obstacle-double': '/assets/pixel/scenes/jump-obstacle-double.png',
  'jump-obstacle-slide': '/assets/pixel/scenes/jump-obstacle-slide.png',
  'sort-lodge': '/assets/pixel/scenes/sort-lodge.png',
  'city-village': '/assets/pixel/scenes/city-village.png',
  'road-texture': '/assets/pixel/scenes/road-texture.png',
  'city-prop-tree': '/assets/pixel/scenes/city-prop-tree.png',
  'city-prop-cottage': '/assets/pixel/scenes/city-prop-cottage.png',
  'city-prop-lamp': '/assets/pixel/scenes/city-prop-lamp.png',
  'city-prop-shrub': '/assets/pixel/scenes/city-prop-shrub.png',
});

let imageCache = new Map();
let patternCache = new WeakMap();

export function clearSceneArtCache() {
  imageCache = new Map();
  patternCache = new WeakMap();
}

export function sceneImage(name) {
  const source = SCENE_ART_SOURCES[name];
  if (!source || typeof Image === 'undefined') return null;
  if (!imageCache.has(name)) {
    const image = readyImage(source)||new Image();
    image.decoding = 'async';
    image.src = assetUrl(source);
    imageCache.set(name, image);
  }
  return imageCache.get(name);
}

export function preloadSceneArt(names) {
  for (const name of names) sceneImage(name);
}

export function sceneImageReady(image) {
  return Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
}

export function drawSceneCover(context, image, x, y, width, height, focusX = .5, focusY = .5) {
  if (!sceneImageReady(image) || width <= 0 || height <= 0) return false;
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = Math.max(0, Math.min(image.naturalWidth - sourceWidth, (image.naturalWidth - sourceWidth) * focusX));
  const sourceY = Math.max(0, Math.min(image.naturalHeight - sourceHeight, (image.naturalHeight - sourceHeight) * focusY));
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  return true;
}

export function drawSceneTileX(context, image, y, height, offset, viewWidth) {
  if (!sceneImageReady(image) || height <= 0 || viewWidth <= 0) return false;
  const tileWidth = image.naturalWidth * height / image.naturalHeight;
  const start = -((offset % tileWidth) + tileWidth) % tileWidth;
  for (let x = start - tileWidth; x < viewWidth; x += tileWidth) context.drawImage(image, x, y, tileWidth, height);
  return true;
}

export function scenePattern(context, image) {
  if (!sceneImageReady(image)) return null;
  let byImage = patternCache.get(context);
  if (!byImage) { byImage = new WeakMap(); patternCache.set(context, byImage); }
  if (!byImage.has(image)) byImage.set(image, context.createPattern(image, 'repeat'));
  return byImage.get(image);
}
