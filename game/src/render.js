// render.js — everything the player sees: the moody table, the cards, the
// flip-and-snap clash animation, and the title / win / loss screens.
// Cards are DOM elements: a cream face, a coloured suit banner, a big suit
// glyph (shape AND colour, never text alone), a readable value, a name, and
// an ability line. Animations are pure CSS transitions.

import { SUITS, describeCard } from './deck.js';
import { START_FLAME } from './rules.js';

export const FLAME_MAX = START_FLAME;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

// One playing card, face up. opts: { playable, selected, faceDown, small }
export function buildCardElement(card, opts = {}) {
  const suit = SUITS[card.suit];
  const node = el('div', 'card suit-' + card.suit);
  if (opts.playable) node.classList.add('playable');
  if (opts.selected) node.classList.add('selected');
  if (opts.small) node.classList.add('small');
  if (opts.faceDown) {
    node.classList.add('face-down');
    node.appendChild(el('div', 'card-back', '✦'));
    node.setAttribute('aria-label', 'Face-down card');
    return node;
  }
  const top = el('div', 'card-top');
  top.appendChild(el('span', 'card-value', String(card.value)));
  top.appendChild(el('span', 'card-glyph', suit.glyph));
  const art = el('div', 'card-art');
  art.appendChild(el('span', 'card-big-glyph', suit.glyph));
  const name = el('div', 'card-name', card.name);
  const suitLine = el('div', 'card-suit', suit.name);
  node.append(top, art, name, suitLine);
  if (card.ability) {
    const ab = el('div', 'card-ability', abilityLabel(card.ability));
    node.appendChild(ab);
  }
  node.style.setProperty('--suit', suit.color);
  node.style.setProperty('--suit-dark', suit.dark);
  node.title = describeCard(card);
  node.setAttribute('aria-label', describeCard(card));
  node.dataset.cardId = card.id;
  return node;
}

export function abilityLabel(ability) {
  return {
    surge: 'SURGE +2 · costs 2 Flame',
    mend: 'MEND heals 4 Flame',
    bloom: 'BLOOM draws +1 card',
    ward: 'WARD blocks all damage',
  }[ability] ?? '';
}

function flameBar(side, label) {
  const wrap = el('div', 'flame-wrap');
  wrap.appendChild(el('span', 'flame-label', label));
  const bar = el('div', 'flame-bar');
  const fill = el('div', 'flame-fill');
  const num = el('span', 'flame-num', `${side.flame} / ${FLAME_MAX}`);
  bar.appendChild(fill);
  wrap.append(bar, num);
  wrap._fill = fill;
  wrap._num = num;
  return wrap;
}

export function buildTableShell() {
  const table = el('div', 'table');
  table.id = 'table';

  const header = el('header', 'table-header');
  header.appendChild(el('h1', 'game-title', 'EMBER PACT'));
  header.appendChild(el('p', 'game-sub', 'A duel of four suits · first to quench the other’s Flame'));

  const aiRow = el('div', 'side-row ai-row');
  aiRow.appendChild(el('div', 'side-name', 'Vex, the Ember Warden'));
  const aiFlame = flameBar({ flame: START_FLAME }, 'Flame');
  aiRow.appendChild(aiFlame);
  const aiHand = el('div', 'hand ai-hand');
  aiRow.appendChild(aiHand);

  const middle = el('div', 'middle');
  const clashZone = el('div', 'clash-zone');
  clashZone.appendChild(el('div', 'clash-label', 'THE PACT TABLE'));
  const clashCards = el('div', 'clash-cards');
  clashZone.appendChild(clashCards);
  const clashText = el('div', 'clash-text', 'Play a card to begin the duel.');
  const tell = el('div', 'tell');
  middle.append(clashZone, clashText, tell);

  const playerRow = el('div', 'side-row player-row');
  playerRow.appendChild(el('div', 'side-name', 'You'));
  const playerFlame = flameBar({ flame: START_FLAME }, 'Flame');
  playerRow.appendChild(playerFlame);
  const playerHand = el('div', 'hand player-hand');
  playerRow.appendChild(playerHand);

  const footer = el('footer', 'table-footer');
  const round = el('span', 'round-label', 'Round 1 / 15');
  const score = el('span', 'score-label', 'Damage dealt — You 0 · Vex 0');
  const hint = el('span', 'hint-label', 'Click a card or press 1–3 to play it');
  footer.append(round, score, hint);

  table.append(header, aiRow, middle, playerRow, footer);
  table._refs = { aiHand, playerHand, clashCards, clashText, tell, round, score, aiFlame, playerFlame };
  return table;
}

export function renderFlames(table, state) {
  const set = (wrap, flame) => {
    wrap._fill.style.width = `${Math.max(0, (flame / FLAME_MAX) * 100)}%`;
    wrap._num.textContent = `${Math.max(0, flame)} / ${FLAME_MAX}`;
    wrap._fill.classList.toggle('low', flame <= 8);
  };
  set(table._refs.aiFlame, state.ai.flame);
  set(table._refs.playerFlame, state.player.flame);
  table._refs.round.textContent = state.phase === 'over'
    ? `Duel over · ${state.round - 1} rounds`
    : `Round ${state.round} / 15`;
  table._refs.score.textContent =
    `Damage dealt — You ${state.player.damageDealt} · Vex ${state.ai.damageDealt}   ·   Rounds won — You ${state.player.wins} · Vex ${state.ai.wins}`;
}

export function renderHands(table, state, onPlay) {
  const refs = table._refs;
  refs.aiHand.replaceChildren();
  for (const card of state.ai.hand) {
    refs.aiHand.appendChild(buildCardElement(card, { faceDown: true, small: true }));
  }
  refs.playerHand.replaceChildren();
  state.player.hand.forEach((card, i) => {
    const node = buildCardElement(card, { playable: state.phase === 'playing', small: false });
    node.addEventListener('click', () => onPlay(card.id));
    node.dataset.key = String(i + 1);
    const key = el('span', 'card-key', String(i + 1));
    node.appendChild(key);
    refs.playerHand.appendChild(node);
  });
}

export function renderTell(table, telegraph) {
  const tell = table._refs.tell;
  if (!telegraph) { tell.textContent = ''; tell.className = 'tell'; return; }
  const suit = SUITS[telegraph.suit];
  tell.className = 'tell tell-' + telegraph.suit;
  tell.innerHTML = '';
  tell.appendChild(el('span', 'tell-glyph', suit.glyph));
  tell.appendChild(el('span', 'tell-line', telegraph.line));
  tell.appendChild(el('span', 'tell-taunt', telegraph.taunt));
}

export function renderClash(table, clash) {
  const refs = table._refs;
  refs.clashCards.replaceChildren();
  const mine = buildCardElement(clash.playerCard, { small: false });
  mine.classList.add('clash-card', 'dealt');
  const theirs = buildCardElement(clash.aiCard, { small: false });
  theirs.classList.add('clash-card', 'dealt');
  const vs = el('div', 'versus', '⚔');
  refs.clashCards.append(mine, vs, theirs);
  refs.clashText.textContent = clash.text;
  refs.clashText.classList.remove('flash');
  void refs.clashText.offsetWidth; // restart the animation
  refs.clashText.classList.add('flash');
}

export function clearClash(table) {
  table._refs.clashCards.replaceChildren();
  table._refs.clashText.textContent = 'Play a card to begin the duel.';
}

// Full-screen overlay: title, win or loss. kind: 'title' | 'win' | 'loss'.
export function buildOverlay(kind, state) {
  const overlay = el('div', `overlay overlay-${kind}`);
  const panel = el('div', 'overlay-panel');
  if (kind === 'title') {
    panel.appendChild(el('h1', 'overlay-title', 'EMBER PACT'));
    panel.appendChild(el('p', 'overlay-tag', 'A duel of four suits beneath the braziers'));
    const suits = el('div', 'overlay-suits');
    for (const key of Object.keys(SUITS)) {
      const s = SUITS[key];
      const chip = el('div', 'suit-chip suit-' + key);
      chip.appendChild(el('span', 'suit-chip-glyph', s.glyph));
      chip.appendChild(el('span', 'suit-chip-name', s.name));
      chip.appendChild(el('span', 'suit-chip-beats', s.beats ? `beats ${SUITS[s.beats].name}` : 'Ward · blocks damage'));
      suits.appendChild(chip);
    }
    panel.appendChild(suits);
    const how = el('div', 'how-to');
    how.innerHTML =
      '<p>Each round, play one card. Higher power wins the clash and deals the gap as damage.</p>' +
      '<p>Element advantage +3 · same suit twice in a row +2 · Stone cards Ward all damage.</p>' +
      '<p>First to quench the other’s Flame wins. Vex telegraphs her lean — read her, then counter her.</p>';
    panel.appendChild(how);
    const btn = el('button', 'big-button', 'BEGIN THE DUEL');
    btn.id = 'start-button';
    panel.appendChild(btn);
    panel.appendChild(el('p', 'overlay-hint', 'Click a card or press 1–3 to play · Enter to start'));
  } else {
    const won = kind === 'win';
    panel.appendChild(el('h1', 'overlay-title', won ? 'THE PACT IS YOURS' : 'YOUR FLAME IS QUENCHED'));
    panel.appendChild(el('p', 'overlay-tag', won
      ? 'Vex bows. The braziers burn for you.'
      : 'Vex claims the table. The embers fade.'));
    const finalScore = el('div', 'final-score',
      `Final Flame — You ${Math.max(0, state.player.flame)} · Vex ${Math.max(0, state.ai.flame)}`);
    panel.appendChild(finalScore);
    const stats = el('div', 'final-stats',
      `Rounds: ${state.round - 1} · Damage dealt — You ${state.player.damageDealt} · Vex ${state.ai.damageDealt} · Rounds won — You ${state.player.wins} · Vex ${state.ai.wins}`);
    panel.appendChild(stats);
    const btn = el('button', 'big-button', 'PLAY AGAIN');
    btn.id = 'restart-button';
    panel.appendChild(btn);
    panel.appendChild(el('p', 'overlay-hint', 'Press Enter to play again'));
  }
  overlay.appendChild(panel);
  return overlay;
}
