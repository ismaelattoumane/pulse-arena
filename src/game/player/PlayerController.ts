import { PHYSICS, PLAYER_DIMS } from '../constants'
import { approach } from '../utils/math'
import type { Player } from './Player'
import type { StaticColliders } from '../physics/StaticColliders'
import type { InputManager } from '../input/InputManager'

type Axis = 'x' | 'y' | 'z'

const MAX_COLLISION_ITERATIONS = 4

/**
 * Contrôleur de déplacement : entrées → vélocité → intégration avec collision.
 * Physique en pas fixe (appelé depuis Game), indépendante du framerate.
 */
export class PlayerController {
  private coyoteTimer = 0
  private jumpBufferTimer = 0
  private sprinting = false

  constructor(
    private readonly player: Player,
    private readonly colliders: StaticColliders,
    private readonly input: InputManager,
  ) {}

  queueJump(): void {
    this.jumpBufferTimer = PHYSICS.JUMP_BUFFER
  }

  isSprinting(): boolean {
    return this.sprinting
  }

  update(dt: number, cameraYaw: number): void {
    const p = this.player
    this.coyoteTimer = p.grounded ? PHYSICS.COYOTE_TIME : Math.max(0, this.coyoteTimer - dt)
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt)

    const ix = (this.input.isDown('KeyD') ? 1 : 0) - (this.input.isDown('KeyA') ? 1 : 0)
    const iz = (this.input.isDown('KeyW') ? 1 : 0) - (this.input.isDown('KeyS') ? 1 : 0)
    this.sprinting = this.input.isDown('ShiftLeft') || this.input.isDown('ShiftRight')

    const inputLength = Math.hypot(ix, iz)
    let wishX = 0
    let wishZ = 0
    if (inputLength > 0) {
      const nx = ix / inputLength
      const nz = iz / inputLength
      const sin = Math.sin(cameraYaw)
      const cos = Math.cos(cameraYaw)
      // Avant = direction de la caméra projetée sur le plan XZ
      wishX = -sin * nz + cos * nx
      wishZ = -cos * nz - sin * nx
    }

    const targetSpeed = this.sprinting ? PHYSICS.SPRINT_SPEED : PHYSICS.WALK_SPEED
    const accel = p.grounded ? PHYSICS.GROUND_ACCEL : PHYSICS.AIR_ACCEL
    const decel = p.grounded ? PHYSICS.GROUND_DECEL : PHYSICS.AIR_DECEL

    if (inputLength > 0) {
      p.velocity.x = approach(p.velocity.x, wishX * targetSpeed, accel * dt)
      p.velocity.z = approach(p.velocity.z, wishZ * targetSpeed, accel * dt)
    } else {
      p.velocity.x = approach(p.velocity.x, 0, decel * dt)
      p.velocity.z = approach(p.velocity.z, 0, decel * dt)
    }

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      p.velocity.y = PHYSICS.JUMP_VELOCITY
      this.jumpBufferTimer = 0
      this.coyoteTimer = 0
      p.grounded = false
    }

    p.velocity.y = Math.max(PHYSICS.MAX_FALL_SPEED, p.velocity.y + PHYSICS.GRAVITY * dt)

    this.moveAxis('x', p.velocity.x * dt)
    this.moveAxis('z', p.velocity.z * dt)
    p.grounded = false
    this.moveAxis('y', p.velocity.y * dt)
  }

  private moveAxis(axis: Axis, delta: number): void {
    const p = this.player
    p.position[axis] += delta

    for (let i = 0; i < MAX_COLLISION_ITERATIONS; i++) {
      const box = this.colliders.overlapsPlayer(p.position, PLAYER_DIMS.RADIUS, PLAYER_DIMS.HEIGHT)
      if (!box) return

      if (axis !== 'y') {
        // Escaliers : si le obstacle dépasse peu, on monte dessus
        const stepHeight = box.max.y - p.position.y
        if (stepHeight > 0 && stepHeight <= PLAYER_DIMS.MAX_STEP_HEIGHT) {
          const liftedY = box.max.y + 0.001
          const blockedAbove = this.colliders.overlapsPlayerAt(
            p.position.x,
            liftedY,
            p.position.z,
            PLAYER_DIMS.RADIUS,
            PLAYER_DIMS.HEIGHT,
          )
          if (!blockedAbove) {
            p.position.y = liftedY
            continue
          }
        }
        const radius = PLAYER_DIMS.RADIUS
        p.position[axis] = delta > 0 ? box.min[axis] - radius : box.max[axis] + radius
        p.velocity[axis] = 0
      } else {
        if (delta <= 0) {
          p.position.y = box.max.y
          p.grounded = true
        } else {
          p.position.y = box.min.y - PLAYER_DIMS.HEIGHT
        }
        p.velocity.y = 0
      }
    }
  }
}
