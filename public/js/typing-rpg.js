import {typingLongPhrases} from './typing-long-phrases.js';
import { typingPhrases } from "./typing-phrases.js";
import {rpgCharacter,rpgCharacterArtPath,rpgMonsterArtPath,rpgMonsterIndex,rpgMonsterName} from './rpg-characters.js';
import {assetUrl,warmImage} from './asset-delivery.js';
import {createTypingInput} from './typing-input.js';

export const RPG_RULES = Object.freeze({
  maxHp: 100,
  maxMp: 100,
  mpPerCorrectCharacter: 2,
  typoDamage: 2,
  normalCounterEveryMs: 10000,
  bossCounterEveryMs: 15000,
  comboPerCharacter: 4,
  comboDecayPerSecond: 8,
  baseAttack: 30,
  baseHeal: 15,
});

export const RPG_PALETTE_25 = Object.freeze([
  "#6fae7b", "#5ca9a1", "#6f9fc7", "#8a8fd0", "#a47fc2",
  "#c07ca5", "#d17b7b", "#d28d62", "#c7a653", "#a9ad55",
  "#7eae62", "#55aa81", "#4fa9b5", "#5d94ce", "#787fd0",
  "#9676c4", "#b36fae", "#c86f91", "#d0796a", "#c58f58",
  "#b1a14e", "#91a955", "#68a96b", "#54a18d", "#5797a8",
]);

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

function normalizedGear(gear = {}) {
  const value = (key) => Math.max(0, Math.floor(Number(gear?.[key]) || 0));
  return Object.freeze({ attack: value("attack"), defense: value("defense"), heal: value("heal") });
}

function normalizedStage(stage) {
  return Math.max(1, Math.floor(Number(stage) || 1));
}

export function typingRpgPalette(stage) {
  return RPG_PALETTE_25[(normalizedStage(stage) - 1) % RPG_PALETTE_25.length];
}

export function typingRpgArtPath(stage,boss=false){
  const current=normalizedStage(stage);
  const index=boss?((Math.floor(current/10)-1)%RPG_PALETTE_25.length+RPG_PALETTE_25.length)%RPG_PALETTE_25.length:(current-1)%RPG_PALETTE_25.length;
  return `/assets/pixel/rpg/${boss?'boss':'monster'}-${String(index+1).padStart(2,'0')}.svg`;
}

export function typingRpgHeroDuelArtPath(characterId){
  return `/assets/pixel/scenes/duel-hero-${rpgCharacter(characterId).index}.png`;
}

export function typingRpgMonsterDuelArtPath(stage){
  return `/assets/pixel/scenes/duel-monster-${String(rpgMonsterIndex(stage)+1).padStart(2,'0')}.png`;
}

export function typingRpgDamage(combo, gear = {}, sentenceMode = 'short') {
  const equipment = typeof gear === "number" ? { attack: gear } : gear;
  const bonus = combo >= 20 ? Math.min(20, Math.floor(combo / 5)) : 0;
  return (RPG_RULES.baseAttack + bonus + normalizedGear(equipment).attack) * (sentenceMode === 'long' ? 2 : 1);
}

export function typingRpgMonster(stage, gear = {}) {
  const currentStage = normalizedStage(stage);
  const boss = currentStage % 10 === 0;
  const baseHp = Math.min(240, 60 + (currentStage - 1) * 10);
  const rawCounterDamage = (5 + currentStage - 1) * (boss ? 2 : 1);
  return {
    stage: currentStage,
    boss,
    maxHp: baseHp * (boss ? 2 : 1),
    counterEveryMs: boss ? RPG_RULES.bossCounterEveryMs : RPG_RULES.normalCounterEveryMs,
    rawCounterDamage,
    counterDamage: Math.max(1, rawCounterDamage - normalizedGear(gear).defense),
  };
}

export function createTypingRpgModel({ random = Math.random, phrases, startStage = 1, gear = {}, sentenceMode = 'short' } = {}) {
  sentenceMode = sentenceMode === 'long' ? 'long' : 'short';
  phrases ??= sentenceMode === 'long' ? typingLongPhrases : typingPhrases;
  if (!Array.isArray(phrases) || !phrases.length) throw new TypeError("타이포 RPG에는 한 개 이상의 문장이 필요합니다.");
  const equipment = normalizedGear(gear);
  const firstStage = normalizedStage(startStage);
  let deck = [];
  let phraseCursor = 0;
  let cycle = 0;
  let previousPhrase = null;
  function refillDeck() {
    deck = shuffled(phrases, random);
    if (deck.length > 1 && deck[0] === previousPhrase) {
      const swap = deck.findIndex((phrase) => phrase !== previousPhrase);
      [deck[0], deck[swap]] = [deck[swap], deck[0]];
    }
    phraseCursor = 0;
    cycle += 1;
  }
  refillDeck();
  let hp = RPG_RULES.maxHp;
  let mp = 0;
  let comboHundredths = 0;
  let stage = firstStage;
  let monster = typingRpgMonster(stage, equipment);
  let monsterHp = monster.maxHp;
  let defeated = 0;
  let completed = 0;
  let gold = 0;
  let bestClearedStage = 0;
  let typed = 0;
  let correctTyped = 0;
  let input = "";
  let judgedInput = "";
  let healDraft = false;
  let elapsedMs = 0;
  let pendingMs = 0;
  let counterMs = monster.counterEveryMs;
  let finished = false;
  let finishReason = "";
  let actionSerial = 0;
  let lastAction = { type: "ready", amount: 0 };
  const actions = [];

  const accuracy = () => typed ? Math.round(correctTyped / typed * 1000) / 10 : 0;
  const speed = () => elapsedMs ? Math.round(correctTyped * 60000 / elapsedMs) : 0;
  const score = () => 10 + defeated * 10;
  const combo = () => comboHundredths / 100;
  const target = () => deck[phraseCursor];
  function action(type, amount = 0, extra = {}) {
    actionSerial += 1;
    lastAction = { type, amount, ...extra };
    return lastAction;
  }
  function record(type, text) {
    const entry = text === undefined ? [elapsedMs, type] : [elapsedMs, type, text];
    actions.push(entry);
    return entry;
  }
  function end(reason) {
    if (finished) return;
    hp = Math.max(0, hp);
    finished = true;
    finishReason = reason;
    action(reason === "completed" ? "complete" : "defeat");
  }

  function clearInput() {
    if (finished) return { type: "finished", amount: 0 };
    record("clear");
    input = "";
    judgedInput = "";
    healDraft = false;
    return action("clear");
  }

  function commitInput(nextValue, { composing = false } = {}) {
    if (finished || composing) return { type: composing ? "composing" : "finished", amount: 0 };
    const next = String(nextValue ?? "");
    if (next === input) return { type: "duplicate", amount: 0 };
    record("input", next);
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
        comboHundredths = Math.min(10000, comboHundredths + RPG_RULES.comboPerCharacter * 100);
      } else {
        wrong += 1;
        hp -= RPG_RULES.typoDamage;
        comboHundredths = 0;
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
    record("submit");
    if (healDraft) {
      if (input === HEAL_WORD && mp === RPG_RULES.maxMp) {
        const healAmount = RPG_RULES.baseHeal + equipment.heal;
        const recovered = Math.min(healAmount, RPG_RULES.maxHp - hp);
        hp = Math.min(RPG_RULES.maxHp, hp + healAmount);
        mp = 0;
        input = "";
        judgedInput = "";
        healDraft = false;
        return action("heal", recovered);
      }
      return action("heal-invalid");
    }
    if (input !== target()) return action(input ? "incomplete" : "empty");

    const damage = typingRpgDamage(combo(), equipment, sentenceMode);
    monsterHp -= damage;
    completed += 1;
    previousPhrase = target();
    phraseCursor += 1;
    if (phraseCursor >= deck.length) refillDeck();
    input = "";
    judgedInput = "";
    let defeatedNow = false;
    if (monsterHp <= 0) {
      defeated += 1;
      defeatedNow = true;
      bestClearedStage = stage;
      gold += 10 + (monster.boss ? 20 : 0);
      const bossDown = monster.boss;
      stage += 1;
      monster = typingRpgMonster(stage, equipment);
      monsterHp = monster.maxHp;
      counterMs = monster.counterEveryMs;
      if (bossDown) return action("boss-down", damage, { clearedStage: stage - 1 });
    }
    return action(defeatedNow ? "monster-down" : "attack", damage);
  }

  function tick(ms) {
    if (finished) return getState();
    pendingMs += Math.max(0, Number(ms) || 0);
    while (pendingMs + 1e-9 >= 10 && !finished) {
      pendingMs -= 10;
      elapsedMs += 10;
      comboHundredths = Math.max(0, comboHundredths - RPG_RULES.comboDecayPerSecond);
      counterMs -= 10;
      if (counterMs <= 0) {
        hp -= monster.counterDamage;
        counterMs = monster.counterEveryMs;
        action("counter", monster.counterDamage);
        if (hp <= 0) end("hp");
      }
    }
    if (pendingMs < 0) pendingMs = 0;
    return getState();
  }

  function getState() {
    return {
      sentenceMode, attackMultiplier: sentenceMode === 'long' ? 2 : 1, hp, maxHp: RPG_RULES.maxHp, mp, maxMp: RPG_RULES.maxMp, combo: Math.round(combo() * 10) / 10,
      stage, startStage: firstStage, boss: monster.boss, palette: typingRpgPalette(stage), gear: { ...equipment },
      monsterHp, monsterMaxHp: monster.maxHp, counterDamage: monster.counterDamage, rawCounterDamage: monster.rawCounterDamage, counterEveryMs: monster.counterEveryMs, counterMs,
      defeated, completed, phraseCount: phrases.length, phraseCycle: cycle, deckRemaining: deck.length - phraseCursor, target: target(), input, healDraft,
      gold, bestClearedStage,
      typed, correctTyped, accuracy: accuracy(), speed: speed(), elapsedMs,
      survivedSeconds: Math.round(elapsedMs / 100) / 10, score: score(), finished, finishReason,
      actionSerial, lastAction: { ...lastAction }, actionCount: actions.length,
      lastRecordedAction: actions.length ? [...actions[actions.length - 1]] : null,
    };
  }

  function getProgress() {
    return {
      value: score(), display: String(score()), unit: "점", higherBetter: true,
      mode: `typing-rpg-v5-${sentenceMode === 'long' ? 'long-' : ''}s${firstStage}`,
      finished,
      details: {
        stage, currentStage: stage, bestClearedStage, defeated, completed, accuracy: accuracy(), typed,
        elapsedMs, survivedSeconds: Math.round(elapsedMs / 100) / 10, gold, startStage: firstStage,
        actions: actions.map((entry) => [...entry]),
      },
    };
  }

  function getResult() {
    return finished ? getProgress() : null;
  }

  return { commitInput, clearInput, submit, tick, getState, getProgress, getResult };
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function pixelMeter(className, label) {
  const meter = node('div', `typing-rpg__gauge ${className}`);
  meter.setAttribute('role', 'meter'); meter.setAttribute('aria-label', label);
  meter.setAttribute('aria-valuemin', '0');
  const fill = node('span', 'typing-rpg__gauge-fill'); fill.setAttribute('aria-hidden', 'true');
  meter.append(fill); return meter;
}
function updatePixelMeter(meter, value, max) {
  const bounded = Math.max(0, Math.min(max, value));
  meter.setAttribute('aria-valuemax', String(max)); meter.setAttribute('aria-valuenow', String(bounded));
  meter.firstElementChild.style.width = `${bounded / max * 100}%`;
}

function pixelArt(src,className,width,height){
  const image=node('img',className);if(src)image.src=assetUrl(src);image.alt='';image.width=width;image.height=height;image.draggable=false;image.decoding='async';return image;
}

function wirePixelArt(image,container){
  image.addEventListener('error',()=>{
    if(image.dataset.fallback&&!image.dataset.usingFallback){image.dataset.usingFallback='true';image.src=assetUrl(image.dataset.fallback);return;}
    container.classList.add('is-art-missing');
  });
  image.addEventListener('load',()=>container.classList.remove('is-art-missing'));
}

function setPixelArt(image,container,primary,fallback){
  if(image.dataset.asset===primary)return;
  image.dataset.asset=primary;
  image.dataset.fallback=fallback;
  image.dataset.decorativeImage='';
  image.dataset.fallbackSrc=fallback;
  delete image.dataset.usingFallback;
  container.classList.remove('is-art-missing');
  image.src=assetUrl(primary);
}

export function createTypingRpg(ctx) {
  const model = createTypingRpgModel({ random: ctx.random, startStage: ctx.settings?.startStage, gear: ctx.settings?.gear, sentenceMode: ctx.settings?.sentenceMode });
  const selectedCharacter=rpgCharacter(ctx.settings?.characterId);
  const gameRoot = ctx.stage.closest?.(".dg-game");
  gameRoot?.classList.add("dg-game--typing-rpg");

  const root = node("section", "typing-rpg typing-rpg--pixel");
  root.classList.toggle("typing-rpg--long", model.getState().sentenceMode === "long");
  const hud = node("div", "typing-rpg__hud");
  const hpCard = node("div", "typing-rpg__meter-card typing-rpg__meter-card--hp");
  const hpLabel = node("span", "typing-rpg__meter-label", "내 HP");
  const hpMeter = pixelMeter("typing-rpg__meter", "내 HP");
  const hpValue = node("b", "typing-rpg__meter-value"); hpCard.append(hpLabel, hpMeter, hpValue);
  const mpCard = node("div", "typing-rpg__meter-card typing-rpg__meter-card--mp");
  const mpLabel = node("span", "typing-rpg__meter-label", "회복 MP");
  const mpMeter = pixelMeter("typing-rpg__meter typing-rpg__gauge--mp", "회복 MP");
  const mpValue = node("b", "typing-rpg__meter-value"); mpCard.append(mpLabel, mpMeter, mpValue);
  const progressCard = node("div", "typing-rpg__stat-card");
  const progressLabel = node("span", "typing-rpg__stat-label", "스테이지"); const progressValue = node("b", "typing-rpg__stat-value"); progressCard.append(progressLabel, progressValue);
  const goldCard = node("div", "typing-rpg__stat-card typing-rpg__stat-card--gold");
  const goldLabel = node("span", "typing-rpg__stat-label", "골드"); const goldValue = node("b", "typing-rpg__stat-value"); goldCard.append(goldLabel, goldValue);
  const playerHud = node("section", "typing-rpg__player-hud"); playerHud.setAttribute("aria-label", "플레이어 상태"); playerHud.append(hpCard, mpCard);
  const runHud = node("section", "typing-rpg__run-hud"); runHud.setAttribute("aria-label", "현재 진행"); runHud.append(progressCard, goldCard);

  const battlefield = node("div", "typing-rpg__battlefield");
  const arena = node("section", "typing-rpg__arena"); arena.setAttribute("aria-label", "몬스터 전투 상황");
  const enemyHead = node("div", "typing-rpg__enemy-head");
  const stageBadge = node("span", "typing-rpg__stage-badge");
  const enemyName = node("strong", "typing-rpg__enemy-name");
  const enemyHpText = node("span", "typing-rpg__enemy-hp-text"); enemyHead.append(stageBadge, enemyName, enemyHpText);
  const enemyMeter = pixelMeter("typing-rpg__enemy-meter", "몬스터 HP");
  const scene = node("div", "typing-rpg__scene");
  const hero = node("div", "typing-rpg__hero"); hero.setAttribute("aria-hidden", "true");
  const heroArt=pixelArt('','typing-rpg__hero-art',112,112),heroFallback=node('span','typing-rpg__art-fallback','⌨');hero.append(heroFallback,heroArt);
  wirePixelArt(heroArt,hero);setPixelArt(heroArt,hero,typingRpgHeroDuelArtPath(selectedCharacter.id),rpgCharacterArtPath(selectedCharacter.id));
  const bolt = pixelArt('/assets/pixel/illustrated/rpg/spell-attack.png','typing-rpg__bolt',48,48); bolt.setAttribute("aria-hidden", "true");
  const creature = node("div", "typing-rpg__monster"); creature.setAttribute("aria-hidden", "true");
  const creatureArt=pixelArt('','typing-rpg__monster-art',128,128),creatureFallback=node('span','typing-rpg__art-fallback','◆'),crown=node('span','typing-rpg__crown','♛');creature.append(crown,creatureFallback,creatureArt);
  wirePixelArt(creatureArt,creature);
  scene.append(hero, bolt, creature);
  const counter = node("div", "typing-rpg__counter");
  const counterText = node("span", "typing-rpg__counter-text");
  const counterTrack = node("span", "typing-rpg__counter-track"); const counterFill = node("i", "typing-rpg__counter-fill"); counterTrack.append(counterFill); counter.append(counterText, counterTrack);
  const enemyHud = node("section", "typing-rpg__enemy-hud"); enemyHud.setAttribute("aria-label", "몬스터 상태"); enemyHud.append(enemyHead, enemyMeter, counter);
  hud.append(playerHud, runHud, enemyHud);

  const command = node("section", "typing-rpg__command");
  const targetLabel = node("span", "typing-rpg__eyebrow", "이번 공격 주문");
  const targetText = node("div", "typing-rpg__target"); targetText.setAttribute("aria-live", "polite");
  const letterGuide = node("div", "typing-rpg__letters"); letterGuide.setAttribute("aria-hidden", "true");
  const form = node("form", "typing-rpg__form");
  const input = node("input", "typing-rpg__input"); input.type = "text"; input.autocomplete = "off"; input.spellcheck = false; input.enterKeyHint = "send"; input.placeholder = "문장을 그대로 입력"; input.setAttribute("aria-label", "공격 문장 입력");
  const submit = node("button", "typing-rpg__submit", "공격"); submit.type = "submit"; form.append(input, submit);
  const message = node("p", "typing-rpg__message", "처음 10초는 안전해요. 문장을 정확히 입력해 공격하세요."); message.setAttribute("aria-live", "polite");
  const healHint = node("p", "typing-rpg__heal-hint");
  const gearText = node("p", "typing-rpg__gear");
  const numbers = node("div", "typing-rpg__numbers");
  const comboText=node('span'),speedText = node("span"), accuracyText = node("span"), defeatedText = node("span"), completedText = node("span"); numbers.append(comboText,speedText, accuracyText, defeatedText, completedText);
  const details=node('details','typing-rpg__details'),detailsLabel=node('summary','', '전투 설명'),detailsContent=node('div','typing-rpg__details-content');
  const inputRule=node('p','typing-rpg__input-rule','입력·수정 중에는 HP가 줄지 않아요. 공격할 때 남아 있는 오타만 판정해요. 몬스터 반격은 시간이 끝나면 들어와요.');
  detailsContent.append(inputRule,gearText,numbers);details.append(detailsLabel,detailsContent);
  command.append(targetLabel, targetText, letterGuide, form, message, healHint, details);
  arena.append(hud, scene, command); battlefield.append(arena); root.append(battlefield); ctx.stage.append(root);
  const pauseButton=gameRoot?.querySelector('.dg-game__pause');if(pauseButton){pauseButton.classList.add('typing-rpg__pause');runHud.append(pauseButton);}

  const typingInput = createTypingInput(model);
  let composing = false;
  let reported = false;
  let effectMs = 0;
  let seenAction = -1;
  let warmedAfterStage = 0;
  let submittedTypoDamage = 0;

  function actionMessage(state) {
    const { type, amount } = state.lastAction;
    const messages = {
      ready: "반격 전까지 문장을 정확히 입력해 공격하세요.",
      type: `좋아요! MP가 차오르고 있어요.`,
      typo: `오타 ${amount}글자 · HP가 ${amount * RPG_RULES.typoDamage} 줄고 콤보가 끊겼어요.`,
      attack: `${amount} 피해! 다음 문장을 이어 입력하세요.`,
      "monster-down": `${amount} 피해! 다음 스테이지로 전진했어요.`,
      "boss-down": `${amount} 피해! 보스를 쓰러뜨리고 체크포인트를 열었어요!`,
      counter: `몬스터의 반격! HP가 ${amount} 줄었어요.`,
      "heal-draft": "회복 주문 준비 중 · ‘힐’을 완성하고 Enter를 누르세요.",
      heal: `회복 성공! HP를 ${amount} 회복했어요.`,
      "heal-invalid": "회복 주문은 정확히 ‘힐’이에요. Esc로 지울 수 있어요.",
      incomplete: submittedTypoDamage ? `공격 실패 · 확정한 오타로 HP ${submittedTypoDamage} 감소. 문장을 고쳐주세요.` : "아직 문장이 맞지 않아요. 표시된 글자를 확인하세요.",
      empty: "공격할 문장을 입력해 주세요.",
      clear: "입력을 지웠어요. 다시 차분히 시작하세요.",
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
    root.style.setProperty("--rpg-stage-color", state.palette);
    root.classList.toggle("is-boss", state.boss);
    setPixelArt(creatureArt,creature,typingRpgMonsterDuelArtPath(state.stage),rpgMonsterArtPath(state.stage));
    if(warmedAfterStage!==state.stage){warmedAfterStage=state.stage;void warmImage(typingRpgMonsterDuelArtPath(state.stage+1)).catch(()=>{});}
    updatePixelMeter(hpMeter, state.hp, state.maxHp); hpValue.textContent = `${state.hp} / ${state.maxHp}`;
    updatePixelMeter(mpMeter, state.mp, state.maxMp); mpValue.textContent = `${state.mp} / ${state.maxMp}`;
    progressValue.textContent = `${state.stage}`;goldValue.textContent=`${state.gold}`;
    stageBadge.textContent = state.boss ? `STAGE ${state.stage} · BOSS` : `STAGE ${state.stage}`;
    enemyName.textContent = rpgMonsterName(state.stage,state.boss);
    updatePixelMeter(enemyMeter, state.monsterHp, state.monsterMaxHp); enemyHpText.textContent = `${Math.max(0, state.monsterHp)} / ${state.monsterMaxHp}`;
    counterText.textContent = `반격까지 ${(state.counterMs / 1000).toFixed(1)}초`;
    counterText.title = `반격 피해 ${state.counterDamage}`;
    counterFill.style.width = `${state.counterMs / state.counterEveryMs * 100}%`;
    targetLabel.textContent = state.sentenceMode === "long" ? "긴 문장 · 공격 ×2" : "이번 공격 주문";
    targetText.textContent = state.healDraft ? "회복 주문: 힐" : state.target;
    renderLetters({...state,input:typingInput.draft});
    comboText.textContent=`콤보 ${Math.floor(state.combo)}`;speedText.textContent = `속도 ${state.speed}글자/분`; accuracyText.textContent = `정확도 ${state.accuracy.toFixed(1)}%`; defeatedText.textContent = `처치 ${state.defeated}`; completedText.textContent = `문장 ${state.completed}`;
    healHint.textContent = `MP 100이면 빈 입력창에 ‘힐’ + Enter · HP ${RPG_RULES.baseHeal + state.gear.heal} 회복 · Esc로 지우기`;
    gearText.textContent = `장비 효과 · 공격 +${state.gear.attack} · 방어 -${state.gear.defense} · 회복 +${state.gear.heal}`;
    healHint.classList.toggle("is-ready", state.mp === RPG_RULES.maxMp);
    if (state.actionSerial !== seenAction) {
      seenAction = state.actionSerial; message.textContent = actionMessage(state);
      root.classList.remove("is-attack", "is-hit", "is-heal");
      const effect = ["attack", "monster-down", "boss-down"].includes(state.lastAction.type) ? "is-attack" : ["typo", "counter"].includes(state.lastAction.type) ? "is-hit" : state.lastAction.type === "heal" ? "is-heal" : "";
      if (effect) { void root.offsetWidth; root.classList.add(effect); effectMs = 360; }
    }
    if(!state.finished && typingInput.draft!==state.input && !composing) message.textContent='입력 중 · 공격 전에 표시된 글자를 확인하세요.';
    input.disabled = state.finished; submit.disabled = state.finished;
    ctx.setStatus(`타이포 RPG · STAGE ${state.stage}${state.boss ? " BOSS" : ""} · ${state.score}점 · ${state.gold}골드`);
    if (state.finished && !reported) { reported = true; ctx.finish(model.getResult()); }
  }

  function commit() { submittedTypoDamage=0; typingInput.edit(input.value, { composing }); render(); }
  ctx.listen(input, "compositionstart", () => { composing = true; typingInput.edit(input.value,{composing:true}); });
  ctx.listen(input, "compositionend", () => { composing = false; commit(); });
  ctx.listen(input, "input", (event) => { if (!event.isComposing) commit(); });
  ctx.listen(input, "keydown", (event) => {
    if(event.key === "Enter" && (composing || event.isComposing || event.keyCode === 229)){event.preventDefault();return;}
    if (event.key !== "Escape") return;
    event.preventDefault(); composing = false; input.value = ""; submittedTypoDamage=0; typingInput.clear(); render();
  });
  ctx.listen(form, "submit", (event) => {
    event.preventDefault();
    if (composing || ctx.isFinished()) return;
    typingInput.edit(input.value);
    const outcome = typingInput.submit();
    submittedTypoDamage=outcome.inputDamage||0;
    if (["boss-down", "monster-down"].includes(outcome.type) && ctx.checkpoint) {
      try { Promise.resolve(ctx.checkpoint(model.getProgress())).catch(() => {}); } catch { /* A failed optional save must not pause combat. */ }
    }
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
    getState: () => ({ ...model.getState(), draft: typingInput.draft, composing }),
    destroy() { gameRoot?.classList.remove("dg-game--typing-rpg"); },
  };
}
