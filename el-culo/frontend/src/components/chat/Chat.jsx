import React, { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../../store';

export default function Chat({ onSend }) {
  const messages = useGameStore(s => s.messages);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send() {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'rgba(0,0,0,0.25)',
      borderRadius: 12,
      border: '1px solid rgba(201,168,76,0.15)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(201,168,76,0.15)',
        fontSize: 13,
        fontWeight: 600,
        color: 'rgba(253,246,227,0.7)',
      }}>
        💬 Chat
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 0,
      }}>
        {messages.length === 0 && (
          <p style={{ color: 'rgba(253,246,227,0.3)', fontSize: 12, textAlign: 'center', marginTop: 20 }}>
            Sin mensajes aún
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 11, color: 'rgba(201,168,76,0.7)', fontWeight: 600 }}>
              {msg.nickname}
            </span>
            <span style={{
              fontSize: 13,
              color: 'var(--cream)',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 8,
              padding: '4px 10px',
              maxWidth: '90%',
            }}>
              {msg.content}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{
        display: 'flex',
        gap: 8,
        padding: '8px 10px',
        borderTop: '1px solid rgba(201,168,76,0.1)',
      }}>
        <input
          className="input-field"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Mensaje..."
          maxLength={200}
          style={{ flex: 1, fontSize: 13, padding: '8px 12px' }}
        />
        <button
          onClick={send}
          style={{
            background: 'rgba(201,168,76,0.2)',
            border: '1px solid rgba(201,168,76,0.4)',
            borderRadius: 8,
            color: 'var(--gold)',
            padding: '8px 14px',
            fontSize: 14,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
