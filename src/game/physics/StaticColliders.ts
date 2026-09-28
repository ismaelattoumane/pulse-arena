import { Box3, Ray, Vector3 } from 'three'

/**
 * Registre statique de boîtes de collision alignées sur les axes (AABB).
 * Le personnage est approximé par une AABB ; la résolution se fait axe par axe
 * dans PlayerController, ce qui permet de glisser le long des murs.
 */
export class StaticColliders {
  private readonly boxes: Box3[] = []
  private readonly ray = new Ray()
  private readonly hitPoint = new Vector3()

  addBox(center: Vector3, size: Vector3): Box3 {
    const half = size.clone().multiplyScalar(0.5)
    const box = new Box3(center.clone().sub(half), center.clone().add(half))
    this.boxes.push(box)
    return box
  }

  get count(): number {
    return this.boxes.length
  }

  /** Retourne la première boîte qui chevauche la AABB du joueur, ou null. */
  overlapsPlayerAt(x: number, y: number, z: number, radius: number, height: number): Box3 | null {
    for (const box of this.boxes) {
      if (
        x + radius > box.min.x &&
        x - radius < box.max.x &&
        y + height > box.min.y &&
        y < box.max.y &&
        z + radius > box.min.z &&
        z - radius < box.max.z
      ) {
        return box
      }
    }
    return null
  }

  overlapsPlayer(feet: Vector3, radius: number, height: number): Box3 | null {
    return this.overlapsPlayerAt(feet.x, feet.y, feet.z, radius, height)
  }

  /** Distance d'impact le plus proche le long d'un rayon, ou null si aucun. */
  raycast(origin: Vector3, direction: Vector3, far: number): number | null {
    this.ray.origin.copy(origin)
    this.ray.direction.copy(direction)
    let closest: number | null = null
    for (const box of this.boxes) {
      const point = this.ray.intersectBox(box, this.hitPoint)
      if (!point) continue
      const dist = origin.distanceTo(point)
      if (dist <= far && (closest === null || dist < closest)) closest = dist
    }
    return closest
  }
}
