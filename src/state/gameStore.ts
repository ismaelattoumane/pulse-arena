import { create } from 'zustand'
import type { GamePhase, Quality } from '../game/types'

interface GameStore {
  phase: GamePhase
  quality: Quality
  fps: number
  setPhase: (phase: GamePhase) => void
  setQuality: (quality: Quality) => void
  setFps: (fps: number) => void
}

export const useGameStore = create<GameStore>()((set) => ({
  phase: 'menu',
  quality: 'MEDIUM',
  fps: 0,
  setPhase: (phase) => set({ phase }),
  setQuality: (quality) => set({ quality }),
  setFps: (fps) => set({ fps }),
}))
