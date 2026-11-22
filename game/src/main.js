// main.js — boots Ember Pact, runs the duel's screens and turns, and wires
// keyboard + mouse input. The rules live in rules.js, Vex in ai.js, and all
// drawing in render.js; this file only moves the game from screen to screen.

import { createGame, playRound, START_FLAME } from './rules.js';
import { aiTelegraph, chooseAiCard, AI_NAME } from './ai.js';
import {
  buildTableShell, renderFlames, renderHands, renderTell,
  renderClash, clearClash, buildOverlay,
} from './render.js';

const REVEAL_MS = 1400;

let state = createGame();
let table = null;
let overlay = null;
let telegraph = null;
let busy = false;

function showOverlay(kind) {
  hideOverlay();
  overlay = buildOverlay(kind, state);
  document.body.appendChild(overlay);
  const btn = overlay.querySelector('button');
  btn.addEventListener('click', () => startDuel());
  btn.focus();
}

function hideOverlay() {
  if (overlay) { overlay.remove(); overlay = null; }
}

function refresh() {
  renderFlames(table, state);
  renderHands(table, state, onPlayCard);
}

function startDuel() {
  hideOverlay();
  state = createGame();
  state.phase = 'playing';
  telegraph = aiTelegraph(state);
  renderTell(table, telegraph);
  clearClash(table);
  refresh();
  document.querySelector('.clash-text').textContent =
    `${AI_NAME} is waiting. Read her tell, then play a card.`;
}

function onPlayCard(cardId) {
  if (busy || state.phase !== 'playing') return;
  if (!state.player.hand.some((c) => c.id === cardId)) return;
  busy = true;

  const aiCard = chooseAiCard(state);
  const clash = playRound(state, cardId, aiCard.id);
  renderClash(table, clash);
  refresh();

  if (state.phase === 'over') {
    window.setTimeout(() => {
      busy = false;
      showOverlay(state.winner === 'player' ? 'win' : 'loss');
      refresh();
    }, REVEAL_MS + 600);
    return;
  }
  window.setTimeout(() => {
    telegraph = aiTelegraph(state);
    renderTell(table, telegraph);
    clearClash(table);
    refresh();
    busy = false;
  }, REVEAL_MS);
}

function onKey(event) {
  if (event.key === 'Enter') {
    if (overlay) { startDuel(); return; }
  }
  if (state.phase !== 'playing' || busy) return;
  const index = ['1', '2', '3', '4', '5'].indexOf(event.key);
  if (index !== -1 && state.player.hand[index]) onPlayCard(state.player.hand[index].id);
}

function boot() {
  document.title = 'Ember Pact — a duel of four suits';
  table = buildTableShell();
  document.body.appendChild(table);
  state.phase = 'title';
  refresh();
  showOverlay('title');
  document.addEventListener('keydown', onKey);
}

boot();
