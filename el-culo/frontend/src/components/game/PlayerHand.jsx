import React from 'react';
import PlayingCard from './PlayingCard';
import { useGameStore } from '../../store';

export default function PlayerHand({ hand, isMyTurn, tableCardCount, onPlay, onPass }) {
  const { selectedCards, toggleCard, clearSelection } = useGameStore();

  const canPlay = isMyTurn;
  const canPass = isMyTurn && tableCardCount > 0;

  function handlePlay() {
    if (selectedCards.length === 0) return;
    onPlay(selectedCards);
    clearSelection();
  }

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Hand */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
        padding: '0 16px 16px',
        minHeight: 120,
      }}>
        {hand.map(card => (
          <PlayingCard
            key={card.id}
            card={card}
            selected={selectedCards.includes(card.id)}
            onClick={canPlay ? () => toggleCard(card.id) : undefined}
          />
        ))}
        {hand.length === 0 && (
          <p style={{ color: 'rgba(253,246,227,0.5)', alignSelf: 'center' }}>
            ¡Sin cartas! Esperando resultado...
          </p>
        )}
      </div>

      {/* Action buttons */}
      {isMyTurn && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', paddingBottom: 8 }}>
          <button
            className="btn-primary"
            onClick={handlePlay}
            disabled={selectedCards.length === 0}
            style={{ opacity: selectedCards.length === 0 ? 0.5 : 1 }}
          >
            Jugar {selectedCards.length > 0 ? `(${selectedCards.length})` : ''}
          </button>
          {canPass && (
            <button className="btn-secondary" onClick={onPass}>
              Pasar
            </button>
          )}
          {selectedCards.length > 0 && (
            <button
              onClick={clearSelection}
              style={{
                background: 'transparent',
                border: '1px solid rgba(253,246,227,0.3)',
                color: 'rgba(253,246,227,0.6)',
                borderRadius: 8,
                padding: '11px 16px',
                fontSize: 13,
              }}
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      {!isMyTurn && (
        <p style={{ textAlign: 'center', color: 'rgba(253,246,227,0.4)', fontSize: 13 }}>
          Esperando tu turno...
        </p>
      )}
    </div>
  );
}
