import { useGameStore } from '../state/gameStore'

export function Hud() {
  const fps = useGameStore((s) => s.fps)

  return (
    <>
      <div className="crosshair" />
      <div className="hud hud-top-left">
        PULSE<span>ARENA</span>
        <em>prototype · phase 1</em>
      </div>
      <div className="hud hud-top-right">{fps} FPS</div>
      <div className="hud hud-bottom-left">
        <b>ZQSD / WASD</b> se déplacer&nbsp;·&nbsp;<b>Souris</b> caméra&nbsp;·&nbsp;<b>Espace</b> saut
        &nbsp;·&nbsp;<b>Maj</b> sprint&nbsp;·&nbsp;<b>Molette</b> zoom
      </div>
      <div className="hud hud-bottom-right">Échap — menu</div>
    </>
  )
}
