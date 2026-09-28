import { PerspectiveCamera, Vector3 } from 'three'
import { CAMERA } from '../constants'
import { clamp } from '../utils/math'
import type { StaticColliders } from '../physics/StaticColliders'

const PIVOT_OFFSET = new Vector3(0, CAMERA.HEIGHT, 0)

/**
 * Caméra TPS : orbite autour du personnage (yaw/pitch souris), zoom molette,
 * évitement des murs par rayon, lissage exponentiel et léger bonus de FOV en sprint.
 */
export class ThirdPersonCamera {
  yaw = 0
  pitch = -0.22
  private distance: number = CAMERA.DISTANCE
  private currentDistance: number = CAMERA.DISTANCE
  private initialized = false

  private readonly pivot = new Vector3()
  private readonly targetPivot = new Vector3()
  private readonly lookTarget = new Vector3()
  private readonly dir = new Vector3()
  private readonly right = new Vector3()

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly colliders: StaticColliders,
  ) {}

  handleMouse(dx: number, dy: number): void {
    this.yaw -= dx * CAMERA.SENSITIVITY
    this.pitch = clamp(this.pitch - dy * CAMERA.SENSITIVITY, CAMERA.PITCH_MIN, CAMERA.PITCH_MAX)
  }

  handleWheel(wheel: number): void {
    this.distance = clamp(this.distance + wheel * 0.003, CAMERA.MIN_DISTANCE, CAMERA.MAX_DISTANCE)
  }

  /** Replace la caméra derrière le personnage sans lissage (spawn / retour en jeu). */
  snapBehind(feet: Vector3, yaw: number): void {
    this.yaw = yaw
    this.pivot.copy(feet).add(PIVOT_OFFSET)
    this.currentDistance = this.distance
    this.initialized = true
    this.update(1 / 60, feet, false, true)
  }

  update(dt: number, feet: Vector3, sprinting: boolean, snap = false): void {
    if (!this.initialized) {
      this.snapBehind(feet, this.yaw)
      return
    }

    this.targetPivot.copy(feet).add(PIVOT_OFFSET)
    if (snap) this.pivot.copy(this.targetPivot)
    else this.pivot.lerp(this.targetPivot, 1 - Math.exp(-30 * dt))

    const cosP = Math.cos(this.pitch)
    const sinP = Math.sin(this.pitch)
    const sinY = Math.sin(this.yaw)
    const cosY = Math.cos(this.yaw)

    this.dir.set(sinY * cosP, -sinP, cosY * cosP)
    this.right.set(cosY, 0, -sinY)

    const hit = this.colliders.raycast(this.pivot, this.dir, this.distance)
    const targetDistance = hit === null ? this.distance : Math.max(0.35, hit - 0.25)
    const lambda = hit === null ? 14 : 40
    if (snap) {
      this.currentDistance = targetDistance
    } else {
      this.currentDistance += (targetDistance - this.currentDistance) * (1 - Math.exp(-lambda * dt))
    }

    const shoulderScale = clamp(this.currentDistance / this.distance, 0, 1)
    this.camera.position
      .copy(this.pivot)
      .addScaledVector(this.dir, this.currentDistance)
      .addScaledVector(this.right, CAMERA.SHOULDER_OFFSET * shoulderScale)

    this.lookTarget
      .copy(this.pivot)
      .addScaledVector(this.right, CAMERA.SHOULDER_OFFSET * 0.6)
    this.lookTarget.y += 0.1
    this.camera.lookAt(this.lookTarget)

    const targetFov = CAMERA.FOV + (sprinting ? CAMERA.SPRINT_FOV_BONUS : 0)
    const nextFov = this.camera.fov + (targetFov - this.camera.fov) * (1 - Math.exp(-8 * dt))
    if (Math.abs(nextFov - this.camera.fov) > 0.01) {
      this.camera.fov = nextFov
      this.camera.updateProjectionMatrix()
    }
  }
}
