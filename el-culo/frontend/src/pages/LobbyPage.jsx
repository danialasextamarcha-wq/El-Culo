import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useGameStore } from '../store';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';

export default function LobbyPage() {
  const socket    = useSocket();
  const navigate  = useNavigate();
  const user      = useAuthStore(s => s.user);
  const logout    = useAuthStore(s => s.logout);
  const setRoom   = useGameStore(s => s.setRoom);

  const [joinCode, setJoinCode]       = useState('');
  const [maxPlayers, setMaxPlayers]   = useState(4);
  const [creating, setCreating]       = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on('room_created', ({ code, room }) => {
      setCreating(false);
      setRoom(room);
      navigate(`/room/${code}`);
    });

    socket.on('room_update', (room) => {
      setRoom(room);
      navigate(`/room/${room.code}`);
    });

    socket.on('error', ({ reason }) => {
      toast.error(reason);
      setCreating(false);
    });

    return () => {
      socket.off('room_created');
      socket.off('room_update');
      socket.off('error');
    };
  }, [socket]);

  function createRoom() {
    if (!socket) return toast.error('Sin conexión');
    setCreating(true);
    socket.emit('create_room', { maxPlayers });
  }

  function joinRoom() {
    if (!joinCode.trim()) return toast.error('Introduce el código de sala');
    socket.emit('join_room', { code: joinCode.trim().toUpperCase() });
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 20%, #1a4a2e 0%, #0a1f0f 70%)',
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontFamily: 'Playfair Display', fontSize: 42, color: 'var(--gold)', fontWeight: 900 }}>
              🃏 El Culo
            </h1>
            <p style={{ color: 'rgba(253,246,227,0.5)', fontSize: 14 }}>
              Hola, <strong style={{ color: 'var(--cream)' }}>{user?.nickname}</strong>
            </p>
          </div>
          <button onClick={() => { logout(); navigate('/'); }} className="btn-secondary" style={{ fontSize: 13 }}>
            Salir
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Create room */}
          <div className="card-felt" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: 'var(--gold)' }}>
              ✨ Crear sala
            </h2>
            <label style={{ fontSize: 13, color: 'rgba(253,246,227,0.6)', marginBottom: 8, display: 'block' }}>
              Jugadores
            </label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {[3, 4, 5].map(n => (
                <button key={n} onClick={() => setMaxPlayers(n)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 600, fontSize: 16,
                  background: maxPlayers === n ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.06)',
                  border: maxPlayers === n ? '2px solid var(--gold)' : '1px solid rgba(201,168,76,0.2)',
                  color: maxPlayers === n ? 'var(--gold)' : 'var(--cream)',
                }}>
                  {n}
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={createRoom} disabled={creating} style={{ width: '100%' }}>
              {creating ? 'Creando...' : 'Crear sala privada'}
            </button>
          </div>

          {/* Join room */}
          <div className="card-felt" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: 'var(--gold)' }}>
              🔗 Unirse a sala
            </h2>
            <label style={{ fontSize: 13, color: 'rgba(253,246,227,0.6)', marginBottom: 8, display: 'block' }}>
              Código de sala
            </label>
            <input
              className="input-field"
              placeholder="XXXXXX"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ marginBottom: 20, textAlign: 'center', fontSize: 22, letterSpacing: 6, fontWeight: 700 }}
            />
            <button className="btn-primary" onClick={joinRoom} style={{ width: '100%' }}>
              Unirse
            </button>
          </div>
        </div>

        {/* Rules */}
        <div className="card-felt" style={{ padding: 24, marginTop: 24 }}>
          <h3 style={{ fontSize: 16, color: 'var(--gold)', marginBottom: 12 }}>📖 Reglas rápidas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, color: 'rgba(253,246,227,0.7)', lineHeight: 1.7 }}>
            <div>• 3 de oros abre la primera ronda</div>
            <div>• El culo empieza la siguiente ronda</div>
            <div>• AS limpia la mesa, sigues jugando</div>
            <div>• 2 replica cualquier carta (no AS ni 2)</div>
            <div>• AS de picas corta cualquier combinación</div>
            <div>• Intercambio de cartas entre roles</div>
          </div>
        </div>
      </div>
    </div>
  );
}
