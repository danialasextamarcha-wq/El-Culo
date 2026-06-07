const { v4: uuidv4 } = require('uuid');
const {
  dealCards, sortHand, validatePlay, calculateExchange,
  getRoleForPosition, findFirstPlayer,
} = require('./engine');

/**
 * Estados de una partida:
 *  waiting → exchange → playing → round_end → exchange → playing → ... → game_end
 */

class GameManager {
  constructor() {
    // gameId -> gameState
    this.games = new Map();
  }

  createGame(gameId, players, customRules = {}) {
    const playerCount = players.length;
    const hands = dealCards(playerCount);
    const firstPlayerIdx = findFirstPlayer(hands);

    const state = {
      gameId,
      phase: 'playing', // waiting | exchange | playing | round_end | social_exchange | game_end
      round: 1,
      playerCount,
      players: players.map((p, i) => ({
        userId: p.userId,
        nickname: p.nickname,
        hand: hands[i],
        position: null,       // posición final de la ronda
        role: null,
        finishedOrder: null,  // orden en que se quedó sin cartas
        connected: true,
      })),
      finishOrder: [],         // userId[] en orden de quedarse sin cartas
      currentPlayerIdx: firstPlayerIdx,
      tableCards: [],          // cartas en mesa (última jugada)
      lastPlayedBy: null,
      passCount: 0,
      isFirstTurn: true,
      customRules,
      log: [],
      startedAt: Date.now(),
    };

    this.games.set(gameId, state);
    return this._sanitizeState(state);
  }

  getState(gameId) {
    return this.games.get(gameId) || null;
  }

  /**
   * Procesa la jugada de un jugador.
   * @returns {{ ok: boolean, event: string, payload: any }}
   */
  playCards(gameId, userId, cardIds) {
    const state = this.games.get(gameId);
    if (!state) return this._err('Partida no encontrada');
    if (state.phase !== 'playing') return this._err('No es momento de jugar');

    const player = state.players[state.currentPlayerIdx];
    if (player.userId !== userId) return this._err('No es tu turno');

    const playedCards = cardIds.map(id => player.hand.find(c => c.id === id)).filter(Boolean);
    if (playedCards.length !== cardIds.length) return this._err('Carta(s) inválida(s)');

    const result = validatePlay(
      playedCards,
      state.tableCards,
      state.tableCards.length || null,
      state.isFirstTurn,
      false
    );

    if (!result.valid) return this._err(result.reason);

    // Quitar cartas de la mano
    player.hand = player.hand.filter(c => !cardIds.includes(c.id));

    this._log(state, userId, 'play', { cards: playedCards });

    // ¿Limpió la mesa?
    if (result.clearsTable) {
      state.tableCards = [];
      state.lastPlayedBy = userId;
      state.passCount = 0;
      state.isFirstTurn = false;

      // El jugador que limpió puede volver a jugar si tiene cartas
      if (player.hand.length === 0) {
        return this._playerFinished(state, player);
      }

      return {
        ok: true, event: 'table_cleared',
        payload: { userId, cards: playedCards, nextPlayer: this._currentPlayerInfo(state) },
      };
    }

    state.tableCards = playedCards;
    state.lastPlayedBy = userId;
    state.passCount = 0;
    state.isFirstTurn = false;

    if (player.hand.length === 0) {
      return this._playerFinished(state, player);
    }

    this._advanceTurn(state);

    return {
      ok: true, event: 'cards_played',
      payload: {
        userId, cards: playedCards,
        tableCards: state.tableCards,
        nextPlayer: this._currentPlayerInfo(state),
      },
    };
  }

  pass(gameId, userId) {
    const state = this.games.get(gameId);
    if (!state) return this._err('Partida no encontrada');
    if (state.phase !== 'playing') return this._err('No es momento de pasar');

    const player = state.players[state.currentPlayerIdx];
    if (player.userId !== userId) return this._err('No es tu turno');
    if (state.tableCards.length === 0) return this._err('No puedes pasar con la mesa vacía');

    state.passCount++;
    this._log(state, userId, 'pass', {});
    this._advanceTurn(state);

    const activePlayers = state.players.filter(p => p.hand.length > 0 && p.finishedOrder === null);

    // Si todos los jugadores activos pasaron, limpiar mesa
    if (state.passCount >= activePlayers.length - 1) {
      state.tableCards = [];
      state.passCount = 0;
      // El turno pasa al que jugó la última carta
      const lastIdx = state.players.findIndex(p => p.userId === state.lastPlayedBy);
      if (lastIdx !== -1 && state.players[lastIdx].hand.length > 0) {
        state.currentPlayerIdx = lastIdx;
      } else {
        this._advanceTurn(state);
      }
      return {
        ok: true, event: 'table_reset',
        payload: { nextPlayer: this._currentPlayerInfo(state) },
      };
    }

    return {
      ok: true, event: 'player_passed',
      payload: { userId, nextPlayer: this._currentPlayerInfo(state) },
    };
  }

  confirmExchange(gameId, userId, cardIds) {
    const state = this.games.get(gameId);
    if (!state) return this._err('Partida no encontrada');
    if (state.phase !== 'exchange') return this._err('No es momento de intercambiar');

    // Marcar al jugador como listo para el intercambio
    const player = state.players.find(p => p.userId === userId);
    if (!player) return this._err('Jugador no encontrado');

    player.exchangeReady = true;
    player.exchangeCardIds = cardIds;

    const allReady = state.pendingExchanges.every(ex => {
      const from = state.players.find(p => p.userId === ex.from);
      return from.exchangeReady;
    });

    if (allReady) {
      this._applyExchanges(state);
      state.phase = 'playing';
      return { ok: true, event: 'exchange_done', payload: this._sanitizeState(state) };
    }

    return { ok: true, event: 'exchange_waiting', payload: { userId } };
  }

  reconnect(gameId, userId) {
    const state = this.games.get(gameId);
    if (!state) return null;
    const player = state.players.find(p => p.userId === userId);
    if (!player) return null;
    player.connected = true;
    return this._sanitizeStateForPlayer(state, userId);
  }

  disconnect(gameId, userId) {
    const state = this.games.get(gameId);
    if (!state) return;
    const player = state.players.find(p => p.userId === userId);
    if (player) player.connected = false;
  }

  // ─── Internals ────────────────────────────────────────────────────

  _playerFinished(state, player) {
    const order = state.finishOrder.length;
    player.finishedOrder = order;
    player.position = order;
    player.role = getRoleForPosition(order, state.playerCount);
    state.finishOrder.push(player.userId);

    this._log(state, player.userId, 'finished', { position: order, role: player.role });

    const stillPlaying = state.players.filter(p => p.hand.length > 0 && p.finishedOrder === null);

    // Si solo queda 1, es el culo
    if (stillPlaying.length <= 1) {
      if (stillPlaying.length === 1) {
        const last = stillPlaying[0];
        last.finishedOrder = state.finishOrder.length;
        last.position = last.finishedOrder;
        last.role = 'culo';
        state.finishOrder.push(last.userId);
      }
      return this._endRound(state);
    }

    this._advanceTurn(state);
    return {
      ok: true, event: 'player_finished',
      payload: {
        userId: player.userId,
        role: player.role,
        position: player.position,
        nextPlayer: this._currentPlayerInfo(state),
      },
    };
  }

  _endRound(state) {
    state.phase = 'round_end';
    const positions = state.players.map(p => ({
      userId: p.userId,
      nickname: p.nickname,
      position: p.position,
      role: p.role,
    }));

    this._log(state, null, 'round_end', { positions });

    // Preparar intercambio para siguiente ronda
    const exchanges = calculateExchange(
      [...state.players].sort((a, b) => a.position - b.position),
      state.playerCount
    );

    state.pendingExchanges = exchanges;
    state.round++;
    state.phase = 'exchange';

    // Resetear manos
    const hands = dealCards(state.playerCount);
    state.players.forEach((p, i) => {
      p.hand = hands[i];
      p.finishedOrder = null;
      p.position = null;
      p.exchangeReady = false;
      p.exchangeCardIds = [];
    });

    state.tableCards = [];
    state.passCount = 0;
    state.isFirstTurn = true;

    // El culo empieza
    const culoPlayer = state.players.find(p => p.role === 'culo');
    if (culoPlayer) {
      state.currentPlayerIdx = state.players.indexOf(culoPlayer);
    }

    // Resetear roles después de guardarlos
    state.players.forEach(p => { p.role = null; });

    return {
      ok: true, event: 'round_end',
      payload: { positions, exchanges, state: this._sanitizeState(state) },
    };
  }

  _applyExchanges(state) {
    for (const ex of state.pendingExchanges) {
      const fromPlayer = state.players.find(p => p.userId === ex.from);
      const toPlayer   = state.players.find(p => p.userId === ex.to);

      const give    = ex.cards;
      const receive = ex.receives;

      fromPlayer.hand = [...fromPlayer.hand.filter(c => !give.find(g => g.id === c.id)), ...receive];
      toPlayer.hand   = [...toPlayer.hand.filter(c => !receive.find(r => r.id === c.id)), ...give];
    }
    state.pendingExchanges = [];
  }

  _advanceTurn(state) {
    const n = state.players.length;
    let next = (state.currentPlayerIdx + 1) % n;
    let attempts = 0;
    while (state.players[next].hand.length === 0 && attempts < n) {
      next = (next + 1) % n;
      attempts++;
    }
    state.currentPlayerIdx = next;
  }

  _currentPlayerInfo(state) {
    const p = state.players[state.currentPlayerIdx];
    return { userId: p.userId, nickname: p.nickname };
  }

  _log(state, userId, action, data) {
    state.log.push({ t: Date.now(), userId, action, ...data });
  }

  _err(reason) {
    return { ok: false, event: 'error', payload: { reason } };
  }

  /** Quita las manos de los otros jugadores (información privada) */
  _sanitizeStateForPlayer(state, userId) {
    return {
      ...state,
      players: state.players.map(p => ({
        userId: p.userId,
        nickname: p.nickname,
        cardCount: p.hand.length,
        hand: p.userId === userId ? sortHand(p.hand) : undefined,
        role: p.role,
        position: p.position,
        connected: p.connected,
      })),
    };
  }

  _sanitizeState(state) {
    return {
      gameId: state.gameId,
      phase: state.phase,
      round: state.round,
      currentPlayer: this._currentPlayerInfo(state),
      tableCards: state.tableCards,
      players: state.players.map(p => ({
        userId: p.userId,
        nickname: p.nickname,
        cardCount: p.hand.length,
        role: p.role,
        position: p.position,
        connected: p.connected,
      })),
      finishOrder: state.finishOrder,
      pendingExchanges: state.pendingExchanges || [],
    };
  }
}

module.exports = new GameManager();
