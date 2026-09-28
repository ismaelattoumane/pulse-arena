import { useEffect, useRef } from 'react'
import { Game } from './game/Game'
import { useGameStore } from './state/gameStore'
import { Hud } from './ui/Hud'
import { MainMenu } from './ui/MainMenu'

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Game | null>(null)
  const phase = useGameStore((s) => s.phase)

  useEffect(() => {
    if (!containerRef.current) return
    const game = new Game(containerRef.current)
    gameRef.current = game
    return () => {
      game.dispose()
      gameRef.current = null
    }
  }, [])

  const handlePlay = () => {
    useGameStore.getState().setPhase('playing')
    gameRef.current?.requestPointerLock()
  }

  return (
    <>
      <div ref={containerRef} className="game-container" />
      {phase === 'playing' ? <Hud /> : <MainMenu onPlay={handlePlay} />}
    </>
  )
}
