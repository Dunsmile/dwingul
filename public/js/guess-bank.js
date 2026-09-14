import {guessBank as previousBank,hangulInitials} from './guess-bank-v8.js';
import {guessHintFor} from './guess-hints.js';

export {hangulInitials};

export const guessBank=previousBank.map(question=>({
  ...question,
  hint:guessHintFor(question.id),
}));
