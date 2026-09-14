export const RHYTHM_RULES = Object.freeze({
  rounds: 8,
  initialEnergy: 100,
  perfectWindowMs: 80,
  goodWindowMs: 150,
  missPenalty: 14,
  extraPenalty: 8,
  rapidTapMs: 120,
  betweenBeats: 1,
});

const BPMS = Object.freeze([96, 100, 104, 108, 112, 116, 120, 124]);
const TEMPLATES = Object.freeze([
  [[0, 1, 2, 3], [0, 1, 3], [0, 1, 2, 3.5]],
  [[0, .5, 1.5, 2.5, 3.5], [0, 1, 1.5, 2.5, 3], [0, .5, 1, 2, 3]],
  [[0, .5, 1.5, 2, 3], [0, 1, 1.5, 2.5, 3.5], [0, .5, 1, 2.5, 3]],
  [[0, .5, 1, 2, 2.5, 3.5], [0, 1, 1.5, 2, 3, 3.5], [0, .5, 1.5, 2.5, 3, 3.5]],
  [[0, .5, 1, 1.5, 2.5, 3.5], [0, 1, 1.5, 2, 2.5, 3.5], [0, .5, 1.5, 2, 3, 3.5]],
  [[0, .5, 1, 1.5, 2.5, 3, 3.5], [0, .5, 1.5, 2, 2.5, 3, 3.5], [0, 1, 1.5, 2, 2.5, 3.5]],
  [[0, .5, 1, 1.5, 2, 3, 3.5], [0, .5, 1, 2, 2.5, 3, 3.5], [0, 1, 1.5, 2, 2.5, 3, 3.5]],
  [[0, .5, 1, 1.5, 2, 2.5, 3.5], [0, .5, 1, 2, 2.5, 3, 3.5], [0, 1, 1.5, 2, 2.5, 3, 3.5]],
]);
const SCALE = Object.freeze([261.63, 293.66, 329.63, 392, 440, 523.25]);

function choose(items, random) {
  return items[Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)))];
}

export function createRhythmRounds(random = Math.random) {
  return BPMS.map((bpm, index) => {
    const notes = [...choose(TEMPLATES[index], random)];
    const root = Math.floor(random() * SCALE.length) % SCALE.length;
    const tones = notes.map((_, note) => SCALE[(root + note * 2 + index) % SCALE.length]);
    return { round: index + 1, bpm, notes, tones };
  });
}

export function judgeRhythmOffset(offsetMs) {
  const offset = Number(offsetMs) || 0;
  const timing = offset < 0 ? "fast" : offset > 0 ? "late" : "exact";
  const distance = Math.abs(offset);
  return { grade: distance <= RHYTHM_RULES.perfectWindowMs ? "perfect" : distance <= RHYTHM_RULES.goodWindowMs ? "good" : "miss", timing };
}

export function createRhythmEngine({ random = Math.random } = {}) {
  const rounds = createRhythmRounds(random);
  let phase = "idle";
  let roundIndex = 0;
  let phaseElapsedMs = 0;
  let elapsedMs = 0;
  let pendingMs = 0;
  let energy = RHYTHM_RULES.initialEnergy;
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let perfect = 0;
  let good = 0;
  let misses = 0;
  let extraTaps = 0;
  let hits = 0;
  let totalExpected = 0;
  let roundsCompleted = 0;
  let finishReason = "";
  let muted = false;
  let noteStates = [];
  let noteCueCursor = 0;
  let pulseCursor = 0;
  let lastTapElapsedMs = -Infinity;
  let lastJudgment = null;
  let earlyFirstHit = null;
  const events = [];

  const current = () => rounds[Math.min(roundIndex, rounds.length - 1)];
  const beatMs = () => Math.round(60000 / current().bpm);
  const phaseDuration = () => phase === "between" ? beatMs() * RHYTHM_RULES.betweenBeats : ["countin", "listen", "respond"].includes(phase) ? beatMs() * 4 : 0;
  const finished = () => phase === "finished";
  function emit(type, detail = {}) {
    events.push({ type, elapsedMs, phase, round: roundIndex + 1, ...detail });
  }
  function penalize(kind, amount) {
    energy = Math.max(0, energy - amount);
    combo = 0;
    if (kind === "miss") misses += 1;
    else extraTaps += 1;
    lastJudgment = { grade: kind, timing: kind === "miss" ? "late" : "wrong", diffMs: null };
    emit("judgment", lastJudgment);
    if (!energy) finish("energy");
  }
  function finish(reason) {
    if (finished()) return;
    phase = "finished";
    finishReason = reason;
    phaseElapsedMs = 0;
    emit("finish", { reason });
  }
  function enter(nextPhase) {
    phase = nextPhase;
    phaseElapsedMs = 0;
    noteCueCursor = 0;
    pulseCursor = 0;
    if (phase === "respond") {
      noteStates = current().notes.map((beat, index) => ({ beat, atMs: Math.round(beat * beatMs()), tone: current().tones[index], status: "pending", grade: "", diffMs: null }));
      if (earlyFirstHit) noteStates[0] = { ...noteStates[0], ...earlyFirstHit.note };
      totalExpected += noteStates.length;
      lastTapElapsedMs = earlyFirstHit?.tapElapsedMs ?? -Infinity;
      earlyFirstHit = null;
    } else if (phase === "listen") {
      earlyFirstHit = null;
    }
    if (["countin", "listen", "respond"].includes(phase)) {
      emit("pulse", { beat: 0, accent: true });
      pulseCursor = 1;
    }
    if (phase === "listen") {
      while (noteCueCursor < current().notes.length && current().notes[noteCueCursor] === 0) {
        emit("melody", { note: noteCueCursor, tone: current().tones[noteCueCursor] });
        noteCueCursor += 1;
      }
    }
    emit("phase", { next: phase });
  }
  function start() {
    if (phase !== "idle") return false;
    enter("countin");
    return true;
  }
  function scheduleCues() {
    if (["countin", "listen", "respond"].includes(phase)) {
      while (pulseCursor < 4 && phaseElapsedMs >= pulseCursor * beatMs()) {
        emit("pulse", { beat: pulseCursor, accent: pulseCursor === 0 });
        pulseCursor += 1;
      }
    }
    if (phase === "listen") {
      while (noteCueCursor < current().notes.length && phaseElapsedMs >= Math.round(current().notes[noteCueCursor] * beatMs())) {
        emit("melody", { note: noteCueCursor, tone: current().tones[noteCueCursor] });
        noteCueCursor += 1;
      }
    }
  }
  function markLateNotes() {
    if (phase !== "respond") return;
    for (const note of noteStates) {
      if (note.status === "pending" && phaseElapsedMs > note.atMs + RHYTHM_RULES.goodWindowMs) {
        note.status = "miss";
        penalize("miss", RHYTHM_RULES.missPenalty);
        if (finished()) return;
      }
    }
  }
  function advanceOneMs() {
    if (finished() || phase === "idle") return;
    elapsedMs += 1;
    phaseElapsedMs += 1;
    scheduleCues();
    markLateNotes();
    if (finished() || phaseElapsedMs < phaseDuration()) return;
    if (phase === "countin") enter("listen");
    else if (phase === "listen") enter("respond");
    else if (phase === "respond") {
      for (const note of noteStates) {
        if (note.status === "pending") {
          note.status = "miss";
          penalize("miss", RHYTHM_RULES.missPenalty);
          if (finished()) return;
        }
      }
      roundsCompleted += 1;
      if (roundsCompleted >= RHYTHM_RULES.rounds) finish("complete");
      else enter("between");
    } else if (phase === "between") {
      roundIndex += 1;
      enter("listen");
    }
  }
  function tick(ms) {
    if (finished()) return getState();
    pendingMs += Math.max(0, Number(ms) || 0);
    while (pendingMs + 1e-9 >= 1 && !finished()) {
      pendingMs -= 1;
      advanceOneMs();
    }
    if (pendingMs < 0) pendingMs = 0;
    return getState();
  }
  function extra(timing = "wrong") {
    const result = { grade: "extra", timing, diffMs: null };
    penalize("extra", RHYTHM_RULES.extraPenalty);
    lastJudgment = result;
    return result;
  }
  function award(note, diffMs) {
    const judgment = judgeRhythmOffset(diffMs);
    if (judgment.grade === "miss") return extra(judgment.timing);
    note.status = "hit";
    note.grade = judgment.grade;
    note.diffMs = diffMs;
    hits += 1;
    combo += 1;
    maxCombo = Math.max(maxCombo, combo);
    if (judgment.grade === "perfect") perfect += 1;
    else good += 1;
    score += (judgment.grade === "perfect" ? 100 : 60) + Math.min(50, Math.max(0, combo - 1) * 5);
    lastJudgment = { ...judgment, diffMs };
    emit("judgment", lastJudgment);
    emit("player-note", { tone: note.tone, grade: judgment.grade });
    return lastJudgment;
  }
  function tap() {
    if (finished() || phase === "idle") return { grade: "ignored", timing: "idle", diffMs: null };
    emit("tap");
    if (phase === "listen" && current().notes[0] === 0) {
      const diffMs = phaseElapsedMs - phaseDuration();
      if (diffMs >= -RHYTHM_RULES.goodWindowMs && !earlyFirstHit) {
        if (elapsedMs - lastTapElapsedMs < RHYTHM_RULES.rapidTapMs) return extra("rapid");
        lastTapElapsedMs = elapsedMs;
        const note = { beat: 0, atMs: 0, tone: current().tones[0], status: "pending", grade: "", diffMs: null };
        const result = award(note, diffMs);
        earlyFirstHit = { note, tapElapsedMs: elapsedMs };
        return result;
      }
    }
    if (phase !== "respond") return extra("wrong-phase");
    if (elapsedMs - lastTapElapsedMs < RHYTHM_RULES.rapidTapMs) return extra("rapid");
    lastTapElapsedMs = elapsedMs;
    const pending = noteStates.filter((note) => note.status === "pending");
    if (!pending.length) return extra("late");
    const nearest = pending.reduce((best, note) => Math.abs(phaseElapsedMs - note.atMs) < Math.abs(phaseElapsedMs - best.atMs) ? note : best);
    const diffMs = phaseElapsedMs - nearest.atMs;
    return award(nearest, diffMs);
  }
  function toggleMuted(force) {
    muted = typeof force === "boolean" ? force : !muted;
    return muted;
  }
  function accuracy() {
    const attempts = hits + misses + extraTaps;
    return attempts ? Math.round(hits / attempts * 1000) / 10 : 0;
  }
  function nextNote() {
    if (phase !== "respond") return null;
    const index = noteStates.findIndex((note) => note.status === "pending");
    if (index < 0) return null;
    const note = noteStates[index];
    return { index, atMs: note.atMs, inMs: Math.max(0, note.atMs - phaseElapsedMs), lateByMs: Math.max(0, phaseElapsedMs - note.atMs) };
  }
  function nextCue() {
    if (phase === "respond") return nextNote();
    if (phase !== "listen") return null;
    const index = current().notes.findIndex((beat) => Math.round(beat * beatMs()) >= phaseElapsedMs);
    if (index < 0) return null;
    const atMs = Math.round(current().notes[index] * beatMs());
    return { index, atMs, inMs: Math.max(0, atMs - phaseElapsedMs) };
  }
  function getState() {
    const round = current();
    const duration = phaseDuration();
    return {
      phase, started: phase !== "idle", finished: finished(), finishReason,
      round: roundIndex + 1, roundsCompleted, totalRounds: RHYTHM_RULES.rounds, bpm: round.bpm, beatMs: beatMs(),
      phaseElapsedMs, phaseDurationMs: duration, phaseRemainingMs: Math.max(0, duration - phaseElapsedMs),
      countInBeat: phase === "countin" ? Math.min(4, Math.floor(phaseElapsedMs / beatMs()) + 1) : 0,
      energy, score, combo, maxCombo, perfect, good, misses, extraTaps, hits, totalExpected, accuracy: accuracy(),
      muted, elapsedMs, pendingMs: Math.round(pendingMs * 1000) / 1000,
      notes: (phase === "respond" ? noteStates : round.notes.map((beat, index) => ({ beat, atMs: Math.round(beat * beatMs()), tone: round.tones[index], status: phase === "listen" && index < noteCueCursor ? "played" : "waiting", grade: "", diffMs: null }))).map((note) => ({ ...note })),
      nextNote: nextNote(), nextCue: nextCue(), lastJudgment: lastJudgment ? { ...lastJudgment } : null,
      queuedEvents: events.length,
    };
  }
  function getResult() {
    if (!finished()) return null;
    return {
      value: score, display: String(score), unit: "점", higherBetter: true, mode: "rhythm-relay-v7",
      details: { accuracy: accuracy(), roundsCompleted, perfect, good, misses, extraTaps, hits, totalExpected, maxCombo, energy, elapsedMs },
    };
  }
  function drainEvents() {
    return events.splice(0).map((event) => ({ ...event }));
  }

  return { start, tap, tick, toggleMuted, getState, getResult, drainEvents };
}

export const RHYTHM_ENDLESS_RULES = Object.freeze({
  patternCount: 100,
  initialEnergy: 100,
  perfectWindowMs: 90,
  goodWindowMs: 175,
  missPenalty: 14,
  extraPenalty: 8,
  rapidTapMs: 120,
  listenBeats: 4,
  prepareBeats: 3,
  responseLeadBeats: 1,
  betweenBeats: 1,
  gameOverHoldMs: 900,
  initialBpm: 96,
  maxBpm: 136,
  bpmStep: 4,
  roundsPerBpmStep: 10,
});

function shuffle(items, random) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.min(index, Math.max(0, Math.floor(random() * (index + 1))));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled;
}

function buildPatternCatalog() {
  const positions = [0, .5, 1, 1.5, 2, 2.5, 3, 3.5];
  const patterns = [];
  for (let mask = 0; mask < 256 && patterns.length < RHYTHM_ENDLESS_RULES.patternCount; mask += 1) {
    const notes = positions.filter((_, index) => mask & (1 << index));
    if (notes.length >= 3 && notes.length <= 7) patterns.push(Object.freeze(notes));
  }
  return Object.freeze(patterns);
}

const ENDLESS_PATTERN_CATALOG = buildPatternCatalog();

export function createRhythmPatterns(random = Math.random) {
  return shuffle(ENDLESS_PATTERN_CATALOG, random).map((notes, index) => {
    const root = Math.floor(random() * SCALE.length) % SCALE.length;
    const tones = notes.map((_, noteIndex) => SCALE[(root + noteIndex * 2 + index) % SCALE.length]);
    return { pattern: index + 1, notes: [...notes], tones };
  });
}

export const RHYTHM_LANES = Object.freeze(["left", "center", "right"]);

export function createRhythmLanePatterns(random = Math.random) {
  const patterns = createRhythmPatterns(random);
  return patterns.map((pattern) => {
    let previous = null;
    const lanes = pattern.notes.map((_, noteIndex) => {
      let lane = RHYTHM_LANES[Math.min(2, Math.floor(random() * RHYTHM_LANES.length))];
      if (lane === previous) lane = RHYTHM_LANES[(RHYTHM_LANES.indexOf(lane) + 1 + noteIndex % 2) % RHYTHM_LANES.length];
      previous = lane;
      return lane;
    });
    return { ...pattern, lanes };
  });
}

export function judgeEndlessRhythmOffset(offsetMs) {
  const offset = Number(offsetMs) || 0;
  const timing = offset < 0 ? "fast" : offset > 0 ? "late" : "exact";
  const distance = Math.abs(offset);
  return {
    grade: distance <= RHYTHM_ENDLESS_RULES.perfectWindowMs
      ? "perfect"
      : distance <= RHYTHM_ENDLESS_RULES.goodWindowMs ? "good" : "miss",
    timing,
  };
}

function createRhythmCore({ random = Math.random, laneMode = false } = {}) {
  let patterns = laneMode ? createRhythmLanePatterns(random) : createRhythmPatterns(random);
  let phase = "idle";
  let roundIndex = 0;
  let patternCycle = 0;
  let phaseElapsedMs = 0;
  let elapsedMs = 0;
  let pendingMs = 0;
  let energy = RHYTHM_ENDLESS_RULES.initialEnergy;
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let perfect = 0;
  let good = 0;
  let misses = 0;
  let extraTaps = 0;
  let hits = 0;
  let totalExpected = 0;
  let roundsCompleted = 0;
  let finishReason = "";
  let muted = false;
  let noteStates = [];
  let noteCueCursor = 0;
  let pulseCursor = 0;
  let lastTapElapsedMs = -Infinity;
  let lastJudgment = null;
  const events = [];

  const current = () => patterns[roundIndex % patterns.length];
  const bpm = () => Math.min(
    RHYTHM_ENDLESS_RULES.maxBpm,
    RHYTHM_ENDLESS_RULES.initialBpm
      + Math.floor(roundsCompleted / RHYTHM_ENDLESS_RULES.roundsPerBpmStep) * RHYTHM_ENDLESS_RULES.bpmStep,
  );
  const beatMs = () => Math.round(60000 / bpm());
  const finished = () => phase === "finished";
  const ending = () => phase === "gameover";
  const phaseDuration = () => {
    if (phase === "countin") return beatMs() * 4;
    if (phase === "listen") return beatMs() * RHYTHM_ENDLESS_RULES.listenBeats;
    if (phase === "prepare") return beatMs() * RHYTHM_ENDLESS_RULES.prepareBeats;
    if (phase === "respond") return beatMs() * (RHYTHM_ENDLESS_RULES.listenBeats + RHYTHM_ENDLESS_RULES.responseLeadBeats);
    if (phase === "between") return beatMs() * RHYTHM_ENDLESS_RULES.betweenBeats;
    if (phase === "gameover") return RHYTHM_ENDLESS_RULES.gameOverHoldMs;
    return 0;
  };
  function emit(type, detail = {}) {
    events.push({ type, elapsedMs, phase, round: roundIndex + 1, pattern: roundIndex % patterns.length + 1, ...detail });
  }
  function beginGameOver(reason) {
    if (ending() || finished()) return;
    phase = "gameover";
    finishReason = reason;
    phaseElapsedMs = 0;
    noteCueCursor = 0;
    pulseCursor = 0;
    emit("gameover", { reason, holdMs: RHYTHM_ENDLESS_RULES.gameOverHoldMs });
  }
  function penalize(kind, amount, judgment = null) {
    energy = Math.max(0, energy - amount);
    combo = 0;
    if (kind === "miss") misses += 1;
    else extraTaps += 1;
    lastJudgment = judgment || { grade: kind, timing: kind === "miss" ? "late" : "wrong", diffMs: null };
    emit("judgment", lastJudgment);
    if (!energy) beginGameOver("energy");
  }
  function enter(nextPhase) {
    phase = nextPhase;
    phaseElapsedMs = 0;
    noteCueCursor = 0;
    pulseCursor = 0;
    if (phase === "respond") {
      noteStates = current().notes.map((beat, index) => ({
        beat,
        atMs: Math.round((beat + RHYTHM_ENDLESS_RULES.responseLeadBeats) * beatMs()),
        tone: current().tones[index],
        ...(laneMode ? { lane: current().lanes[index] } : {}),
        status: "pending",
        grade: "",
        diffMs: null,
      }));
      totalExpected += noteStates.length;
      lastTapElapsedMs = -Infinity;
    }
    if (["countin", "listen", "prepare", "respond"].includes(phase)) {
      emit("pulse", { beat: 0, accent: true });
      pulseCursor = 1;
    }
    if (phase === "listen") {
      while (noteCueCursor < current().notes.length && current().notes[noteCueCursor] === 0) {
        emit("melody", { note: noteCueCursor, tone: current().tones[noteCueCursor] });
        noteCueCursor += 1;
      }
    }
    emit("phase", { next: phase });
  }
  function start() {
    if (phase !== "idle") return false;
    enter("countin");
    return true;
  }
  function scheduleCues() {
    const pulseBeats = phase === "prepare" ? RHYTHM_ENDLESS_RULES.prepareBeats
      : phase === "respond" ? RHYTHM_ENDLESS_RULES.listenBeats + RHYTHM_ENDLESS_RULES.responseLeadBeats : 4;
    if (["countin", "listen", "prepare", "respond"].includes(phase)) {
      while (pulseCursor < pulseBeats && phaseElapsedMs >= pulseCursor * beatMs()) {
        emit("pulse", { beat: pulseCursor, accent: pulseCursor === 0 });
        pulseCursor += 1;
      }
    }
    if (phase === "listen") {
      while (noteCueCursor < current().notes.length
        && phaseElapsedMs >= Math.round(current().notes[noteCueCursor] * beatMs())) {
        emit("melody", { note: noteCueCursor, tone: current().tones[noteCueCursor] });
        noteCueCursor += 1;
      }
    }
  }
  function markLateNotes() {
    if (phase !== "respond") return;
    for (const note of noteStates) {
      if (note.status === "pending" && phaseElapsedMs > note.atMs + RHYTHM_ENDLESS_RULES.goodWindowMs) {
        note.status = "miss";
        penalize("miss", RHYTHM_ENDLESS_RULES.missPenalty);
        if (ending()) return;
      }
    }
  }
  function advanceRound() {
    const previous = current().notes.join(",");
    roundsCompleted += 1;
    roundIndex += 1;
    if (roundIndex % patterns.length === 0) {
      patternCycle += 1;
      let next = laneMode ? createRhythmLanePatterns(random) : createRhythmPatterns(random);
      if (next[0].notes.join(",") === previous && next.length > 1) [next[0], next[1]] = [next[1], next[0]];
      patterns = next;
    }
    enter("between");
  }
  function advanceOneMs() {
    if (finished() || phase === "idle") return;
    phaseElapsedMs += 1;
    if (ending()) {
      if (phaseElapsedMs >= RHYTHM_ENDLESS_RULES.gameOverHoldMs) {
        phase = "finished";
        phaseElapsedMs = 0;
        emit("finish", { reason: finishReason });
      }
      return;
    }
    elapsedMs += 1;
    scheduleCues();
    markLateNotes();
    if (ending() || phaseElapsedMs < phaseDuration()) return;
    if (phase === "countin") enter("listen");
    else if (phase === "listen") enter("prepare");
    else if (phase === "prepare") enter("respond");
    else if (phase === "respond") {
      for (const note of noteStates) {
        if (note.status === "pending") {
          note.status = "miss";
          penalize("miss", RHYTHM_ENDLESS_RULES.missPenalty);
          if (ending()) return;
        }
      }
      advanceRound();
    } else if (phase === "between") enter("listen");
  }
  function tick(ms) {
    if (finished()) return getState();
    pendingMs += Math.max(0, Number(ms) || 0);
    while (pendingMs + 1e-9 >= 1 && !finished()) {
      pendingMs -= 1;
      advanceOneMs();
    }
    if (pendingMs < 0) pendingMs = 0;
    return getState();
  }
  function extra(timing = "wrong", detail = {}) {
    const result = { grade: "extra", timing, diffMs: null, ...detail };
    penalize("extra", RHYTHM_ENDLESS_RULES.extraPenalty, laneMode ? result : null);
    return result;
  }
  function award(note, diffMs) {
    const judgment = judgeEndlessRhythmOffset(diffMs);
    if (judgment.grade === "miss") return extra(judgment.timing);
    note.status = "hit";
    note.grade = judgment.grade;
    note.diffMs = diffMs;
    hits += 1;
    combo += 1;
    maxCombo = Math.max(maxCombo, combo);
    if (judgment.grade === "perfect") perfect += 1;
    else good += 1;
    score += (judgment.grade === "perfect" ? 100 : 60) + Math.min(50, Math.max(0, combo - 1) * 5);
    lastJudgment = { ...judgment, diffMs, ...(laneMode ? { lane: note.lane } : {}) };
    emit("judgment", lastJudgment);
    emit("player-note", { tone: note.tone, grade: judgment.grade, ...(laneMode ? { lane: note.lane } : {}) });
    return lastJudgment;
  }
  function tap(lane) {
    const inputLane = laneMode && RHYTHM_LANES.includes(lane) ? lane : null;
    if (phase !== "respond") return {
      grade: "ignored", timing: ending() ? "gameover" : "wrong-phase", diffMs: null,
      ...(laneMode ? { lane: inputLane ?? String(lane || "") } : {}),
    };
    if (laneMode && !inputLane) return { grade: "ignored", timing: "invalid-lane", diffMs: null, lane: String(lane || "") };
    emit("tap");
    if (elapsedMs - lastTapElapsedMs < RHYTHM_ENDLESS_RULES.rapidTapMs) return extra("rapid", laneMode ? { lane: inputLane } : {});
    lastTapElapsedMs = elapsedMs;
    const pending = noteStates.filter((note) => note.status === "pending");
    if (!pending.length) return extra("late", laneMode ? { lane: inputLane } : {});
    const nearest = pending.reduce((best, note) => (
      Math.abs(phaseElapsedMs - note.atMs) < Math.abs(phaseElapsedMs - best.atMs) ? note : best
    ));
    const diffMs = phaseElapsedMs - nearest.atMs;
    if (laneMode && nearest.lane !== inputLane) {
      const result = { grade: "extra", timing: "wrong-lane", diffMs, lane: inputLane, expectedLane: nearest.lane };
      penalize("extra", RHYTHM_ENDLESS_RULES.extraPenalty, result);
      return result;
    }
    return award(nearest, diffMs);
  }
  function toggleMuted(force) {
    muted = typeof force === "boolean" ? force : !muted;
    return muted;
  }
  function accuracy() {
    const attempts = hits + misses + extraTaps;
    return attempts ? Math.round(hits / attempts * 1000) / 10 : 0;
  }
  function nextNote() {
    if (phase !== "respond") return null;
    const index = noteStates.findIndex((note) => note.status === "pending");
    if (index < 0) return null;
    const note = noteStates[index];
    return {
      index,
      atMs: note.atMs,
      ...(laneMode ? { lane: note.lane } : {}),
      inMs: Math.max(0, note.atMs - phaseElapsedMs),
      lateByMs: Math.max(0, phaseElapsedMs - note.atMs),
    };
  }
  function nextCue() {
    if (phase === "respond") return nextNote();
    if (phase !== "listen") return null;
    const index = current().notes.findIndex((beat) => Math.round(beat * beatMs()) >= phaseElapsedMs);
    if (index < 0) return null;
    const atMs = Math.round(current().notes[index] * beatMs());
    return { index, atMs, inMs: Math.max(0, atMs - phaseElapsedMs) };
  }
  function visibleNotes() {
    if (phase === "respond" || phase === "gameover" || phase === "finished") return noteStates;
    return current().notes.map((beat, index) => ({
      beat,
      atMs: Math.round(beat * beatMs()),
      tone: current().tones[index],
      ...(laneMode ? { lane: current().lanes[index] } : {}),
      status: phase === "listen" && index < noteCueCursor ? "played" : "waiting",
      grade: "",
      diffMs: null,
    }));
  }
  function getState() {
    const duration = phaseDuration();
    const prepareCount = phase === "prepare"
      ? Math.max(1, RHYTHM_ENDLESS_RULES.prepareBeats - Math.floor(phaseElapsedMs / beatMs())) : 0;
    return {
      phase,
      started: phase !== "idle",
      ending: ending(),
      finished: finished(),
      finishReason,
      round: roundIndex + 1,
      roundsCompleted,
      totalRounds: null,
      endless: true,
      patternIndex: roundIndex % patterns.length + 1,
      patternCycle,
      ...(laneMode ? { lanes: RHYTHM_LANES } : {}),
      totalPatterns: RHYTHM_ENDLESS_RULES.patternCount,
      bpm: bpm(),
      beatMs: beatMs(),
      phaseElapsedMs,
      phaseDurationMs: duration,
      phaseRemainingMs: Math.max(0, duration - phaseElapsedMs),
      countInBeat: phase === "countin" ? Math.min(4, Math.floor(phaseElapsedMs / beatMs()) + 1) : 0,
      prepareCount,
      energy,
      score,
      combo,
      maxCombo,
      perfect,
      good,
      misses,
      extraTaps,
      hits,
      totalExpected,
      accuracy: accuracy(),
      muted,
      elapsedMs,
      pendingMs: Math.round(pendingMs * 1000) / 1000,
      notes: visibleNotes().map((note) => ({ ...note })),
      nextNote: nextNote(),
      nextCue: nextCue(),
      lastJudgment: lastJudgment ? { ...lastJudgment } : null,
      queuedEvents: events.length,
    };
  }
  function getResult() {
    if (!finished()) return null;
    return {
      value: score,
      display: String(score),
      unit: "점",
      higherBetter: true,
      mode: laneMode ? "rhythm-three-lane-v11" : "rhythm-endless-v9",
      details: {
        accuracy: accuracy(), roundsCompleted, perfect, good, misses, extraTaps, hits,
        totalExpected, maxCombo, energy, elapsedMs, maxBpm: bpm(), patternCycle,
      },
    };
  }
  function drainEvents() {
    return events.splice(0).map((event) => ({ ...event }));
  }

  return { start, tap, tick, toggleMuted, getState, getResult, drainEvents };
}

export function createRhythmEndlessEngine({ random = Math.random } = {}) {
  return createRhythmCore({ random, laneMode: false });
}

export function createRhythmThreeLaneEngine({ random = Math.random } = {}) {
  return createRhythmCore({ random, laneMode: true });
}
