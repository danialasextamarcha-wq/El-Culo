import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_WS_URL || '';

export default function LoginPage() {
  const [tab, setTab] = useState('guest');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore(s => s.setAuth);
  const navigate = useNavigate();

  async function handleGuest(e) {
    e.preventDefault();
    if (!nickname.trim()) return toast.error('Escribe un nickname');
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/auth/guest`, { nickname: nickname.trim() });
      setAuth(data.user, data.token);
      navigate('/lobby');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al entrar');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/auth/login`, { nickname, password });
      setAuth(data.user, data.token);
      navigate('/lobby');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/auth/register`, { nickname, email, password });
      setAuth(data.user, data.token);
      navigate('/lobby');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 30%, #1a4a2e 0%, #0a1f0f 70%)',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 72, marginBottom: 8 }}>🃏</div>
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 52,
            fontWeight: 900,
            color: 'var(--gold)',
            letterSpacing: 2,
            textShadow: '0 2px 20px rgba(201,168,76,0.4)',
          }}>
            El Culo
          </h1>
          <p style={{ color: 'rgba(253,246,227,0.5)', fontSize: 15, marginTop: 8 }}>
            El juego de cartas más épico de España
          </p>
        </div>

        <div className="card-felt" style={{ padding: 32 }}>
          <div style={{ display: 'flex', marginBottom: 28, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(201,168,76,0.2)' }}>
            {[['guest','Invitado'],['login','Entrar'],['register','Registrarse']].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                flex: 1, padding: '10px 4px', fontSize: 13, fontWeight: 600,
                background: tab === key ? 'rgba(201,168,76,0.25)' : 'transparent',
                color: tab === key ? 'var(--gold)' : 'rgba(253,246,227,0.5)',
                border: 'none',
                borderRight: '1px solid rgba(201,168,76,0.15)',
                transition: 'all 0.2s',
              }}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'guest' && (
            <form onSubmit={handleGuest} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input className="input-field" placeholder="Tu nickname" value={nickname}
                onChange={e => setNickname(e.target.value)} maxLength={32} autoFocus />
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Entrando...' : 'Jugar como invitado 🎮'}
              </button>
              <p style={{ fontSize: 12, color: 'rgba(253,246,227,0.35)' }}>
                Tus estadísticas no se guardarán
              </p>
            </form>
          )}

          {tab === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input className="input-field" placeholder="Nickname" value={nickname} onChange={e => setNickname(e.target.value)} />
              <input className="input-field" placeholder="Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} />
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Entrando...' : 'Iniciar sesión'}
              </button>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input className="input-field" placeholder="Nickname (único)" value={nickname} onChange={e => setNickname(e.target.value)} maxLength={32} />
              <input className="input-field" placeholder="Email (opcional)" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              <input className="input-field" placeholder="Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} />
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
