import { Group, Vector3 } from 'three'
import { createCharacterMesh, type CharacterRig } from './CharacterMesh'
import { dampAngle } from '../utils/math'

export class Player {
  readonly mesh: Group
  readonly position = new Vector3()
  readonly velocity = new Vector3()
  grounded = false

  private readonly rig: CharacterRig

  constructor(spawn: Vector3, facingYaw: number) {
    this.rig = createCharacterMesh()
    this.mesh = this.rig.group
    this.respawn(spawn, facingYaw)
  }

  respawn(spawn: Vector3, facingYaw: number): void {
    this.position.copy(spawn)
    this.velocity.set(0, 0, 0)
    this.grounded = false
    this.mesh.rotation.set(0, facingYaw, 0)
    this.mesh.position.copy(spawn)
  }

  updateVisual(dt: number): void {
    this.mesh.position.copy(this.position)
    const speed = Math.hypot(this.velocity.x, this.velocity.z)
    if (speed > 0.8) {
      const targetYaw = Math.atan2(this.velocity.x, this.velocity.z)
      this.mesh.rotation.y = dampAngle(this.mesh.rotation.y, targetYaw, 14, dt)
    }
    this.rig.animate(dt, speed, this.grounded, this.velocity.y)
  }
}
