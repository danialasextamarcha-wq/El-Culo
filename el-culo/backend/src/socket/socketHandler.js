const gameManager = require('../game/gameManager');
const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

// roomCode -> { players: [{userId, nickname, socketId, ready}], hostId, gameId }
const rooms = new Map();

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRoomBySocket(socketId) {
  for (const [code, room] of rooms) {
    if (room.players.some(p => p.socketId === socketId)) return { code, room };
  }
  return null;
}

module.exports = (io) => {
  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId   = payload.userId;
      socket.nickname = payload.nickname;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Connected: ${socket.nickname} (${socket.id})`);

    // ── Create room ──────────────────────────────────────────────
    socket.on('create_room', ({ maxPlayers = 4, isPublic = false, customRules = {} } = {}) => {
      const code = generateCode();
      rooms.set(code, {
        code,
        hostId: socket.userId,
        maxPlayers: Math.min(5, Math.max(3, maxPlayers)),
        isPublic,
        customRules,
        gameId: null,
        players: [{
          userId: socket.userId,
          nickname: socket.nickname,
          socketId: socket.id,
          ready: false,
        }],
      });
      socket.join(code);
      socket.emit('room_created', { code, room: getRoomPublicData(rooms.get(code)) });
    });

    // ── Join room ─────────────────────────────────────────────────
    socket.on('join_room', ({ code }) => {
      const room = rooms.get(code);
      if (!room) return socket.emit('error', { reason: 'Sala no encontrada' });
      if (room.players.length >= room.maxPlayers)
        return socket.emit('error', { reason: 'Sala llena' });
      if (room.gameId)
        return socket.emit('error', { reason: 'Partida en curso' });

      const existing = room.players.find(p => p.userId === socket.userId);
      if (existing) {
        existing.socketId = socket.id;
      } else {
        room.players.push({
          userId: socket.userId,
          nickname: socket.nickname,
          socketId: socket.id,
          ready: false,
        });
      }
      socket.join(code);
      io.to(code).emit('room_update', getRoomPublicData(room));
    });

    // ── Ready toggle ──────────────────────────────────────────────
    socket.on('ready', () => {
      const found = getRoomBySocket(socket.id);
      if (!found) return;
      const { code, room } = found;
      const p = room.players.find(p => p.socketId === socket.id);
      if (p) p.ready = !p.ready;
      io.to(code).emit('room_update', getRoomPublicData(room));
    });

    // ── Start game ────────────────────────────────────────────────
    socket.on('start_game', async () => {
      const found = getRoomBySocket(socket.id);
      if (!found) return;
      const { code, room } = found;

      if (room.hostId !== socket.userId)
        return socket.emit('error', { reason: 'Solo el anfitrión puede iniciar' });
      if (room.players.length < 3)
        return socket.emit('error', { reason: 'Mínimo 3 jugadores' });
      if (!room.players.every(p => p.ready))
        return socket.emit('error', { reason: 'No todos están listos' });

      const gameId = uuidv4();
      room.gameId = gameId;

      const publicState = gameManager.createGame(gameId, room.players, room.customRules);

      // Cada jugador recibe su mano privada
      for (const p of room.players) {
        const privateState = gameManager.getState(gameId);
        const playerState = {
          ...publicState,
          myHand: privateState.players.find(pl => pl.userId === p.userId)?.hand || [],
        };
        io.to(p.socketId).emit('game_started', playerState);
      }

      // Persistir en BD (fire & forget)
      persistGame(gameId, room).catch(console.error);
    });

    // ── Play cards ────────────────────────────────────────────────
    socket.on('play_card', ({ gameId, cardIds }) => {
      const result = gameManager.playCards(gameId, socket.userId, cardIds);
      const found  = getRoomBySocket(socket.id);
      if (!found) return;
      const { code, room } = found;

      if (!result.ok) return socket.emit('error', result.payload);

      // Broadcast resultado
      io.to(code).emit('play_result', result.payload);
      io.to(code).emit('game_event', { event: result.event, ...result.payload });

      // Si terminó la ronda, enviar manos nuevas
      if (result.event === 'round_end') {
        sendPrivateHands(io, gameId, room);
      }

      // Si algún jugador terminó, notificar su mano vacía
      updateHandForPlayer(io, gameId, room, socket.userId);
    });

    // ── Pass ──────────────────────────────────────────────────────
    socket.on('pass', ({ gameId }) => {
      const result = gameManager.pass(gameId, socket.userId);
      const found  = getRoomBySocket(socket.id);
      if (!found) return;
      const { code } = found;

      if (!result.ok) return socket.emit('error', result.payload);
      io.to(code).emit('game_event', { event: result.event, ...result.payload });
    });

    // ── Exchange confirm ──────────────────────────────────────────
    socket.on('confirm_exchange', ({ gameId, cardIds }) => {
      const result = gameManager.confirmExchange(gameId, socket.userId, cardIds);
      const found  = getRoomBySocket(socket.id);
      if (!found) return;
      const { code, room } = found;

      if (!result.ok) return socket.emit('error', result.payload);

      if (result.event === 'exchange_done') {
        sendPrivateHands(io, gameId, room);
        io.to(code).emit('game_event', { event: 'exchange_done' });
      } else {
        socket.emit('game_event', { event: 'exchange_waiting' });
      }
    });

    // ── Chat ──────────────────────────────────────────────────────
    socket.on('chat_message', ({ content }) => {
      if (!content || content.length > 500) return;
      const sanitized = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const found = getRoomBySocket(socket.id);
      if (!found) return;
      const { code } = found;

      const msg = {
        userId: socket.userId,
        nickname: socket.nickname,
        content: sanitized,
        timestamp: Date.now(),
      };
      io.to(code).emit('chat_message', msg);
    });

    // ── Reconnect ─────────────────────────────────────────────────
    socket.on('reconnect_room', ({ code }) => {
      const room = rooms.get(code);
      if (!room) return socket.emit('error', { reason: 'Sala no encontrada' });

      const p = room.players.find(p => p.userId === socket.userId);
      if (!p) return socket.emit('error', { reason: 'No eres miembro de esta sala' });

      p.socketId = socket.id;
      socket.join(code);

      if (room.gameId) {
        const state = gameManager.reconnect(room.gameId, socket.userId);
        if (state) {
          socket.emit('game_started', state);
        }
      } else {
        socket.emit('room_update', getRoomPublicData(room));
      }
    });

    // ── Disconnect ────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const found = getRoomBySocket(socket.id);
      if (!found) return;
      const { code, room } = found;

      const p = room.players.find(p => p.socketId === socket.id);
      if (p) {
        p.connected = false;
        if (room.gameId) gameManager.disconnect(room.gameId, socket.userId);
      }
      io.to(code).emit('room_update', getRoomPublicData(room));
    });
  });

  // ─── Helpers ─────────────────────────────────────────────────────

  function getRoomPublicData(room) {
    return {
      code: room.code,
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      players: room.players.map(p => ({
        userId: p.userId,
        nickname: p.nickname,
        ready: p.ready,
        connected: p.connected !== false,
      })),
      inGame: !!room.gameId,
    };
  }

  function sendPrivateHands(io, gameId, room) {
    const state = gameManager.getState(gameId);
    if (!state) return;
    for (const rp of room.players) {
      const playerState = state.players.find(p => p.userId === rp.userId);
      if (playerState) {
        io.to(rp.socketId).emit('hand_update', {
          hand: playerState.hand,
          phase: state.phase,
          pendingExchanges: state.pendingExchanges || [],
        });
      }
    }
  }

  function updateHandForPlayer(io, gameId, room, userId) {
    const state = gameManager.getState(gameId);
    if (!state) return;
    const rp = room.players.find(p => p.userId === userId);
    const playerState = state.players.find(p => p.userId === userId);
    if (rp && playerState) {
      io.to(rp.socketId).emit('hand_update', { hand: playerState.hand });
    }
  }

  async function persistGame(gameId, room) {
    try {
      await pool.query(
        `INSERT INTO games(id, room_id, player_count) VALUES($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [gameId, room.code, room.players.length]
      );
    } catch (err) {
      console.error('Error persisting game:', err.message);
    }
  }
};
