import { createRhythmEndlessEngine } from "./rhythm-engine-v9.js";

const PHASE_COPY = Object.freeze({
  idle: ["리듬 출발 준비", "시작을 누르면 네 박자를 세고 숲속 친구가 먼저 연주해요."],
  countin: ["하나, 둘, 셋, 넷!", "박자를 몸에 익혀요."],
  listen: ["먼저 들어요", "숲속 친구의 리듬을 기억해요."],
  prepare: ["내 차례 준비", "셋, 둘, 하나 뒤에 리듬을 이어 쳐요."],
  respond: ["이제 따라쳐요", "같은 순간에 큰 버튼을 눌러요."],
  between: ["좋아요, 다음 리듬!", "잠깐 숨을 고르고 이어가요."],
  gameover: ["리듬 에너지를 다 썼어요", "움직임이 멈춘 뒤 결과를 보여 드릴게요."],
  finished: ["무한 리듬 끝!", "결과에서 오늘의 박자 감각을 확인해요."],
});

const JUDGMENT_COPY = Object.freeze({
  perfect: "완벽! 박자 한가운데예요",
  good: "좋아요!",
  miss: "놓쳤어요. 다음 박자를 들어요",
  extra: "한 번만 톡! 다음 음을 기다려요",
});

function interactiveTarget(target) {
  return Boolean(target && (target.isContentEditable || /^(BUTTON|INPUT|TEXTAREA|SELECT|A)$/.test(target.tagName || "")));
}

function timingCopy(judgment) {
  if (!judgment) return "귀로 듣고, 손끝으로 이어 주세요.";
  const base = JUDGMENT_COPY[judgment.grade] || "다음 박자를 기다려요";
  if (!["perfect", "good"].includes(judgment.grade)) return base;
  if (judgment.timing === "fast") return `${base} · 조금 빨라요`;
  if (judgment.timing === "late") return `${base} · 조금 늦어요`;
  return `${base} · 정확해요`;
}

function markerMarkup(notes, phase, response = false) {
  return notes.map((note, index) => {
    const position = response ? (note.beat + 1) / 5 : note.beat / 4;
    const left = 4 + position * 92;
    const state = response ? (phase === "respond" ? note.status : "waiting") : phase === "listen" && note.status === "played" ? "played" : "waiting";
    const label = `${note.beat + 1}박 ${state === "hit" ? "성공" : state === "miss" ? "놓침" : "음표"}`;
    return `<i class="rhythm-game__note is-${state}" style="left:${left}%" aria-label="${label}" data-note="${index}"></i>`;
  }).join("");
}

export function createRhythm(ctx) {
  const engine = createRhythmEndlessEngine({ random: ctx.random });
  ctx.root.classList.add("dg-game--rhythm");

  const game = document.createElement("section");
  game.className = "rhythm-game";
  game.innerHTML = `
    <div class="rhythm-game__hud" aria-label="현재 기록">
      <span><small>구간</small><b data-ui="round">1 · ∞</b></span>
      <span><small>BPM</small><b data-ui="bpm">96</b></span>
      <span><small>콤보</small><b data-ui="combo">0</b></span>
      <span><small>점수</small><b data-ui="score">0</b></span>
    </div>
    <div class="rhythm-game__energy">
      <div><b>리듬 에너지</b><output data-ui="energy-text">100</output></div>
      <div class="rhythm-game__energy-rail" role="meter" aria-label="리듬 에너지" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i data-ui="energy"></i></div>
    </div>
    <div class="rhythm-game__relay">
      <header class="rhythm-game__phase">
        <span data-ui="phase-kicker">ENDLESS RHYTHM</span>
        <strong data-ui="phase-title">리듬 출발 준비</strong>
        <small data-ui="phase-help">시작을 누르면 네 박자를 세고 숲속 친구가 먼저 연주해요.</small>
      </header>
      <div class="rhythm-game__count" aria-live="polite" data-ui="count">♪</div>
      <div class="rhythm-game__track rhythm-game__track--listen" data-ui="listen-track">
        <div class="rhythm-game__character rhythm-game__character--guide" aria-hidden="true"><i></i></div>
        <div class="rhythm-game__track-body">
          <b>먼저 듣기</b><span>숲속 친구</span>
          <div class="rhythm-game__rail" role="img" aria-label="먼저 들을 네 박자 리듬"><i class="rhythm-game__needle" data-ui="listen-needle"></i><div data-ui="listen-notes"></div></div>
        </div>
      </div>
      <div class="rhythm-game__track rhythm-game__track--respond" data-ui="respond-track">
        <div class="rhythm-game__character rhythm-game__character--player" aria-hidden="true"><i></i></div>
        <div class="rhythm-game__track-body">
          <b>이어 치기</b><span>나</span>
          <div class="rhythm-game__rail" role="img" aria-label="내가 따라 칠 네 박자 리듬"><i class="rhythm-game__needle" data-ui="respond-needle"></i><div data-ui="respond-notes"></div></div>
        </div>
      </div>
      <p class="rhythm-game__judgment" aria-live="polite" data-ui="judgment">귀로 듣고, 손끝으로 이어 주세요.</p>
      <div class="rhythm-game__actions">
        <button class="rhythm-game__tap" type="button" data-ui="tap" disabled><span>탁!</span><small>Space · Enter</small></button>
        <button class="rhythm-game__mute" type="button" data-ui="mute" aria-pressed="false" aria-label="소리 끄기">🔊 소리 켬</button>
      </div>
      <div class="rhythm-game__start-panel" data-ui="start-panel">
        <div class="rhythm-game__start-card">
          <div class="rhythm-game__start-icon" aria-hidden="true">♩ ♪</div>
          <strong>100가지 리듬을<br>끝없이 이어 쳐요</strong>
          <p>숲속 친구의 리듬을 듣고, 내 차례의 3·2·1 뒤에 큰 버튼을 눌러 주세요.</p>
          <button type="button" class="rhythm-game__start" data-ui="start">무한 리듬 시작</button>
        </div>
      </div>
    </div>`;
  ctx.stage.append(game);

  const ui = Object.fromEntries([...game.querySelectorAll("[data-ui]")].map((node) => [node.dataset.ui.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase()), node]));
  let audioContext = null;
  let master = null;
  let destroyed = false;
  let paused = false;
  let finishedSent = false;
  let renderedRound = 0;
  let renderedPhase = "";
  let lastPulseMs=-1000,guideHitMs=-1000,playerHitMs=-1000;
  const sounding = new Set();

  function ensureAudio() {
    if (audioContext || destroyed) return;
    const AudioCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioCtor) return;
    try {
      audioContext = new AudioCtor();
      master = audioContext.createGain();
      master.gain.value = engine.getState().muted ? 0 : .19;
      master.connect(audioContext.destination);
      audioContext.resume?.().catch(() => {});
    } catch {
      audioContext = null;
      master = null;
    }
  }

  function tone(frequency, duration = .1, wave = "sine", volume = .45, slideTo = null) {
    if (!audioContext || !master || paused || engine.getState().muted || audioContext.state === "closed") return;
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(Math.max(40, frequency), now);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain); gain.connect(master);
    sounding.add(oscillator);
    oscillator.onended = () => { sounding.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(now); oscillator.stop(now + duration + .015);
  }

  function playEvent(event) {
    if (event.type === "pulse") tone(event.accent ? 105 : 78, .065, "sine", event.accent ? .55 : .28, event.accent ? 58 : 52);
    else if (event.type === "melody") tone(event.tone, .12, "triangle", .42);
    else if (event.type === "player-note") tone(event.tone * (event.grade === "perfect" ? 2 : 1.5), .09, "sine", .36);
    else if (event.type === "judgment" && ["miss", "extra"].includes(event.grade)) tone(115, .075, "square", .12, 72);
    else if (event.type === "gameover") tone(145, .3, "triangle", .28, 58);
  }

  function flushAudio() {
    for (const event of engine.drainEvents()) {
      if(event.type==="pulse")lastPulseMs=event.elapsedMs;
      if(event.type==="melody")guideHitMs=event.elapsedMs;
      if(event.type==="player-note")playerHitMs=event.elapsedMs;
      playEvent(event);
    }
  }

  function render() {
    const state = engine.getState();
    const phaseCopy = PHASE_COPY[state.phase] || PHASE_COPY.idle;
    ui.round.textContent = `${state.round} · ∞`;
    ui.bpm.textContent = String(state.bpm);
    ui.combo.textContent = String(state.combo);
    ui.score.textContent = state.score.toLocaleString("ko-KR");
    ui.energyText.textContent = String(state.energy);
    ui.energy.style.width = `${state.energy}%`;
    ui.energy.parentElement.setAttribute("aria-valuenow", String(state.energy));
    ui.phaseTitle.textContent = phaseCopy[0];
    ui.phaseHelp.textContent = phaseCopy[1];
    ui.phaseKicker.textContent = state.phase === "respond" ? "YOUR TURN" : state.phase === "listen" ? "LISTEN" : state.phase === "prepare" ? "GET READY" : "ENDLESS RHYTHM";
    ui.count.textContent = state.phase === "countin" ? String(5 - state.countInBeat) : state.phase === "prepare" ? String(state.prepareCount) : state.phase === "listen" ? "♪" : state.phase === "respond" ? "탁!" : state.phase === "gameover" ? "끝" : "•";
    ui.judgment.textContent = timingCopy(state.lastJudgment);
    ui.tap.disabled = state.phase !== "respond";
    ui.startPanel.hidden = state.started;
    ui.mute.setAttribute("aria-pressed", String(state.muted));
    ui.mute.setAttribute("aria-label", state.muted ? "소리 켜기" : "소리 끄기");
    ui.mute.textContent = state.muted ? "🔇 소리 꺼짐" : "🔊 소리 켬";
    game.classList.toggle("is-counting", state.phase === "countin");
    game.classList.toggle("is-listening", state.phase === "listen");
    game.classList.toggle("is-preparing", state.phase === "prepare");
    game.classList.toggle("is-responding", state.phase === "respond");
    game.classList.toggle("is-gameover", state.phase === "gameover");
    game.classList.toggle("is-low-energy", state.energy <= 30);
    ui.listenTrack.classList.toggle("is-active", state.phase === "listen");
    ui.respondTrack.classList.toggle("is-active", state.phase === "respond");

    if (renderedRound !== state.round || renderedPhase !== state.phase) {
      ui.listenNotes.innerHTML = markerMarkup(state.notes, state.phase, false);
      ui.respondNotes.innerHTML = markerMarkup(state.notes, state.phase, true);
      renderedRound = state.round;
      renderedPhase = state.phase;
    } else if (state.phase === "listen") {
      ui.listenNotes.innerHTML = markerMarkup(state.notes, state.phase, false);
    } else if (state.phase === "respond") {
      ui.respondNotes.innerHTML = markerMarkup(state.notes, state.phase, true);
    }
    ui.count.classList.toggle("is-pulse",state.elapsedMs-lastPulseMs<110);
    ui.listenTrack.classList.toggle("is-hit",state.elapsedMs-guideHitMs<130);
    ui.respondTrack.classList.toggle("is-hit",state.elapsedMs-playerHitMs<130);
    const progress = state.phaseDurationMs ? Math.min(100, state.phaseElapsedMs / state.phaseDurationMs * 100) : 0;
    ui.listenNeedle.style.left = state.phase === "listen" ? `${4+progress*.92}%` : "0%";
    ui.respondNeedle.style.left = state.phase === "respond" ? `${4+progress*.92}%` : "0%";
    ctx.setStatus(`${state.round}구간 · ${state.bpm} BPM · ${state.score.toLocaleString("ko-KR")}점 · 에너지 ${state.energy}`);

    if (state.finished && !finishedSent) {
      finishedSent = true;
      const result = engine.getResult();
      if (result) ctx.finish(result);
    }
  }

  function tap() {
    if (paused || ctx.isFinished() || engine.getState().phase !== "respond") return;
    engine.tap();
    flushAudio();
    render();
  }

  ctx.listen(ui.start, "click", () => {
    if (paused || engine.getState().started) return;
    ensureAudio();
    engine.start();
    flushAudio();
    render();
    ui.tap.focus({ preventScroll: true });
  });
  ctx.listen(ui.tap, "pointerdown", event => { if(event.button!==undefined&&event.button!==0)return; event.preventDefault();ui.tap.focus({preventScroll:true});tap(); });
  ctx.listen(ui.tap, "click", event => { if(event.detail===0)tap(); });
  ctx.listen(ui.mute, "click", () => {
    const muted = engine.toggleMuted();
    if (master) master.gain.value = muted ? 0 : .19;
    render();
    if(engine.getState().started)ui.tap.focus({preventScroll:true});
  });
  ctx.listen(document, "keydown", (event) => {
    if (paused || (interactiveTarget(event.target)&&event.target!==ui.tap) || ![" ", "Enter"].includes(event.key)) return;
    event.preventDefault();
    if(!event.repeat)tap();
  });

  render();
  return {
    tick(ms) {
      if (paused || destroyed) return;
      engine.tick(ms);
      flushAudio();
      render();
    },
    onPause(next) {
      paused = Boolean(next);
      if(!paused&&engine.getState().started&&document.activeElement?.classList.contains("dg-game__pause"))ui.tap.focus({preventScroll:true});
      if (!audioContext || audioContext.state === "closed") return;
      const operation = paused ? audioContext.suspend?.() : engine.getState().started ? audioContext.resume?.() : null;
      operation?.catch?.(() => {});
    },
    getState() {
      return { ...engine.getState(), audioSupported: Boolean(globalThis.AudioContext || globalThis.webkitAudioContext), audioState: audioContext?.state || "not-started", paused };
    },
    destroy() {
      destroyed = true;
      for (const oscillator of sounding) { try { oscillator.stop(); } catch {} }
      sounding.clear();
      try { master?.disconnect(); } catch {}
      audioContext?.close?.().catch?.(() => {});
      ctx.root.classList.remove("dg-game--rhythm");
    },
  };
}
