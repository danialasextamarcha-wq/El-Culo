/**
 * El Culo - Motor de cartas
 * Toda la lógica de baraja, manos, jugadas y validaciones.
 */

const SUITS = ['oros', 'copas', 'espadas', 'bastos'];
const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

// Valor numérico para comparar cartas (mayor = más fuerte)
// 3 < 4 < ... < K < A < 2
const RANK_VALUE = {};
RANKS.forEach((r, i) => { RANK_VALUE[r] = i; });

// Prioridad de palos para desempate (A de oros es el más fuerte)
const SUIT_PRIORITY = { oros: 4, copas: 3, espadas: 2, bastos: 1 };

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, id: `${rank}_${suit}` });
    }
  }
  return deck;
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function dealCards(playerCount) {
  const deck = shuffle(createDeck());
  const hands = Array.from({ length: playerCount }, () => []);
  deck.forEach((card, i) => hands[i % playerCount].push(card));
  return hands;
}

function cardValue(card) {
  return RANK_VALUE[card.rank];
}

function compareCards(a, b) {
  if (cardValue(a) !== cardValue(b)) return cardValue(a) - cardValue(b);
  return SUIT_PRIORITY[a.suit] - SUIT_PRIORITY[b.suit];
}

function sortHand(hand) {
  return [...hand].sort(compareCards);
}

function isAce(card) { return card.rank === 'A'; }
function isTwo(card) { return card.rank === '2'; }
function isJoker(card) { return card.rank === 'JOKER'; }

/**
 * Valida si una jugada es legal dado el estado actual de la mesa.
 * @param {Array} playedCards - cartas que quiere jugar el jugador
 * @param {Array} tableCards  - cartas actualmente en la mesa (última jugada)
 * @param {number} quantity   - cuántas cartas hay que jugar (null = libre)
 * @param {boolean} isFirstTurn - si es el primer turno de la partida
 * @param {boolean} isCuloTurn  - si el jugador que empieza es el culo
 * @returns {{ valid: boolean, reason?: string, clearsTable?: boolean }}
 */
function validatePlay(playedCards, tableCards, quantity, isFirstTurn, isCuloTurn) {
  if (!playedCards || playedCards.length === 0) {
    return { valid: false, reason: 'Debes jugar al menos una carta' };
  }

  // Primera jugada: debe incluir un 3
  if (isFirstTurn) {
    const hasThree = playedCards.some(c => c.rank === '3');
    if (!hasThree) return { valid: false, reason: 'La primera jugada debe incluir un 3' };
  }

  // No mezclar AS con 2
  const hasAce = playedCards.some(isAce);
  const hasTwo = playedCards.some(isTwo);
  if (hasAce && hasTwo) {
    return { valid: false, reason: 'No puedes combinar AS con 2' };
  }

  // Todas las cartas deben ser del mismo rango efectivo (salvo comodines y 2)
  const nonSpecial = playedCards.filter(c => !isTwo(c) && !isJoker(c));
  if (nonSpecial.length > 0) {
    const baseRank = nonSpecial[0].rank;
    if (nonSpecial.some(c => c.rank !== baseRank)) {
      return { valid: false, reason: 'Todas las cartas deben ser del mismo número' };
    }
  }

  // AS de picas puede cortar cualquier combinación
  const aceOfSpades = playedCards.find(c => isAce(c) && c.suit === 'espadas');

  // Si la mesa está vacía, cualquier jugada válida pasa
  if (!tableCards || tableCards.length === 0) {
    return { valid: true, clearsTable: hasAce };
  }

  // La cantidad de cartas debe coincidir (salvo AS de picas)
  if (!aceOfSpades && playedCards.length !== tableCards.length) {
    return {
      valid: false,
      reason: `Debes jugar ${tableCards.length} carta(s)`,
    };
  }

  // AS de picas corta siempre
  if (aceOfSpades) {
    return { valid: true, clearsTable: true };
  }

  // El rango de la jugada debe ser mayor que el de la mesa
  const tableRank = tableCards[0].rank;
  const playRank = nonSpecial.length > 0 ? nonSpecial[0].rank : (hasTwo ? '2' : null);

  if (playRank === null) {
    return { valid: false, reason: 'Jugada inválida' };
  }

  if (RANK_VALUE[playRank] <= RANK_VALUE[tableRank]) {
    return { valid: false, reason: 'Debes superar las cartas de la mesa' };
  }

  // Si es AS (no de picas), limpia la mesa
  if (hasAce) {
    return { valid: true, clearsTable: true };
  }

  return { valid: true, clearsTable: false };
}

/**
 * Calcula el intercambio de cartas al inicio de cada ronda.
 */
function calculateExchange(players, playerCount) {
  // players: array ordenado por posición [0=presidente, ..., n-1=culo]
  const exchanges = [];

  if (playerCount === 5) {
    const presidente = players[0];
    const vice      = players[1];
    const viceculo  = players[3];
    const culo      = players[4];

    // Presidente recibe 2 mejores del culo
    const culoGive = sortHand(culo.hand).slice(-2);
    const presGive = sortHand(presidente.hand).slice(0, 2);
    exchanges.push({ from: culo.userId, to: presidente.userId, cards: culoGive, receives: presGive });

    // Vicepresidente recibe 1 mejor del viceculo
    const viceCuloGive = [sortHand(viceculo.hand).slice(-1)[0]];
    const viceGive     = [sortHand(vice.hand).slice(0, 1)[0]];
    exchanges.push({ from: viceculo.userId, to: vice.userId, cards: viceCuloGive, receives: viceGive });

  } else if (playerCount >= 3) {
    const presidente = players[0];
    const culo       = players[playerCount - 1];

    const culoGive = [sortHand(culo.hand).slice(-1)[0]];
    const presGive = [sortHand(presidente.hand).slice(0, 1)[0]];
    exchanges.push({ from: culo.userId, to: presidente.userId, cards: culoGive, receives: presGive });
  }

  return exchanges;
}

/**
 * Determina el rol según la posición final.
 */
function getRoleForPosition(position, totalPlayers) {
  if (position === 0) return 'presidente';
  if (position === 1 && totalPlayers === 5) return 'vicepresidente';
  if (position === totalPlayers - 1) return 'culo';
  if (position === totalPlayers - 2 && totalPlayers === 5) return 'viceculo';
  return 'neutro';
}

/**
 * Busca el jugador que tiene el 3 de oros.
 */
function findFirstPlayer(hands) {
  for (let i = 0; i < hands.length; i++) {
    if (hands[i].some(c => c.rank === '3' && c.suit === 'oros')) return i;
  }
  return 0;
}

module.exports = {
  createDeck,
  shuffle,
  dealCards,
  sortHand,
  validatePlay,
  calculateExchange,
  getRoleForPosition,
  findFirstPlayer,
  compareCards,
  cardValue,
  isAce,
  isTwo,
  RANK_VALUE,
  SUIT_PRIORITY,
};
