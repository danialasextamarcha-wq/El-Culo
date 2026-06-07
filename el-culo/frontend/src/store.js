import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'el-culo-auth' }
  )
);

export const useGameStore = create((set, get) => ({
  room: null,
  gameState: null,
  myHand: [],
  selectedCards: [],
  messages: [],
  phase: null, // 'lobby' | 'exchange' | 'playing' | 'round_end' | 'game_end'

  setRoom: (room) => set({ room }),
  setGameState: (gameState) => set({ gameState, phase: gameState?.phase || 'playing' }),
  setMyHand: (myHand) => set({ myHand }),
  setPhase: (phase) => set({ phase }),
  addMessage: (msg) => set(s => ({ messages: [...s.messages.slice(-100), msg] })),
  clearMessages: () => set({ messages: [] }),

  toggleCard: (cardId) => set(s => {
    const sel = s.selectedCards;
    if (sel.includes(cardId)) return { selectedCards: sel.filter(id => id !== cardId) };
    return { selectedCards: [...sel, cardId] };
  }),
  clearSelection: () => set({ selectedCards: [] }),

  reset: () => set({
    room: null, gameState: null, myHand: [],
    selectedCards: [], messages: [], phase: null,
  }),
}));
