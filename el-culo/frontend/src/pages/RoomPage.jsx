import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore, useGameStore } from '../store';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';

export default function RoomPage() {
  const { code }       = useParams();
  const socket         = useSocket();
  const navigate       = useNavigate();
  const user           = useAuthStore(s => s.user);
  const { room, setRoom, setGameState, setMyHand, addMessage } = useGameStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on('room_update', (r) => setRoom(r));
    socket.on('game_started', (state) => {
      setGameState(state);
      setMyHand(state.myHand || []);
      navigate(`/game/${code}`);
    });
    socket.on('chat_message', (msg) => addMessage(msg));
    socket.on('error', ({ reason }) => toast.error(reason));

    // Try reconnect if coming back
    socket.emit('reconnect_room', { code });

    return () => {
      socket.off('room_update');
      socket.off('game_started');
      socket.off('chat_message');
      socket.off('error');
    };
  }, [socket, code]);

  function toggleReady() {
    socket?.emit('ready');
  }

  function startGame() {
    socket?.emit('start_game');
  }

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isHost     = room?.hostId === user?.id;
  const myPlayer   = room?.players.find(p => p.userId === user?.id);
  const allReady   = room?.players.length >= 3 && room?.players.every(p => p.ready);
  const canStart   = isHost && allReady;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 20%, #1a4a2e 0%, #0a1f0f 70%)',
      padding: '40px 20px',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 540 }}>
        <button onClick={() => navigate('/lobby')} style={{
          background: 'transparent', border: 'none',
          color: 'rgba(253,246,227,0.5)', fontSize: 14, marginBottom: 24, cursor: 'pointer',
        }}>
          ← Volver al lobby
        </button>

        <div className="card-felt" style={{ padding: 32 }}>
          {/* Room code */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <p style={{ fontSize: 13, color: 'rgba(253,246,227,0.5)', marginBottom: 8 }}>Código de sala</p>
            <button onClick={copyCode} style={{
              background: 'rgba(201,168,76,0.1)',
              border: '2px dashed rgba(201,168,76,0.5)',
              borderRadius: 12,
              padding: '12px 32px',
              cursor: 'pointer',
            }}>
              <span style={{
                fontFamily: 'Playfair Display', fontSize: 40, fontWeight: 900,
                color: 'var(--gold)', letterSpacing: 8,
              }}>
                {code}
              </span>
            </button>
            <p style={{ fontSize: 12, color: 'rgba(201,168,76,0.5)', marginTop: 8 }}>
              {copied ? '✅ ¡Copiado!' : '👆 Toca para copiar y compartir con tus amigos'}
            </p>
          </div>

          {/* Players */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 15, color: 'rgba(253,246,227,0.6)', marginBottom: 14 }}>
              Jugadores ({room?.players.length || 0} / {room?.maxPlayers || 4})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(room?.players || []).map(p => (
                <div key={p.userId} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(0,0,0,0.25)', borderRadius: 10,
                  padding: '12px 16px',
                  border: p.userId === user?.id
                    ? '1px solid rgba(201,168,76,0.4)'
                    : '1px solid transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>🃏</span>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--cream)', fontSize: 15 }}>
                        {p.nickname}
                      </span>
                      {p.userId === room?.hostId && (
                        <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--gold)' }}>⭐ Anfitrión</span>
                      )}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 12, fontWeight: 600,
                    color: p.ready ? '#2ecc71' : 'rgba(253,246,227,0.4)',
                    background: p.ready ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.05)',
                    padding: '4px 12px', borderRadius: 20,
                  }}>
                    {p.ready ? '✓ Listo' : 'Esperando...'}
                  </div>
                </div>
              ))}
              {/* Empty slots */}
              {Array.from({ length: (room?.maxPlayers || 4) - (room?.players.length || 0) }).map((_, i) => (
                <div key={i} style={{
                  background: 'rgba(0,0,0,0.1)', borderRadius: 10, padding: '12px 16px',
                  border: '1px dashed rgba(255,255,255,0.1)',
                  color: 'rgba(253,246,227,0.25)', fontSize: 13,
                }}>
                  Esperando jugador...
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
            <button
              className={myPlayer?.ready ? 'btn-secondary' : 'btn-primary'}
              onClick={toggleReady}
              style={{ width: '100%' }}
            >
              {myPlayer?.ready ? '✗ No estoy listo' : '✓ ¡Listo!'}
            </button>

            {isHost && (
              <button
                className="btn-primary"
                onClick={startGame}
                disabled={!canStart}
                style={{ width: '100%', opacity: canStart ? 1 : 0.5 }}
              >
                {canStart ? '🚀 Iniciar partida' : 'Esperando que todos estén listos...'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
