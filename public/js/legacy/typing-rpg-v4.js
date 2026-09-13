import { typingPhrases } from "../typing-phrases.js";

export const RPG_RULES = Object.freeze({
  maxHp: 100,
  maxMp: 100,
  mpPerCorrectCharacter: 2,
  typoDamage: 2,
  counterEveryMs: 8000,
  comboPerCharacter: 4,
  comboDecayPerSecond: 8,
});

const HEAL_WORD = "힐";
const HEAL_PARTS = new Set(["ㅎ", "히", HEAL_WORD]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shuffled(items, random) {
  const deck = [...items];
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swap = clamp(Math.floor(random() * (index + 1)), 0, index);
    [deck[index], deck[swap]] = [deck[swap], deck[index]];
  }
  return deck;
}

function commonPrefixLength(left, right) {
  let index = 0;
  while (index < left.length && index < right.length && left[index] === right[index]) index += 1;
  return index;
}

function unchangedSuffixLength(left, right, prefixLength) {
  let length = 0;
  const limit = Math.min(left.length, right.length) - prefixLength;
  while (length < limit && left[left.length - 1 - length] === right[right.length - 1 - length]) length += 1;
  return length;
}

export function typingRpgDamage(combo) {
  const bonus = combo >= 20 ? Math.min(20, Math.floor(combo / 5)) : 0;
  return 30 + bonus;
}

export function typingRpgMonster(defeated) {
  return {
    maxHp: Math.min(160, 60 + Math.max(0, defeated) * 10),
    counterDamage: Math.min(16, 8 + Math.floor(Math.max(0, defeated) / 3)),
  };
}

export function createTypingRpgModel({ random = Math.random, phrases = typingPhrases } = {}) {
  if (!Array.isArray(phrases) || !phrases.length) throw new TypeError("타이포 RPG에는 한 개 이상의 문장이 필요합니다.");
  const deck = shuffled(phrases, random);
  let hp = RPG_RULES.maxHp;
  let mp = 0;
  let combo = 0;
  let monster = typingRpgMonster(0);
  let monsterHp = monster.maxHp;
  let defeated = 0;
  let completed = 0;
  let typed = 0;
  let correctTyped = 0;
  let input = "";
  let judgedInput = "";
  let healDraft = false;
  let elapsedMs = 0;
  let counterMs = RPG_RULES.counterEveryMs;
  let finished = false;
  let finishReason = "";
  let actionSerial = 0;
  let lastAction = { type: "ready", amount: 0 };

  const accuracy = () => typed ? Math.round(correctTyped / typed * 1000) / 10 : 0;
  const speed = () => elapsedMs ? Math.round(correctTyped * 60000 / elapsedMs) : 0;
  const score = () => completed * 100 + defeated * 50;
  const target = () => deck[completed] ?? "";
  function action(type, amount = 0) {
    actionSerial += 1;
    lastAction = { type, amount };
    return lastAction;
  }
  function end(reason) {
    if (finished) return;
    hp = Math.max(0, hp);
    finished = true;
    finishReason = reason;
    action(reason === "completed" ? "complete" : "defeat");
  }

  function clearInput() {
    input = "";
    judgedInput = "";
    healDraft = false;
    return action("clear");
  }

  function commitInput(nextValue, { composing = false } = {}) {
    if (finished || composing) return { type: composing ? "composing" : "finished", amount: 0 };
    const next = String(nextValue ?? "");
    if (healDraft) {
      input = next;
      judgedInput = next;
      if (!next) healDraft = false;
      return action(next ? "heal-draft" : "clear");
    }
    if (!input && mp === RPG_RULES.maxMp && HEAL_PARTS.has(next)) {
      input = next;
      judgedInput = next;
      healDraft = true;
      return action("heal-draft");
    }

    const start = commonPrefixLength(judgedInput, next);
    const unchangedSuffix = unchangedSuffixLength(judgedInput, next, start);
    const changedEnd = next.length - unchangedSuffix;
    let correct = 0, wrong = 0;
    for (let index = start; index < changedEnd && !finished; index += 1) {
      typed += 1;
      if (next[index] === target()[index]) {
        correct += 1;
        correctTyped += 1;
        mp = Math.min(RPG_RULES.maxMp, mp + RPG_RULES.mpPerCorrectCharacter);
        combo = Math.min(100, combo + RPG_RULES.comboPerCharacter);
      } else {
        wrong += 1;
        hp -= RPG_RULES.typoDamage;
        combo = 0;
        if (hp <= 0) end("hp");
      }
    }
    input = next;
    judgedInput = next;
    if (finished) return lastAction;
    return action(wrong ? "typo" : correct ? "type" : "edit", wrong || correct);
  }

  function submit() {
    if (finished) return { type: "finished", amount: 0 };
    if (healDraft) {
      if (input === HEAL_WORD && mp === RPG_RULES.maxMp) {
        hp = Math.min(RPG_RULES.maxHp, hp + 30);
        mp = 0;
        input = "";
        judgedInput = "";
        healDraft = false;
        return action("heal", 30);
      }
      return action("heal-invalid");
    }
    if (input !== target()) return action(input ? "incomplete" : "empty");

    const damage = typingRpgDamage(combo);
    monsterHp -= damage;
    completed += 1;
    input = "";
    judgedInput = "";
    let defeatedNow = false;
    if (monsterHp <= 0) {
      defeated += 1;
      defeatedNow = true;
      monster = typingRpgMonster(defeated);
      monsterHp = monster.maxHp;
    }
    if (completed >= deck.length) end("completed");
    if (finished) return lastAction;
    return action(defeatedNow ? "monster-down" : "attack", damage);
  }

  function tick(ms) {
    let remaining = Math.max(0, Number(ms) || 0);
    while (remaining > 0 && !finished) {
      const step = Math.min(remaining, counterMs);
      elapsedMs += step;
      combo = Math.max(0, combo - RPG_RULES.comboDecayPerSecond * step / 1000);
      counterMs -= step;
      remaining -= step;
      if (counterMs <= .0001) {
        hp -= monster.counterDamage;
        counterMs = RPG_RULES.counterEveryMs;
        action("counter", monster.counterDamage);
        if (hp <= 0) end("hp");
      }
    }
    return getState();
  }

  function getState() {
    return {
      hp, maxHp: RPG_RULES.maxHp, mp, maxMp: RPG_RULES.maxMp, combo: Math.round(combo * 10) / 10,
      monsterHp, monsterMaxHp: monster.maxHp, counterDamage: monster.counterDamage, counterMs,
      defeated, completed, phraseCount: deck.length, target: target(), input, healDraft,
      typed, correctTyped, accuracy: accuracy(), speed: speed(), elapsedMs,
      survivedSeconds: Math.round(elapsedMs / 100) / 10, score: score(), finished, finishReason,
      actionSerial, lastAction: { ...lastAction },
    };
  }

  function getResult() {
    if (!finished) return null;
    return {
      value: score(), display: String(score()), unit: "점", higherBetter: true, mode: "typing-rpg-v4",
      details: { defeated, completed, accuracy: accuracy(), typed, elapsedMs: Math.round(elapsedMs), survivedSeconds: Math.round(elapsedMs / 100) / 10 },
    };
  }

  return { commitInput, clearInput, submit, tick, getState, getResult };
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

const MONSTER_NAMES = ["쉼표 슬라임", "괄호 도깨비", "물음표 해파리", "띄어쓰기 골렘", "마침표 용"];

export function createTypingRpg(ctx) {
  const model = createTypingRpgModel({ random: ctx.random });
  const gameRoot = ctx.stage.closest?.(".dg-game");
  gameRoot?.classList.add("dg-game--typing-rpg");

  const root = node("section", "typing-rpg");
  const hud = node("div", "typing-rpg__hud");
  const hpCard = node("div", "typing-rpg__meter-card typing-rpg__meter-card--hp");
  const hpLabel = node("span", "typing-rpg__meter-label", "내 HP");
  const hpMeter = node("meter", "typing-rpg__meter"); hpMeter.min = 0; hpMeter.max = RPG_RULES.maxHp;
  const hpValue = node("b", "typing-rpg__meter-value"); hpCard.append(hpLabel, hpMeter, hpValue);
  const mpCard = node("div", "typing-rpg__meter-card typing-rpg__meter-card--mp");
  const mpLabel = node("span", "typing-rpg__meter-label", "회복 MP");
  const mpMeter = node("meter", "typing-rpg__meter"); mpMeter.min = 0; mpMeter.max = RPG_RULES.maxMp;
  const mpValue = node("b", "typing-rpg__meter-value"); mpCard.append(mpLabel, mpMeter, mpValue);
  const comboCard = node("div", "typing-rpg__stat-card");
  const comboLabel = node("span", "typing-rpg__stat-label", "콤보"); const comboValue = node("b", "typing-rpg__stat-value"); comboCard.append(comboLabel, comboValue);
  const progressCard = node("div", "typing-rpg__stat-card");
  const progressLabel = node("span", "typing-rpg__stat-label", "진행"); const progressValue = node("b", "typing-rpg__stat-value"); progressCard.append(progressLabel, progressValue);
  hud.append(hpCard, mpCard, comboCard, progressCard);

  const battlefield = node("div", "typing-rpg__battlefield");
  const arena = node("section", "typing-rpg__arena"); arena.setAttribute("aria-label", "몬스터 전투 상황");
  const enemyHead = node("div", "typing-rpg__enemy-head");
  const enemyName = node("strong", "typing-rpg__enemy-name");
  const enemyHpText = node("span", "typing-rpg__enemy-hp-text"); enemyHead.append(enemyName, enemyHpText);
  const enemyMeter = node("meter", "typing-rpg__enemy-meter"); enemyMeter.min = 0;
  const scene = node("div", "typing-rpg__scene");
  const hero = node("div", "typing-rpg__hero"); hero.setAttribute("aria-hidden", "true");
  hero.append(node("i", "typing-rpg__hero-hair"), node("i", "typing-rpg__hero-face"), node("i", "typing-rpg__hero-board"));
  const bolt = node("div", "typing-rpg__bolt", "가"); bolt.setAttribute("aria-hidden", "true");
  const creature = node("div", "typing-rpg__monster"); creature.setAttribute("aria-hidden", "true");
  creature.append(node("i", "typing-rpg__monster-eye typing-rpg__monster-eye--left"), node("i", "typing-rpg__monster-eye typing-rpg__monster-eye--right"), node("i", "typing-rpg__monster-mouth"));
  scene.append(hero, bolt, creature);
  const counter = node("div", "typing-rpg__counter");
  const counterText = node("span", "typing-rpg__counter-text");
  const counterTrack = node("span", "typing-rpg__counter-track"); const counterFill = node("i", "typing-rpg__counter-fill"); counterTrack.append(counterFill); counter.append(counterText, counterTrack);
  arena.append(enemyHead, enemyMeter, scene, counter);

  const command = node("section", "typing-rpg__command");
  const targetLabel = node("span", "typing-rpg__eyebrow", "이번 공격 주문");
  const targetText = node("div", "typing-rpg__target"); targetText.setAttribute("aria-live", "polite");
  const letterGuide = node("div", "typing-rpg__letters"); letterGuide.setAttribute("aria-hidden", "true");
  const form = node("form", "typing-rpg__form");
  const input = node("input", "typing-rpg__input"); input.type = "text"; input.autocomplete = "off"; input.spellcheck = false; input.enterKeyHint = "send"; input.placeholder = "문장을 그대로 입력"; input.setAttribute("aria-label", "공격 문장 입력");
  const submit = node("button", "typing-rpg__submit", "공격"); submit.type = "submit"; form.append(input, submit);
  const message = node("p", "typing-rpg__message", "처음 8초는 안전해요. 문장을 정확히 입력해 공격하세요."); message.setAttribute("aria-live", "polite");
  const healHint = node("p", "typing-rpg__heal-hint", "MP 100이면 입력창을 비운 뒤 ‘힐’ + Enter · Esc로 입력 지우기");
  const numbers = node("div", "typing-rpg__numbers");
  const speedText = node("span"), accuracyText = node("span"), defeatedText = node("span"); numbers.append(speedText, accuracyText, defeatedText);
  command.append(targetLabel, targetText, letterGuide, form, message, healHint, numbers);
  battlefield.append(arena, command); root.append(hud, battlefield); ctx.stage.append(root);

  let composing = false;
  let reported = false;
  let effectMs = 0;
  let seenAction = -1;

  function actionMessage(state) {
    const { type, amount } = state.lastAction;
    const messages = {
      ready: "처음 8초는 안전해요. 문장을 정확히 입력해 공격하세요.",
      type: `좋아요! MP가 차오르고 있어요.`,
      typo: `오타 ${amount}글자 · HP가 ${amount * RPG_RULES.typoDamage} 줄고 콤보가 끊겼어요.`,
      attack: `${amount} 피해! 다음 문장을 이어 입력하세요.`,
      "monster-down": `${amount} 피해! 몬스터를 물리쳤어요.`,
      counter: `몬스터의 반격! HP가 ${amount} 줄었어요.`,
      "heal-draft": "회복 주문 준비 중 · ‘힐’을 완성하고 Enter를 누르세요.",
      heal: "회복 성공! HP를 30 회복했어요.",
      "heal-invalid": "회복 주문은 정확히 ‘힐’이에요. Esc로 지울 수 있어요.",
      incomplete: "아직 문장이 맞지 않아요. 표시된 글자를 확인하세요.",
      empty: "공격할 문장을 입력해 주세요.",
      clear: "입력을 지웠어요. 다시 차분히 시작하세요.",
      complete: "100개 문장을 모두 완성했어요!",
      defeat: "HP가 모두 줄었어요. 이번 모험은 여기까지예요.",
    };
    return messages[type] ?? message.textContent;
  }

  function renderLetters(state) {
    letterGuide.replaceChildren();
    if (state.healDraft) {
      letterGuide.append(node("span", "typing-rpg__letter is-heal", "회복 주문 입력 중"));
      return;
    }
    [...state.target].forEach((character, index) => {
      const letter = node("span", "typing-rpg__letter", character === " " ? "·" : character);
      if (index < state.input.length) letter.classList.add(state.input[index] === character ? "is-correct" : "is-wrong");
      letterGuide.append(letter);
    });
    for (let index = state.target.length; index < state.input.length; index += 1) letterGuide.append(node("span", "typing-rpg__letter is-wrong", state.input[index]));
  }

  function render() {
    const state = model.getState();
    hpMeter.value = state.hp; hpValue.textContent = `${state.hp} / ${state.maxHp}`;
    mpMeter.value = state.mp; mpValue.textContent = `${state.mp} / ${state.maxMp}`;
    comboValue.textContent = `${Math.floor(state.combo)}`; progressValue.textContent = `${state.completed} / ${state.phraseCount}`;
    enemyName.textContent = `${MONSTER_NAMES[state.defeated % MONSTER_NAMES.length]} · Lv.${state.defeated + 1}`;
    enemyMeter.max = state.monsterMaxHp; enemyMeter.value = state.monsterHp; enemyHpText.textContent = `${Math.max(0, state.monsterHp)} / ${state.monsterMaxHp}`;
    counterText.textContent = `반격까지 ${(state.counterMs / 1000).toFixed(1)}초 · 피해 ${state.counterDamage}`;
    counterFill.style.width = `${state.counterMs / RPG_RULES.counterEveryMs * 100}%`;
    targetText.textContent = state.healDraft ? "회복 주문: 힐" : state.target;
    renderLetters(state);
    speedText.textContent = `속도 ${state.speed}글자/분`; accuracyText.textContent = `정확도 ${state.accuracy.toFixed(1)}%`; defeatedText.textContent = `처치 ${state.defeated}`;
    healHint.classList.toggle("is-ready", state.mp === RPG_RULES.maxMp);
    if (state.actionSerial !== seenAction) {
      seenAction = state.actionSerial; message.textContent = actionMessage(state);
      root.classList.remove("is-attack", "is-hit", "is-heal");
      const effect = ["attack", "monster-down"].includes(state.lastAction.type) ? "is-attack" : ["typo", "counter"].includes(state.lastAction.type) ? "is-hit" : state.lastAction.type === "heal" ? "is-heal" : "";
      if (effect) { void root.offsetWidth; root.classList.add(effect); effectMs = 360; }
    }
    input.disabled = state.finished; submit.disabled = state.finished;
    ctx.setStatus(`타이포 RPG · ${state.completed}/${state.phraseCount}문장`);
    if (state.finished && !reported) { reported = true; ctx.finish(model.getResult()); }
  }

  function commit() { model.commitInput(input.value, { composing }); render(); }
  ctx.listen(input, "compositionstart", () => { composing = true; });
  ctx.listen(input, "compositionend", () => { composing = false; commit(); });
  ctx.listen(input, "input", (event) => { if (!event.isComposing) commit(); });
  ctx.listen(input, "keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault(); composing = false; input.value = ""; model.clearInput(); render();
  });
  ctx.listen(form, "submit", (event) => {
    event.preventDefault();
    if (composing || ctx.isFinished()) return;
    model.commitInput(input.value);
    model.submit();
    input.value = model.getState().input;
    render(); input.focus();
  });

  render();
  return {
    tick(ms) {
      model.tick(ms);
      effectMs = Math.max(0, effectMs - ms);
      if (!effectMs) root.classList.remove("is-attack", "is-hit", "is-heal");
      render();
    },
    getState: () => ({ ...model.getState(), composing }),
    destroy() { gameRoot?.classList.remove("dg-game--typing-rpg"); },
  };
}
