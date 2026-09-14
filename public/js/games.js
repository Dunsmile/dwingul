import { createSortGame } from './sort-game.js';
import { seededRandom } from './game-random.js';
import { createTypingRpg } from './typing-rpg.js';
import { createJump as createJumpV17 } from './jump-game.js';
import { createJump as createJumpV16 } from './jump-game-v16.js';
import { createJump as createJumpV13 } from './legacy/jump-game-v13.js';
import { createJump as createJumpV11 } from './legacy/jump-game-v11.js';
import { createJump as createJumpV6 } from './legacy/jump-game-v6.js';
import { createJump as createJumpV5 } from './legacy/jump-game-v5.js';
import { createCityRacing } from './city-racing.js';
import { gameSettings } from './game-options.js';
const FRAME_MS = 1000 / 60;


function shuffle(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function colorGridSize(correctCount) {
  if (correctCount < 2) return 2;
  if (correctCount < 6) return 3;
  if (correctCount < 10) return 4;
  if (correctCount < 16) return 5;
  if (correctCount < 24) return 6;
  return 7;
}

const CURRENT_CREATORS = Object.freeze({
  sort: createSortGame,
  typing: createTypingRpg,
  racing: createCityRacing,
});

export function gameContextSettings(id, settings = {}) {
  const source = settings && typeof settings === 'object' ? settings : {};
  const normalized = { ...gameSettings(id, source), gear: source.gear || {} };
  if (typeof source.characterId === 'string') normalized.characterId = source.characterId;
  return normalized;
}

export function resolveGameCreator(id, settings = {}) {
  const normalized = gameSettings(id, settings);
  if (id === 'sequence') throw new RangeError('운영이 종료된 게임이에요.');
  if (id === 'jump') {
    if (normalized.version === 'v17') return createJumpV17;
    if (normalized.version === 'v16') return createJumpV16;
    if (normalized.version === 'v13') return createJumpV13;
    if (normalized.version === 'v11') return createJumpV11;
    if (normalized.version === 'v6') return createJumpV6;
    if (normalized.version === 'v5') return createJumpV5;
    throw new RangeError(`지원하지 않는 점프 규칙: ${normalized.version}`);
  }
  return CURRENT_CREATORS[id] || null;
}

export function mountGame(container, id, { seed = "dwingul", settings = {}, onCheckpoint = () => {}, onFinish = () => {} } = {}) {
  if (!container || typeof container.replaceChildren !== "function") {
    throw new TypeError("mountGame에는 DOM 컨테이너가 필요합니다.");
  }

  const random = seededRandom(`${id}:${seed}`);
  const root = element("section", `dg-game dg-game--${id}`);
  const toolbar = element("div", "dg-game__toolbar");
  const status = element("div", "dg-game__status");
  status.setAttribute("aria-live", "polite");
  const pauseButton = element("button", "dg-game__pause", "일시정지");
  pauseButton.type = "button";
  pauseButton.setAttribute("aria-pressed", "false");
  toolbar.append(status, pauseButton);
  const stage = element("div", "dg-game__stage");
  root.append(toolbar, stage);
  container.replaceChildren(root);

  let destroyed = false;
  let finished = false;
  let paused = false;
  let visibilityPaused = false;
  let modalPaused = false;
  let manualClock = false;
  let rafId = 0;
  let lastFrame = 0;
  let inputsSuspended = false;
  const disabledBeforePause = new Map();
  const removers = [];

  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    removers.push(() => target.removeEventListener(type, handler, options));
  };
  const gameListen = (target, type, handler, options) => {
    const guardedHandler = (event) => {
      const inputEvent = ["click", "pointerdown", "pointerup", "keydown", "submit"].includes(type);
      if (inputEvent && (paused || visibilityPaused || modalPaused || finished || destroyed)) {
        const shellShortcut = type === "keydown" && ["p", "f"].includes(event.key?.toLowerCase());
        const pauseControl = event.target === pauseButton;
        if (event.cancelable && !shellShortcut && !pauseControl) event.preventDefault();
        return;
      }
      handler(event);
    };
    listen(target, type, guardedHandler, options);
  };
  const setStatus = (text) => { status.textContent = text; };
  const finish = (result) => {
    if (finished || destroyed) return;
    finished = true;
    paused = false;
    pauseButton.disabled = true;
    onFinish({
      value: Number(result.value),
      display: String(result.display),
      unit: String(result.unit ?? ""),
      higherBetter: Boolean(result.higherBetter),
      mode: String(result.mode ?? id),
      details: result.details && typeof result.details === "object" ? result.details : {},
    });
  };

  const context = { root, stage, random, settings: gameContextSettings(id, settings), checkpoint: onCheckpoint, listen: gameListen, setStatus, finish, isFinished: () => finished };
  const inlineCreators = { timing: createTiming, color: createColor, reaction: createReaction, memory: createMemory, numbers: createNumbers };
  const creator = resolveGameCreator(id, context.settings) || inlineCreators[id];
  if (!creator) throw new RangeError(`지원하지 않는 게임: ${id}`);
  const game = creator(context);

  function setPaused(next, byVisibility = false) {
    if (finished || destroyed) return;
    if (byVisibility === 'modal') modalPaused = next;
    else if (byVisibility) visibilityPaused = next;
    else paused = next;
    const effective = paused || visibilityPaused || modalPaused;
    root.classList.toggle("is-paused", effective);
    pauseButton.textContent = effective ? "계속하기" : "일시정지";
    pauseButton.setAttribute("aria-pressed", String(effective));
    if (effective && !inputsSuspended) {
      inputsSuspended = true;
      stage.querySelectorAll("button, input, textarea, select").forEach((control) => {
        if(control===pauseButton)return;
        disabledBeforePause.set(control, control.disabled);
        control.disabled = true;
      });
    } else if (!effective && inputsSuspended) {
      inputsSuspended = false;
      disabledBeforePause.forEach((wasDisabled, control) => {
        if (control.isConnected) control.disabled = wasDisabled;
      });
      disabledBeforePause.clear();
    }
    lastFrame = 0;
    game.onPause?.(effective);
  }

  listen(pauseButton, "click", () => setPaused(!paused));
  listen(document, "visibilitychange", () => setPaused(document.hidden, true));
  const dialogObserver = new MutationObserver(() => setPaused(Boolean(document.querySelector("dialog[open]")), "modal"));
  document.querySelectorAll("dialog").forEach(dialog => dialogObserver.observe(dialog, {attributes:true, attributeFilter:["open"]}));
  removers.push(() => dialogObserver.disconnect());
  listen(document, "keydown", (event) => {
    if (modalPaused) return;
    if (event.key.toLowerCase() === "p" && !isTypingTarget(event.target)) {
      event.preventDefault();
      setPaused(!paused);
    }
    if (event.key.toLowerCase() === "f" && !isTypingTarget(event.target) && root.requestFullscreen) {
      event.preventDefault();
      if (document.fullscreenElement === root) document.exitFullscreen?.();
      else root.requestFullscreen().catch(() => {});
    }
  });

  function step(ms) {
    if (!paused && !visibilityPaused && !modalPaused && !finished && !destroyed) game.tick?.(ms);
  }

  function frame(now) {
    if (destroyed || manualClock) return;
    if (!lastFrame) lastFrame = now;
    const delta = Math.min(50, now - lastFrame);
    lastFrame = now;
    step(delta);
    rafId = requestAnimationFrame(frame);
  }
  if (typeof requestAnimationFrame === "function") rafId = requestAnimationFrame(frame);

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (rafId && typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafId);
      game.destroy?.();
      removers.splice(0).forEach((remove) => remove());
      if (typeof container.contains !== "function" || container.contains(root)) container.replaceChildren();
    },
    getState() {
      return {
        id, paused: paused || visibilityPaused || modalPaused, finished,
        canvas: { origin: { x: 0, y: 0, position: "top-left" }, xAxis: "right", yAxis: "down", width: stage.querySelector("canvas")?.width || 720, height: stage.querySelector("canvas")?.height || 720, unit: "px" },
        ...(game.getState?.() ?? {}),
      };
    },
    advanceTime(ms) {
      manualClock = true;
      if (rafId && typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafId);
      let remaining = Math.max(0, Number(ms) || 0);
      while (remaining > 0 && !finished && !destroyed) {
        const amount = Math.min(FRAME_MS, remaining);
        step(amount);
        remaining -= amount;
      }
      return this.getState();
    },
  };
}

function isTypingTarget(target) {
  return Boolean(target && typeof target === "object" && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName ?? "")));
}

function makeCanvas(stage, label) {
  const canvas = element("canvas", "dg-game__canvas");
  canvas.width = 720;
  canvas.height = 720;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", label);
  stage.append(canvas);
  let pen = null;
  try { pen = canvas.getContext?.("2d") ?? null; } catch { /* A DOM test double may not implement canvas. */ }
  if (!pen) pen = new Proxy({}, { get: (target, key) => target[key] ?? (() => {}), set: (target, key, value) => { target[key] = value; return true; } });
  return [canvas, pen];
}

function createTiming(ctx) {
  const target = 1 + Math.floor(ctx.random() * 10);
  const card = element("div", "dg-game__timing-card");
  card.innerHTML = `<p>목표 <b>${target.toFixed(2)}초</b></p><strong class="dg-game__timing-clock" aria-label="현재 시간">0.00</strong><span>숫자를 보고 목표 시간에 멈춰보세요</span>`;
  const clock = card.querySelector("strong");
  const button = element("button", "dg-game__primary", "시작");
  ctx.stage.append(card, button); ctx.setStatus("타이머를 보며 정확히 멈춰보세요");
  let phase = "ready", elapsed = 0;
  function press() {
    if (phase === "ready") { phase = "running"; elapsed = 0; button.textContent = "멈춤"; }
    else if (phase === "running") stop();
  }
  ctx.listen(button, "pointerdown", event => { event.preventDefault(); press(); });
  ctx.listen(button, "click", event => { if (event.detail === 0) press(); });
  ctx.listen(document, "keydown", event => { if (event.code === "Space" && !isTypingTarget(event.target) && event.target !== button && !event.repeat) { event.preventDefault(); press(); } });
  function stop() {
    if (phase !== "running") return;
    phase = "done";
    const seconds = Number(Math.min(15, elapsed / 1000).toFixed(2));
    clock.textContent = seconds.toFixed(2); button.disabled = true; ctx.setStatus("기록 완료");
    ctx.finish({ value: Math.abs(seconds - target), display: seconds.toFixed(2), unit: "초", higherBetter: false, mode: `visible-target-${target}-v2`, details: { target, stoppedSeconds: seconds, clockVisible: true } });
  }
  return {
    tick(ms) { if (phase === "running") { elapsed += ms; clock.textContent = Math.min(15, elapsed / 1000).toFixed(2); if (elapsed >= 15000) stop(); } },
    getState: () => ({ phase, target, elapsedMs: elapsed, clockVisible: true, displayedTime: clock.textContent }),
  };
}

function createColor(ctx) {
  const grid = element("div", "dg-game__color-grid"); ctx.stage.append(grid);
  let elapsed = 0; let penaltyMs = 0; let correct = 0; let targetIndex = 0; let baseHue = 0; let delta = 0; let wrongFlashMs = 0;
  function build() {
    const size = colorGridSize(correct); const count = size * size;
    targetIndex = Math.floor(ctx.random() * count); baseHue = Math.floor(ctx.random() * 360);
    delta = Math.max(4, 22 - correct * .65);
    grid.style.setProperty("--grid-size", size);
    grid.replaceChildren(...Array.from({ length: count }, (_, index) => {
      const button = element("button", "dg-game__color-cell"); button.type = "button";
      button.setAttribute("aria-label", `${index + 1}번 색상`);
      button.style.background = `hsl(${baseHue} 52% ${index === targetIndex ? 57 + delta / 2 : 57 - delta / 2}%)`;
      ctx.listen(button, "click", () => select(index)); return button;
    }));
  }
  function select(index) {
    if (ctx.isFinished()) return;
    if (index === targetIndex) { correct += 1; build(); }
    else { penaltyMs += 1000; elapsed += 1000; wrongFlashMs = 160; grid.classList.remove("is-wrong"); void grid.offsetWidth; grid.classList.add("is-wrong"); }
    updateStatus();
  }
  function updateStatus() { ctx.setStatus(`${Math.max(0, Math.ceil((30000 - elapsed) / 1000))}초 · ${correct}개 발견`); }
  build(); updateStatus();
  return {
    tick(ms) { elapsed += ms; wrongFlashMs = Math.max(0, wrongFlashMs - ms); if (!wrongFlashMs) grid.classList.remove("is-wrong"); updateStatus(); if (elapsed >= 30000) ctx.finish({ value: correct, display: `${correct}`, unit: "개", higherBetter: true, mode: "standard", details: { correct, penaltySeconds: penaltyMs / 1000 } }); },
    getState: () => ({ elapsedMs: elapsed, remainingMs: Math.max(0, 30000 - elapsed), correct, gridSize: colorGridSize(correct), targetIndex, colorDelta: delta, penaltyMs, wrongFlashMs }),
  };
}

function createReaction(ctx) {
  const pad = element("button", "dg-game__reaction", "눌러서 준비"); pad.type = "button";
  const dots = element("div", "dg-game__round-dots"); ctx.stage.append(pad, dots);
  let phase = "ready"; let waitMs = 0; let greenElapsed = 0; const results = [];
  function renderDots() { dots.textContent = Array.from({ length: 3 }, (_, i) => i < results.length ? "●" : "○").join(" "); }
  function arm() { phase = "waiting"; waitMs = 1500 + ctx.random() * 3000; greenElapsed = 0; pad.className = "dg-game__reaction is-waiting"; pad.textContent = "빨간불 · 기다리세요"; ctx.setStatus(`${results.length + 1}/3 번째`); }
  function press() {
    if (phase === "ready" || phase === "early") arm();
    else if (phase === "waiting") { phase = "early"; pad.className = "dg-game__reaction is-early"; pad.textContent = "너무 빨라요 · 다시 누르기"; ctx.setStatus("이번 시도는 기록하지 않았어요"); }
    else if (phase === "green") {
      results.push(Math.round(greenElapsed)); renderDots();
      if (results.length === 3) {
        phase = "done"; pad.disabled = true; pad.textContent = "완료!";
        const average = Math.round(results.reduce((a, b) => a + b, 0) / results.length); const best = Math.min(...results);
        ctx.finish({ value: average, display: `${average}`, unit: "ms", higherBetter: false, mode: "three-round", details: { averageMs: average, bestMs: best, rounds: [...results] } });
      } else { phase = "ready"; pad.className = "dg-game__reaction"; pad.textContent = "다음 라운드 준비"; }
    }
  }
  ctx.listen(pad, "pointerdown", (event) => { event.preventDefault(); press(); });
  ctx.listen(document, "keydown", (event) => { if (event.code === "Space" && !event.repeat && !isTypingTarget(event.target)) { event.preventDefault(); press(); } });
  renderDots(); ctx.setStatus("초록불이 켜지는 순간 누르세요");
  return {
    tick(ms) { if (phase === "waiting") { waitMs -= ms; if (waitMs <= 0) { phase = "green"; greenElapsed = 0; pad.className = "dg-game__reaction is-green"; pad.textContent = "지금!"; } } else if (phase === "green") greenElapsed += ms; },
    getState: () => ({ phase, waitMs: Math.max(0, waitMs), reactionMs: greenElapsed, totalRounds: 3, completedRounds: results.length, results: [...results] }),
  };
}

function roundRect(pen, x, y, width, height, radius) {
  if (pen.roundRect) { pen.beginPath(); pen.roundRect(x, y, width, height, radius); return; }
  pen.beginPath(); pen.rect(x, y, width, height);
}

export function memoryRoundConfig(round) {
  return { size: round < 4 ? 5 : round < 8 ? 6 : 7, targetCount: Math.min(16, round + 2), showMs: Math.max(750, 1200 - (round - 1) * 50) };
}

function createMemory(ctx) {
  const grid = element("div", "dg-game__memory-grid"); ctx.stage.append(grid);
  let round = 1, errors = 0, phase = "show", phaseMs = 1200, targets = [], wrongCell = -1, wrongFlashMs = 0, size = 0;
  const chosen = new Set(); let buttons = [];
  function buildGrid(nextSize) {
    size = nextSize; grid.style.setProperty("--memory-size", size);
    buttons = Array.from({ length: size * size }, (_, index) => {
      const button = element("button", "dg-game__memory-cell"); button.type = "button"; button.setAttribute("aria-label", `${index + 1}번 칸`);
      ctx.listen(button, "click", () => select(index)); return button;
    }); grid.replaceChildren(...buttons);
  }
  function newRound() {
    const config = memoryRoundConfig(round); if (size !== config.size) buildGrid(config.size);
    phase = "show"; phaseMs = config.showMs; chosen.clear(); wrongCell = -1; wrongFlashMs = 0;
    targets = shuffle(Array.from({ length: size * size }, (_, i) => i), ctx.random).slice(0, config.targetCount); render();
  }
  function render() {
    buttons.forEach((button, index) => { button.classList.toggle("is-lit", phase === "show" && targets.includes(index)); button.classList.toggle("is-chosen", chosen.has(index)); button.classList.toggle("is-wrong", wrongFlashMs > 0 && wrongCell === index); button.disabled = phase !== "input"; });
    ctx.setStatus(phase === "show" ? `${round}단계 · ${size * size}칸 중 ${targets.length}칸 기억` : phase === "between" ? `${round - 1}단계 성공!` : `${round}단계 · ${targets.length - chosen.size}칸 남음 · 실수 ${errors}/3`);
  }
  function select(index) {
    if (phase !== "input" || chosen.has(index)) return;
    if (targets.includes(index)) {
      chosen.add(index);
      if (chosen.size === targets.length) { round += 1; phase = "between"; phaseMs = 650; }
    } else {
      errors += 1; wrongCell = index; wrongFlashMs = 240;
      if (errors >= 3) ctx.finish({ value: round - 1, display: `${round - 1}`, unit: "단계", higherBetter: true, mode: "growing-grid-v2", details: { completedRounds: round - 1, errors, gridSize: size } });
    }
    render();
  }
  newRound();
  return {
    tick(ms) { if (wrongFlashMs > 0) { wrongFlashMs = Math.max(0, wrongFlashMs - ms); render(); } if (phase === "show" || phase === "between") { phaseMs -= ms; if (phaseMs <= 0) { if (phase === "show") { phase = "input"; render(); } else newRound(); } } },
    getState: () => ({ phase, phaseMs: Math.max(0, phaseMs), gridSize: size, round, completedRounds: round - 1, errors, targets: [...targets], chosen: [...chosen], wrongCell, wrongFlashMs }),
  };
}

function createNumbers(ctx) {
  const grid = element("div", "dg-game__numbers-grid"); ctx.stage.append(grid);
  const order = shuffle(Array.from({ length: 25 }, (_, i) => i + 1), ctx.random);
  let next = 1; let elapsed = 0; let penaltyMs = 0; let wrong = 0;
  const buttons = order.map((value) => { const button = element("button", "dg-game__number-cell", `${value}`); button.type = "button"; ctx.listen(button, "click", () => select(value, button)); return button; }); grid.append(...buttons);
  function select(value, button) {
    if (ctx.isFinished()) return;
    if (value === next) { button.disabled = true; button.classList.add("is-done"); next += 1; if (next === 26) { const total = elapsed + penaltyMs; ctx.finish({ value: total, display: (total / 1000).toFixed(2), unit: "초", higherBetter: false, mode: "1-25", details: { elapsedSeconds: Number((elapsed / 1000).toFixed(2)), penaltySeconds: penaltyMs / 1000, wrongTaps: wrong } }); } }
    else { wrong += 1; penaltyMs += 1000; button.classList.remove("is-wrong"); void button.offsetWidth; button.classList.add("is-wrong"); }
    updateStatus();
  }
  function updateStatus() { ctx.setStatus(next <= 25 ? `다음 숫자 ${next} · ${(elapsed / 1000).toFixed(1)}초${penaltyMs ? ` (+${penaltyMs / 1000})` : ""}` : "완료"); }
  updateStatus();
  return { tick(ms) { elapsed += ms; updateStatus(); }, getState: () => ({ next, elapsedMs: elapsed, penaltyMs, wrongTaps: wrong, order: [...order] }) };
}
