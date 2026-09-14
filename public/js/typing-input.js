// A browser may deliver Korean pre-edit text without composition flags. Keep
// edits separate from combat: only a confirmed attack can penalize a typo.
export function createTypingInput(model) {
  let draft = '', composing = false;
  const healParts = new Set(['ㅎ', '히', '힐']);
  return {
    get draft() { return draft; },
    get composing() { return composing; },
    edit(value, options = {}) {
      draft = String(value ?? '').normalize('NFC');
      composing = Boolean(options.composing);
      model.captureDraft(draft);
      if (composing) return {type:'composing'};
      const state = model.getState();
      const healing = state.healDraft || (!state.input && state.mp === state.maxMp && healParts.has(draft));
      // Confirmed correct prefixes still charge MP immediately. Other edits
      // remain a draft, including 받침 moving to the next Korean syllable.
      if (state.target.startsWith(draft) || healing) return model.commitInput(draft);
      return {type:'draft'};
    },
    submit() {
      if (composing) return {type:'composing'};
      const result = model.confirmInput(draft);
      draft = model.getState().input;
      return result;
    },
    clear() {
      draft = ''; composing = false;
      return model.clearInput();
    },
  };
}
