import React from 'react';
import PlayingCard from './PlayingCard';

const ROLE_LABELS = {
  presidente:     '👑 Presidente',
  vicepresidente: '🥈 Vicepresidente',
  culo:           '🍑 Culo',
  viceculo:       '🥉 Viceculo',
  neutro:         '😐 Neutro',
};

export default function GameTable({ gameState, myUserId, tableCards, onPass }) {
  if (!gameState) return null;
  const { players, currentPlayer } = gameState;

  return (
    <div style={{
      background: 'radial-gradient(ellipse at center, #2d7a4f 0%, #1a4a2e 60%, #0a1f0f 100%)',
      borderRadius: 24,
      padding: 32,
      minHeight: 340,
      position: 'relative',
      border: '3px solid rgba(201,168,76,0.3)',
      boxShadow: 'inset 0 2px 40px rgba(0,0,0,0.4)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 20,
    }}>
      {/* Players around table */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {players
          .filter(p => p.userId !== myUserId)
          .map(p => (
            <PlayerBadge
              key={p.userId}
              player={p}
              isCurrentTurn={currentPlayer?.userId === p.userId}
            />
          ))}
      </div>

      {/* Table cards */}
      <div style={{
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 16,
        padding: '16px 24px',
        minWidth: 200,
        minHeight: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        border: '1px solid rgba(201,168,76,0.2)',
      }}>
        {tableCards && tableCards.length > 0
          ? tableCards.map(c => (
              <PlayingCard key={c.id} card={c} small />
            ))
          : <span style={{ color: 'rgba(253,246,227,0.4)', fontSize: 14 }}>Mesa vacía</span>
        }
      </div>

      {/* Turn indicator */}
      <div style={{
        fontSize: 13,
        color: 'rgba(201,168,76,0.8)',
        textAlign: 'center',
      }}>
        {currentPlayer
          ? currentPlayer.userId === myUserId
            ? '✨ Tu turno'
            : `Turno de ${currentPlayer.nickname}`
          : ''}
      </div>
    </div>
  );
}

function PlayerBadge({ player, isCurrentTurn }) {
  return (
    <div style={{
      background: isCurrentTurn ? 'rgba(201,168,76,0.25)' : 'rgba(0,0,0,0.3)',
      border: isCurrentTurn ? '2px solid var(--gold)' : '1px solid rgba(201,168,76,0.2)',
      borderRadius: 12,
      padding: '10px 16px',
      textAlign: 'center',
      minWidth: 90,
      transition: 'all 0.3s',
    }}>
      <div style={{ fontSize: 24 }}>
        {player.avatar || '🃏'}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)', marginTop: 4 }}>
        {player.nickname}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(253,246,227,0.6)', marginTop: 2 }}>
        {player.cardCount} carta{player.cardCount !== 1 ? 's' : ''}
      </div>
      {player.role && (
        <div style={{ fontSize: 11, marginTop: 4, color: 'var(--gold)' }}>
          {ROLE_LABELS[player.role] || player.role}
        </div>
      )}
      {!player.connected && (
        <div style={{ fontSize: 10, color: '#e74c3c', marginTop: 2 }}>desconectado</div>
      )}
    </div>
  );
}
