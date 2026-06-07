import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store';
import LoginPage  from './pages/LoginPage';
import LobbyPage  from './pages/LobbyPage';
import RoomPage   from './pages/RoomPage';
import GamePage   from './pages/GamePage';

function PrivateRoute({ children }) {
  const token = useAuthStore(s => s.token);
  return token ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1a4a2e',
            color: '#fdf6e3',
            border: '1px solid rgba(201,168,76,0.4)',
            fontFamily: 'DM Sans, sans-serif',
          },
          success: { iconTheme: { primary: '#c9a84c', secondary: '#0a1f0f' } },
          error: { iconTheme: { primary: '#e74c3c', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/"           element={<LoginPage />} />
        <Route path="/lobby"      element={<PrivateRoute><LobbyPage /></PrivateRoute>} />
        <Route path="/room/:code" element={<PrivateRoute><RoomPage  /></PrivateRoute>} />
        <Route path="/game/:code" element={<PrivateRoute><GamePage  /></PrivateRoute>} />
        <Route path="*"           element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
