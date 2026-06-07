const {
  createDeck, dealCards, sortHand,
  validatePlay, findFirstPlayer, getRoleForPosition,
} = require('../src/game/engine');

describe('createDeck', () => {
  test('tiene 52 cartas', () => {
    expect(createDeck()).toHaveLength(52);
  });
  test('sin duplicados', () => {
    const deck = createDeck();
    const ids = deck.map(c => c.id);
    expect(new Set(ids).size).toBe(52);
  });
});

describe('dealCards', () => {
  test('reparte todas las cartas entre 4 jugadores', () => {
    const hands = dealCards(4);
    const total = hands.reduce((s, h) => s + h.length, 0);
    expect(total).toBe(52);
  });
  test('reparte todas las cartas entre 3 jugadores', () => {
    const hands = dealCards(3);
    const total = hands.reduce((s, h) => s + h.length, 0);
    expect(total).toBe(52);
  });
});

describe('findFirstPlayer', () => {
  test('encuentra al jugador con el 3 de oros', () => {
    const hands = dealCards(4);
    const idx = findFirstPlayer(hands);
    expect(hands[idx].some(c => c.rank === '3' && c.suit === 'oros')).toBe(true);
  });
});

describe('validatePlay', () => {
  const makeCard = (rank, suit) => ({ rank, suit, id: `${rank}_${suit}` });

  test('primera jugada válida con 3', () => {
    const result = validatePlay(
      [makeCard('3', 'copas')], [], null, true, false
    );
    expect(result.valid).toBe(true);
  });

  test('primera jugada sin 3 → inválida', () => {
    const result = validatePlay(
      [makeCard('5', 'copas')], [], null, true, false
    );
    expect(result.valid).toBe(false);
  });

  test('supera la mesa → válido', () => {
    const result = validatePlay(
      [makeCard('7', 'oros')],
      [makeCard('5', 'oros')],
      1, false, false
    );
    expect(result.valid).toBe(true);
  });

  test('no supera la mesa → inválido', () => {
    const result = validatePlay(
      [makeCard('4', 'oros')],
      [makeCard('7', 'oros')],
      1, false, false
    );
    expect(result.valid).toBe(false);
  });

  test('AS limpia la mesa', () => {
    const result = validatePlay(
      [makeCard('A', 'copas')],
      [makeCard('K', 'oros')],
      1, false, false
    );
    expect(result.valid).toBe(true);
    expect(result.clearsTable).toBe(true);
  });

  test('no se puede mezclar A con 2', () => {
    const result = validatePlay(
      [makeCard('A', 'oros'), makeCard('2', 'copas')],
      [], null, false, false
    );
    expect(result.valid).toBe(false);
  });

  test('AS de espadas siempre corta', () => {
    const result = validatePlay(
      [makeCard('A', 'espadas')],
      [makeCard('A', 'copas'), makeCard('A', 'oros')],
      2, false, false
    );
    expect(result.valid).toBe(true);
    expect(result.clearsTable).toBe(true);
  });
});

describe('getRoleForPosition', () => {
  test('posición 0 = presidente', () => {
    expect(getRoleForPosition(0, 4)).toBe('presidente');
  });
  test('última posición = culo', () => {
    expect(getRoleForPosition(3, 4)).toBe('culo');
    expect(getRoleForPosition(4, 5)).toBe('culo');
  });
  test('con 5 jugadores, posición 1 = vicepresidente', () => {
    expect(getRoleForPosition(1, 5)).toBe('vicepresidente');
  });
  test('con 5 jugadores, posición 3 = viceculo', () => {
    expect(getRoleForPosition(3, 5)).toBe('viceculo');
  });
});
