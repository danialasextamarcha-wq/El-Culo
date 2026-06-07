import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore, useGameStore } from '../store';
import { useSocket } from '../hooks/useSocket';
import GameTable from '../components/game/GameTable';
import PlayerHand from '../components/game/PlayerHand';
import Chat from '../components/chat/Chat';
import toast from 'react-hot-toast';

const ROLE_LABELS = {
  presidente:     '👑 ¡PRESIDENTE!',
  vicepresidente: '🥈 ¡Vicepresidente!',
  culo:           '🍑 ¡Eres el CULO!',
  viceculo:       '🥉 ¡Viceculo!',
  neutro:         '😐 Neutro',
};

export default function GamePage() {
  const { code }  = useParams();
  const socket    = useSocket();
  const navigate  = useNavigate();
  const user      = useAuthStore(s => s.user);
  const {
    gameState, myHand, setGameState, setMyHand, addMessage,
    phase, setPhase,
  } = useGameStore();

  const [tableCards, setTableCards] = useState([]);
  const [roundResult, setRoundResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [pendingExchanges, setPendingExchanges] = useState([]);
  const [exchangeConfirmed, setExchangeConfirmed] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on('game_event', (event) => {
      console.log('[Game event]', event);

      if (event.event === 'cards_played' || event.event === 'table_cleared') {
        setTableCards(event.tableCards || []);
        if (event.event === 'table_cleared') {
          toast('🧹 Mesa limpia!', { icon: '✨' });
        }
      }

      if (event.event === 'player_passed') {
        // No UI change needed, next player indicator updates
      }

      if (event.event === 'table_reset') {
        setTableCards([]);
      }

      if (event.event === 'player_finished') {
        toast(`${event.nickname || 'Un jugador'} terminó sus cartas – ${ROLE_LABELS[event.role] || event.role}`, {
          duration: 3000,
        });
      }

      if (event.event === 'round_end') {
        setRoundResult(event.positions);
        setShowResult(true);
        setTableCards([]);
        setTimeout(() => setShowResult(false), 4000);
      }

      if (event.event === 'exchange_done') {
        setPhase('playing');
        setExchangeConfirmed(false);
        setPendingExchanges([]);
      }

      // Update gameState whenever we get state updates
      if (event.state) {
        setGameState(event.state);
      }
    });

    socket.on('play_result', (payload) => {
      if (payload.tableCards !== undefined) {
        setTableCards(payload.tableCards);
      }
      // Update currentPlayer in gameState
      if (payload.nextPlayer && gameState) {
        setGameState({
          ...gameState,
          currentPlayer: payload.nextPlayer,
        });
      }
    });

    socket.on('hand_update', ({ hand, phase: newPhase, pendingExchanges: exch }) => {
      setMyHand(hand);
      if (newPhase) setPhase(newPhase);
      if (exch) setPendingExchanges(exch);
    });

    socket.on('chat_message', (msg) => addMessage(msg));

    socket.on('error', ({ reason }) => toast.error(reason));

    return () => {
      socket.off('game_event');
      socket.off('play_result');
      socket.off('hand_update');
      socket.off('chat_message');
      socket.off('error');
    };
  }, [socket, gameState]);

  function playCards(cardIds) {
    if (!gameState?.gameId) return;
    socket?.emit('play_card', { gameId: gameState.gameId, cardIds });
  }

  function pass() {
    if (!gameState?.gameId) return;
    socket?.emit('pass', { gameId: gameState.gameId });
  }

  function sendChat(content) {
    socket?.emit('chat_message', { content });
  }

  function confirmExchange() {
    // For simplicity, auto-confirm (in full version: let user pick which cards)
    socket?.emit('confirm_exchange', { gameId: gameState?.gameId, cardIds: [] });
    setExchangeConfirmed(true);
  }

  const isMyTurn = gameState?.currentPlayer?.userId === user?.id;
  const myPlayer = gameState?.players?.find(p => p.userId === user?.id);

  if (!gameState) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--gold)', fontSize: 20 }}>Cargando partida...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #1a4a2e 0%, #0a1f0f 60%)',
      padding: '16px',
      display: 'grid',
      gridTemplateColumns: '1fr 300px',
      gridTemplateRows: 'auto 1fr auto',
      gap: 16,
      maxHeight: '100vh',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        gridColumn: '1 / -1',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 16px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
        border: '1px solid rgba(201,168,76,0.2)',
      }}>
        <div>
          <span style={{ fontFamily: 'Playfair Display', fontSize: 24, color: 'var(--gold)' }}>
            🃏 El Culo
          </span>
          <span style={{ marginLeft: 16, fontSize: 13, color: 'rgba(253,246,227,0.5)' }}>
            Ronda {gameState.round} · Sala {code}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {isMyTurn && (
            <span style={{
              background: 'rgba(201,168,76,0.25)', border: '1px solid var(--gold)',
              borderRadius: 20, padding: '4px 14px', fontSize: 13, color: 'var(--gold)',
              animation: 'pulse 1.5s infinite',
            }}>
              ✨ Tu turno
            </span>
          )}
          <button onClick={() => navigate('/lobby')} style={{
            background: 'transparent', border: '1px solid rgba(253,246,227,0.2)',
            color: 'rgba(253,246,227,0.5)', borderRadius: 8, padding: '6px 14px', fontSize: 12,
          }}>
            Salir
          </button>
        </div>
      </div>

      {/* Main game area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
        {/* Table */}
        <GameTable
          gameState={gameState}
          myUserId={user?.id}
          tableCards={tableCards}
        />

        {/* Exchange phase */}
        {phase === 'exchange' && (
          <div className="card-felt" style={{ padding: 20, textAlign: 'center' }}>
            <h3 style={{ color: 'var(--gold)', marginBottom: 12 }}>🔄 Intercambio de cartas</h3>
            <p style={{ fontSize: 13, color: 'rgba(253,246,227,0.7)', marginBottom: 16 }}>
              Las cartas se intercambian según tu posición de la ronda anterior.
            </p>
            {!exchangeConfirmed ? (
              <button className="btn-primary" onClick={confirmExchange}>
                Confirmar intercambio
              </button>
            ) : (
              <p style={{ color: 'rgba(253,246,227,0.5)' }}>Esperando a otros jugadores...</p>
            )}
          </div>
        )}

        {/* My hand */}
        <div className="card-felt" style={{ padding: 8 }}>
          <div style={{ padding: '8px 16px 4px', fontSize: 13, color: 'rgba(253,246,227,0.5)' }}>
            Tu mano ({myHand.length} cartas)
            {myPlayer?.role && (
              <span style={{ marginLeft: 12, color: 'var(--gold)' }}>
                {ROLE_LABELS[myPlayer.role] || myPlayer.role}
              </span>
            )}
          </div>
          <PlayerHand
            hand={myHand}
            isMyTurn={isMyTurn && phase === 'playing'}
            tableCardCount={tableCards.length}
            onPlay={playCards}
            onPass={pass}
          />
        </div>
      </div>

      {/* Chat sidebar */}
      <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Chat onSend={sendChat} />
      </div>

      {/* Round result overlay */}
      {showResult && roundResult && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div className="card-felt" style={{ padding: 40, textAlign: 'center', minWidth: 320 }}>
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: 32, color: 'var(--gold)', marginBottom: 24 }}>
              Fin de ronda
            </h2>
            {roundResult.map(p => (
              <div key={p.userId} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 16px', borderRadius: 10, marginBottom: 8,
                background: 'rgba(0,0,0,0.3)',
                border: p.userId === user?.id ? '1px solid var(--gold)' : '1px solid transparent',
              }}>
                <span style={{ color: 'var(--cream)', fontWeight: 600 }}>{p.nickname}</span>
                <span style={{ color: 'var(--gold)' }}>{ROLE_LABELS[p.role] || p.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
