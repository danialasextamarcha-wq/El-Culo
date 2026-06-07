import React from 'react';

const SUIT_SYMBOL = { oros: '♦', copas: '♥', espadas: '♠', bastos: '♣' };
const SUIT_COLOR  = { oros: '#c0392b', copas: '#c0392b', espadas: '#1a1a1a', bastos: '#1a1a1a' };

export default function PlayingCard({ card, selected, onClick, small, faceDown }) {
  if (faceDown) {
    return (
      <div
        style={{
          width: small ? 44 : 72,
          height: small ? 60 : 100,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #1a4a2e 0%, #0d3020 100%)',
          border: '2px solid rgba(201,168,76,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: small ? 16 : 24,
          boxShadow: '0 3px 10px rgba(0,0,0,0.4)',
          flexShrink: 0,
        }}
      >
        🂠
      </div>
    );
  }

  const suit   = card.suit;
  const rank   = card.rank;
  const symbol = SUIT_SYMBOL[suit] || '?';
  const color  = SUIT_COLOR[suit] || '#000';

  return (
    <div
      onClick={onClick}
      style={{
        width: small ? 44 : 72,
        height: small ? 60 : 100,
        borderRadius: 8,
        background: selected ? '#fffbd0' : '#fffef9',
        border: selected ? '2.5px solid #c9a84c' : '1.5px solid #ddd',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: small ? '4px 3px' : '8px 6px',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: selected
          ? '0 0 0 3px rgba(201,168,76,0.5), 0 4px 12px rgba(0,0,0,0.3)'
          : '0 3px 10px rgba(0,0,0,0.3)',
        transform: selected ? 'translateY(-8px)' : 'none',
        transition: 'transform 0.15s, box-shadow 0.15s',
        userSelect: 'none',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <div style={{ fontSize: small ? 11 : 14, fontWeight: 700, color, lineHeight: 1, alignSelf: 'flex-start' }}>
        {rank}
        <br />
        {symbol}
      </div>
      <div style={{ fontSize: small ? 18 : 28, color, lineHeight: 1 }}>
        {symbol}
      </div>
      <div style={{
        fontSize: small ? 11 : 14, fontWeight: 700, color, lineHeight: 1,
        alignSelf: 'flex-end', transform: 'rotate(180deg)',
      }}>
        {rank}<br />{symbol}
      </div>
    </div>
  );
}
