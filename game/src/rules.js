// rules.js — the pure rules of Ember Pact. No DOM here, so Node can run it
// headlessly: the test harness imports this file and plays whole games.
//
// The duel: you and Vex, the Ember Warden, each start with 24 Flame (life).
// Every round both sides play one card from a hand of three, face down, then
// reveal together. The higher effective power wins the clash and deals
// damage equal to the gap plus one (at least 2). Equal power: a harmless
// damage. The first side to reach 0 Flame loses; after round 15 the side
// with more Flame wins, and a tie goes to sudden death.
//
// Effective power = value
//   + 3 element advantage (Ember beats Grove, Grove beats Tide, Tide beats Ember)
//   + 2 resonance (playing the same suit as your previous round's card)
//   + 2 for a Surge card (Ember 8), which costs its owner 2 Flame to play.
// Stone cards are Wards: lose a clash with one and you take no damage.
// Tide 7 (Mend) heals its owner 4 Flame when played. Grove 8 (Bloom) draws
// an extra card after the round.

import { buildDeck, shuffleDeck, drawCard, suitBeats, SUITS } from './deck.js';

export const START_FLAME = 24;
export const HAND_SIZE = 3;
export const ROUND_LIMIT = 15;
export const ADVANTAGE_BONUS = 3;
export const RESONANCE_BONUS = 2;
export const SURGE_BONUS = 2;
export const SURGE_COST = 2;
export const MEND_HEAL = 4;

export function createGame(random = Math.random) {
  const deck = shuffleDeck(buildDeck(), random);
  const state = {
    random,
    deck,
    discard: [],
    round: 1,
    phase: 'title', // title | playing | reveal | over
    player: { flame: START_FLAME, hand: [], lastSuit: null, wins: 0, damageDealt: 0, extraDraw: 0 },
    ai: { flame: START_FLAME, hand: [], lastSuit: null, wins: 0, damageDealt: 0, extraDraw: 0 },
    lastClash: null,
    winner: null, // 'player' | 'ai' | 'draw'
    log: [],
  };
  for (let i = 0; i < HAND_SIZE; i++) {
    state.player.hand.push(drawCard(state));
    state.ai.hand.push(drawCard(state));
  }
  return state;
}

export function effectivePower(card, ownLastSuit, foeCard) {
  let power = card.value;
  const notes = [];
  if (foeCard && suitBeats(card.suit, foeCard.suit)) {
    power += ADVANTAGE_BONUS;
    notes.push('advantage');
  }
  if (ownLastSuit && card.suit === ownLastSuit) {
    power += RESONANCE_BONUS;
    notes.push('resonance');
  }
  if (card.ability === 'surge') {
    power += SURGE_BONUS;
    notes.push('surge');
  }
  return { power, notes };
}

export function removeFromHand(side, cardId) {
  const i = side.hand.findIndex((c) => c.id === cardId);
  if (i === -1) return null;
  return side.hand.splice(i, 1)[0];
}

// Play one full round. Returns the clash report the renderer narrates.
export function playRound(state, playerCardId, aiCardId) {
  const playerCard = removeFromHand(state.player, playerCardId);
  const aiCard = removeFromHand(state.ai, aiCardId);
  if (!playerCard || !aiCard) throw new Error('playRound: a chosen card was not in its hand');

  const p = effectivePower(playerCard, state.player.lastSuit, aiCard);
  const a = effectivePower(aiCard, state.ai.lastSuit, playerCard);

  const clash = {
    round: state.round,
    playerCard, aiCard,
    playerPower: p.power, aiPower: a.power,
    playerNotes: p.notes, aiNotes: a.notes,
    damageToAi: 0, damageToPlayer: 0,
    blockedByWard: false,
    healed: { player: 0, ai: 0 },
    text: '',
  };

  // Surge costs Flame the moment the card is played.
  if (playerCard.ability === 'surge') state.player.flame -= SURGE_COST;
  if (aiCard.ability === 'surge') state.ai.flame -= SURGE_COST;
  // Mend heals the moment the card is played.
  if (playerCard.ability === 'mend') {
    clash.healed.player = MEND_HEAL;
    state.player.flame = Math.min(START_FLAME, state.player.flame + MEND_HEAL);
  }
  if (aiCard.ability === 'mend') {
    clash.healed.ai = MEND_HEAL;
    state.ai.flame = Math.min(START_FLAME, state.ai.flame + MEND_HEAL);
  }

  if (p.power > a.power) {
    // The winner deals the power gap plus 1, so duels end in a quench
    // instead of dragging to the round limit.
    let damage = Math.max(2, p.power - a.power + 1);
    if (aiCard.ability === 'ward') { damage = 0; clash.blockedByWard = true; }
    clash.damageToAi = damage;
    state.ai.flame -= damage;
    state.player.damageDealt += damage;
    state.player.wins += 1;
    clash.text = damage === 0
      ? `${playerCard.name} wins the clash — but Vex's ${aiCard.name} Ward absorbs it all!`
      : `${playerCard.name} (${p.power}) overpowers ${aiCard.name} (${a.power}) for ${damage} damage!`;
  } else if (a.power > p.power) {
    let damage = Math.max(2, a.power - p.power + 1);
    if (playerCard.ability === 'ward') { damage = 0; clash.blockedByWard = true; }
    clash.damageToPlayer = damage;
    state.player.flame -= damage;
    state.ai.damageDealt += damage;
    state.ai.wins += 1;
    clash.text = damage === 0
      ? `${aiCard.name} wins the clash — but your ${playerCard.name} Ward absorbs it all!`
      : `${aiCard.name} (${a.power}) overpowers ${playerCard.name} (${p.power}) for ${damage} damage!`;
  } else {
    clash.text = `Equal power (${p.power}) — the cards spark and fizzle. No damage.`;
  }

  state.player.lastSuit = playerCard.suit;
  state.ai.lastSuit = aiCard.suit;
  state.discard.push(playerCard, aiCard);
  state.lastClash = clash;
  state.log.push(clash.text);

  // Bloom draws an extra card after the round.
  const pDraws = HAND_SIZE - state.player.hand.length + (playerCard.ability === 'bloom' ? 1 : 0);
  const aDraws = HAND_SIZE - state.ai.hand.length + (aiCard.ability === 'bloom' ? 1 : 0);
  for (let i = 0; i < pDraws; i++) {
    const c = drawCard(state);
    if (c && state.player.hand.length < 5) state.player.hand.push(c);
  }
  for (let i = 0; i < aDraws; i++) {
    const c = drawCard(state);
    if (c && state.ai.hand.length < 5) state.ai.hand.push(c);
  }

  state.round += 1;
  checkEnd(state);
  return clash;
}

export function checkEnd(state) {
  if (state.phase === 'over') return;
  const pDead = state.player.flame <= 0;
  const aDead = state.ai.flame <= 0;
  if (pDead && aDead) {
    state.winner = state.player.damageDealt >= state.ai.damageDealt ? 'player' : 'ai';
  } else if (aDead) {
    state.winner = 'player';
  } else if (pDead) {
    state.winner = 'ai';
  } else if (state.round > ROUND_LIMIT) {
    // Past the round limit: more Flame wins; a tie plays sudden death.
    if (state.player.flame !== state.ai.flame) {
      state.winner = state.player.flame > state.ai.flame ? 'player' : 'ai';
    }
  }
  if (state.winner) {
    state.phase = 'over';
    state.player.flame = Math.max(0, state.player.flame);
    state.ai.flame = Math.max(0, state.ai.flame);
  }
}

export function suitColor(suit) {
  return SUITS[suit].color;
}

export function describeCard(card) {
  const suit = SUITS[card.suit];
  let text = `${card.name} — ${suit.name} ${card.value}`;
  if (card.ability === 'surge') text += ' · Surge: +2 power, costs 2 Flame';
  if (card.ability === 'mend') text += ' · Mend: heals 4 Flame';
  if (card.ability === 'bloom') text += ' · Bloom: draws an extra card';
  if (card.ability === 'ward') text += ' · Ward: takes no damage if it loses';
  return text;
}
