import { useGameStore } from '../state/gameStore'
import type { Quality } from '../game/types'

const QUALITIES: Quality[] = ['LOW', 'MEDIUM', 'HIGH']

export function MainMenu({ onPlay }: { onPlay: () => void }) {
  const quality = useGameStore((s) => s.quality)
  const setQuality = useGameStore((s) => s.setQuality)

  return (
    <div className="overlay">
      <div className="menu-panel">
        <h1 className="title">
          PULSE<span>ARENA</span>
        </h1>
        <p className="subtitle">Prototype 3D · Phase 1 — Déplacement, caméra TPS &amp; arène</p>

        <button className="play-btn" onClick={onPlay}>
          JOUER
        </button>

        <div className="quality-row">
          <span>Qualité</span>
          {QUALITIES.map((q) => (
            <button
              key={q}
              className={q === quality ? 'chip active' : 'chip'}
              onClick={() => setQuality(q)}
            >
              {q}
            </button>
          ))}
        </div>

        <div className="controls-grid">
          <div>
            <kbd>Z</kbd>
            <kbd>Q</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd>
            <span>se déplacer</span>
          </div>
          <div>
            <kbd>Souris</kbd>
            <span>caméra</span>
          </div>
          <div>
            <kbd>Espace</kbd>
            <span>sauter</span>
          </div>
          <div>
            <kbd>Maj</kbd>
            <span>sprint</span>
          </div>
          <div>
            <kbd>Molette</kbd>
            <span>zoom</span>
          </div>
          <div>
            <kbd>Échap</kbd>
            <span>menu</span>
          </div>
        </div>
      </div>
    </div>
  )
}
