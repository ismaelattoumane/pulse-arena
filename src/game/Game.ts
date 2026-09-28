import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three'
import { Arena } from './map/Arena'
import { Player } from './player/Player'
import { PlayerController } from './player/PlayerController'
import { ThirdPersonCamera } from './camera/ThirdPersonCamera'
import { InputManager } from './input/InputManager'
import { PHYSICS } from './constants'
import { QUALITY_PRESETS } from './quality'
import { useGameStore } from '../state/gameStore'
import type { Quality } from './types'

/**
 * Moteur du jeu : rendu, boucle à pas fixe, entrées, caméra, qualité.
 * React ne fait qu'afficher les overlays ; toute la logique 3D est ici.
 */
export class Game {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera: PerspectiveCamera
  private readonly sun: DirectionalLight
  private readonly arena: Arena
  private readonly player: Player
  private readonly controller: PlayerController
  private readonly tpsCamera: ThirdPersonCamera
  private readonly input: InputManager
  private readonly unsubscribeQuality: () => void

  private accumulator = 0
  private lastTime = 0
  private rafId = 0
  private disposed = false
  private wasPlaying = false
  private orbitAngle = 0
  private fpsEma = 60
  private fpsTimer = 0

  constructor(private readonly container: HTMLElement) {
    const initialQuality = useGameStore.getState().quality
    const preset = QUALITY_PRESETS[initialQuality]

    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset.pixelRatioCap))
    this.renderer.shadowMap.enabled = preset.shadows
    this.renderer.shadowMap.type = PCFSoftShadowMap
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.domElement.style.display = 'block'
    container.appendChild(this.renderer.domElement)

    this.scene.background = new Color(0x0b0e17)
    this.scene.fog = new Fog(0x0b0e17, 45, 110)

    this.camera = new PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 300)

    const hemi = new HemisphereLight(0x8fb8ff, 0x241f33, 0.9)
    this.scene.add(hemi)

    this.sun = new DirectionalLight(0xfff4e0, 2.4)
    this.sun.position.set(28, 40, 18)
    this.sun.castShadow = preset.shadows
    this.sun.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize)
    this.sun.shadow.camera.left = -40
    this.sun.shadow.camera.right = 40
    this.sun.shadow.camera.top = 40
    this.sun.shadow.camera.bottom = -40
    this.sun.shadow.camera.near = 1
    this.sun.shadow.camera.far = 120
    this.sun.shadow.bias = -0.0004
    this.scene.add(this.sun)
    this.scene.add(this.sun.target)

    this.arena = new Arena()
    this.scene.add(this.arena.group)

    const spawn = this.arena.spawnA
    const facingYaw = Math.atan2(-spawn.x, -spawn.z)
    this.player = new Player(spawn, facingYaw)
    this.scene.add(this.player.mesh)

    this.tpsCamera = new ThirdPersonCamera(this.camera, this.arena.colliders)
    this.tpsCamera.snapBehind(this.player.position, Math.atan2(spawn.x, spawn.z))

    this.input = new InputManager(this.renderer.domElement, (locked) => {
      if (!locked && useGameStore.getState().phase === 'playing') {
        useGameStore.getState().setPhase('menu')
      }
    })
    this.controller = new PlayerController(this.player, this.arena.colliders, this.input)

    this.unsubscribeQuality = useGameStore.subscribe((state, previous) => {
      if (state.quality !== previous.quality) this.applyQuality(state.quality)
    })

    window.addEventListener('resize', this.onResize)
    this.renderer.domElement.addEventListener('click', this.onCanvasClick)

    this.rafId = requestAnimationFrame(this.onFrame)
  }

  requestPointerLock(): void {
    const request = this.renderer.domElement.requestPointerLock() as unknown as
      | Promise<void>
      | undefined
    request?.catch(() => useGameStore.getState().setPhase('menu'))
  }

  private applyQuality(quality: Quality): void {
    const preset = QUALITY_PRESETS[quality]
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset.pixelRatioCap))
    this.renderer.shadowMap.enabled = preset.shadows
    this.sun.castShadow = preset.shadows
    if (this.sun.shadow.map) {
      this.sun.shadow.map.dispose()
      this.sun.shadow.map = null
    }
    this.scene.traverse((object) => {
      if (object instanceof Mesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => {
          material.needsUpdate = true
        })
      }
    })
  }

  private readonly onCanvasClick = () => {
    if (useGameStore.getState().phase === 'playing' && !this.input.pointerLocked) {
      this.requestPointerLock()
    }
  }

  private readonly onResize = () => {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.renderer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  private updateFps(dt: number): void {
    const instant = dt > 0 ? 1 / dt : 0
    this.fpsEma += (instant - this.fpsEma) * 0.06
    this.fpsTimer += dt
    if (this.fpsTimer >= 0.25) {
      this.fpsTimer = 0
      useGameStore.getState().setFps(Math.round(this.fpsEma))
    }
  }

  private menuOrbit(dt: number): void {
    this.orbitAngle += dt * 0.07
    const radius = 36
    this.camera.position.set(Math.cos(this.orbitAngle) * radius, 14, Math.sin(this.orbitAngle) * radius)
    this.camera.lookAt(0, 1.5, 0)
  }

  private readonly onFrame = (time: number) => {
    if (this.disposed) return
    this.rafId = requestAnimationFrame(this.onFrame)

    const rawDt = this.lastTime === 0 ? 1 / 60 : (time - this.lastTime) / 1000
    const dt = Math.min(rawDt, 0.1)
    this.lastTime = time

    this.updateFps(dt)

    const playing = useGameStore.getState().phase === 'playing' && this.input.pointerLocked

    if (playing && !this.wasPlaying) {
      this.tpsCamera.snapBehind(this.player.position, this.tpsCamera.yaw)
    }
    this.wasPlaying = playing

    if (playing) {
      const { dx, dy } = this.input.consumeMouseDelta()
      this.tpsCamera.handleMouse(dx, dy)
      this.tpsCamera.handleWheel(this.input.consumeWheel())

      if (this.input.wasPressed('Space')) this.controller.queueJump()

      this.accumulator += dt
      let steps = 0
      while (this.accumulator >= PHYSICS.FIXED_TIMESTEP && steps < PHYSICS.MAX_SUBSTEPS) {
        this.controller.update(PHYSICS.FIXED_TIMESTEP, this.tpsCamera.yaw)
        this.accumulator -= PHYSICS.FIXED_TIMESTEP
        steps++
      }
      if (steps === PHYSICS.MAX_SUBSTEPS) this.accumulator = 0

      this.player.updateVisual(dt)
      this.tpsCamera.update(dt, this.player.position, this.controller.isSprinting())
    } else {
      this.menuOrbit(dt)
    }

    this.input.endFrame()
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.rafId)
    window.removeEventListener('resize', this.onResize)
    this.renderer.domElement.removeEventListener('click', this.onCanvasClick)
    this.input.dispose()
    this.unsubscribeQuality()

    this.scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.geometry.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => {
          const standard = material as MeshStandardMaterial
          standard.map?.dispose()
          material.dispose()
        })
      }
    })
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
