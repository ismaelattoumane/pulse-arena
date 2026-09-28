import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from 'three'
import { StaticColliders } from '../physics/StaticColliders'
import { WORLD } from '../constants'

interface ArenaMaterials {
  floor: MeshStandardMaterial
  structure: MeshStandardMaterial
  dark: MeshStandardMaterial
  neonCyan: MeshStandardMaterial
  neonOrange: MeshStandardMaterial
  padCyan: MeshStandardMaterial
}

/**
 * Arène 1v1 low-poly : plateforme centrale surélevée avec escaliers,
 * piliers, couverts, deux "hubs" ouverts et deux spawns éloignés.
 * Tous les blocs solides alimentent la liste de collision AABB.
 */
export class Arena {
  readonly group = new Group()
  readonly colliders = new StaticColliders()
  readonly spawnA = new Vector3(-24, 0, 0)
  readonly spawnB = new Vector3(24, 0, 0)

  constructor() {
    const materials = this.makeMaterials()
    this.buildFloor(materials)
    this.buildPerimeter(materials)
    this.buildCenterStructure(materials)
    this.buildPillars(materials)
    this.buildCover(materials)
    this.buildHub(materials, -18, -14, 1)
    this.buildHub(materials, 18, 14, -1)
    this.buildSpawnPads(materials)
    this.buildOuterDecor(materials)
  }

  private makeMaterials(): ArenaMaterials {
    return {
      floor: new MeshStandardMaterial({ map: this.makeGridTexture(), roughness: 0.9, metalness: 0.1 }),
      structure: new MeshStandardMaterial({ color: 0x4a5268, flatShading: true, roughness: 0.8, metalness: 0.1 }),
      dark: new MeshStandardMaterial({ color: 0x262c3d, flatShading: true, roughness: 0.85, metalness: 0.1 }),
      neonCyan: new MeshStandardMaterial({ color: 0x06232b, emissive: 0x19e3ff, emissiveIntensity: 2.4 }),
      neonOrange: new MeshStandardMaterial({ color: 0x2b1206, emissive: 0xff9040, emissiveIntensity: 2.4 }),
      padCyan: new MeshStandardMaterial({ color: 0x0a2e38, emissive: 0x19e3ff, emissiveIntensity: 1.1 }),
    }
  }

  private makeGridTexture(): CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#2b3140'
    ctx.fillRect(0, 0, 256, 256)
    ctx.strokeStyle = 'rgba(56, 224, 255, 0.16)'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, 254, 254)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.lineWidth = 1
    for (let i = 64; i < 256; i += 64) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, 256)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(256, i)
      ctx.stroke()
    }
    const texture = new CanvasTexture(canvas)
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.repeat.set(30, 30)
    texture.colorSpace = SRGBColorSpace
    return texture
  }

  private addBlock(
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
    material: MeshStandardMaterial | MeshBasicMaterial,
    collide = true,
    shadows = true,
  ): Mesh {
    const mesh = new Mesh(new BoxGeometry(sx, sy, sz), material)
    mesh.position.set(x, y, z)
    mesh.castShadow = shadows
    mesh.receiveShadow = shadows
    this.group.add(mesh)
    if (collide) {
      this.colliders.addBox(new Vector3(x, y, z), new Vector3(sx, sy, sz))
    }
    return mesh
  }

  private buildFloor(m: ArenaMaterials): void {
    const size = WORLD.ARENA_HALF * 2
    const floor = new Mesh(new BoxGeometry(size, 2, size), m.floor)
    floor.position.y = -1
    floor.receiveShadow = true
    this.group.add(floor)
    this.colliders.addBox(new Vector3(0, -1, 0), new Vector3(size, 2, size))
  }

  private buildPerimeter(m: ArenaMaterials): void {
    const h = WORLD.WALL_HEIGHT
    const half = WORLD.ARENA_HALF
    const len = half * 2 + 1

    this.addBlock(len, h, 0.8, 0, h / 2, -half, m.dark)
    this.addBlock(len, h, 0.8, 0, h / 2, half, m.dark)
    this.addBlock(0.8, h, len, -half, h / 2, 0, m.dark)
    this.addBlock(0.8, h, len, half, h / 2, 0, m.dark)

    // Liserés néon au sommet des murs
    this.addBlock(len, 0.12, 0.9, 0, h + 0.06, -half, m.neonCyan, false, false)
    this.addBlock(len, 0.12, 0.9, 0, h + 0.06, half, m.neonCyan, false, false)
    this.addBlock(0.9, 0.12, len, -half, h + 0.06, 0, m.neonCyan, false, false)
    this.addBlock(0.9, 0.12, len, half, h + 0.06, 0, m.neonCyan, false, false)

    // Piliers d'angle
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        this.addBlock(1.6, h + 1.2, 1.6, sx * half, (h + 1.2) / 2, sz * half, m.dark)
        this.addBlock(1.8, 0.14, 1.8, sx * half, h + 1.27, sz * half, m.neonOrange, false, false)
      }
    }
  }

  private buildCenterStructure(m: ArenaMaterials): void {
    // Plateforme centrale 10x10, hauteur 2
    this.addBlock(10, 2, 10, 0, 1, 0, m.structure)
    this.addBlock(10.2, 0.1, 0.25, 0, 2.06, -5, m.neonCyan, false, false)
    this.addBlock(10.2, 0.1, 0.25, 0, 2.06, 5, m.neonCyan, false, false)
    this.addBlock(0.25, 0.1, 10.2, -5, 2.06, 0, m.neonCyan, false, false)
    this.addBlock(0.25, 0.1, 10.2, 5, 2.06, 0, m.neonCyan, false, false)

    // Escaliers nord et sud : 4 marches de 0.5 (escalables)
    this.buildStairs(m, 1)
    this.buildStairs(m, -1)
  }

  private buildStairs(m: ArenaMaterials, side: 1 | -1): void {
    for (let k = 0; k < 4; k++) {
      const height = 0.5 * (k + 1)
      const z = side * (5 + 0.75 * (3 - k) + 0.375)
      this.addBlock(6, height, 0.75, 0, height / 2, z, m.structure)
    }
  }

  private buildPillars(m: ArenaMaterials): void {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        this.addBlock(1.5, 6, 1.5, sx * 13, 3, sz * 13, m.dark)
        this.addBlock(1.7, 0.16, 1.7, sx * 13, 6.08, sz * 13, m.neonCyan, false, false)
      }
    }
  }

  private buildCover(m: ArenaMaterials): void {
    this.addBlock(4, 1.6, 1.2, -8, 0.8, 10, m.structure)
    this.addBlock(4, 1.6, 1.2, 8, 0.8, -10, m.structure)
    this.addBlock(1.2, 1.2, 1.2, -6, 0.6, -6, m.dark)
    this.addBlock(1.2, 1.2, 1.2, 6, 0.6, 6, m.dark)
    this.addBlock(1.2, 1.2, 1.2, 12, 0.6, -4, m.dark)
    this.addBlock(1.2, 1.2, 1.2, -12, 0.6, 4, m.dark)
  }

  /** Petit bâtiment ouvert d'un côté (porte de 2.2m avec linteau). */
  private buildHub(m: ArenaMaterials, cx: number, cz: number, doorFacing: 1 | -1): void {
    const h = 2.8
    const t = 0.4
    const wallX = 3.5

    this.addBlock(7, h, t, cx, h / 2, cz - 3, m.structure)
    this.addBlock(7, h, t, cx, h / 2, cz + 3, m.structure)
    this.addBlock(t, h, 6.4, cx - doorFacing * wallX, h / 2, cz, m.structure)
    this.addBlock(t, h, 1.9, cx + doorFacing * wallX, h / 2, cz - 2.05, m.structure)
    this.addBlock(t, h, 1.9, cx + doorFacing * wallX, h / 2, cz + 2.05, m.structure)
    this.addBlock(t, 0.6, 2.2, cx + doorFacing * wallX, 2.5, cz, m.structure)

    this.addBlock(7.6, 0.3, 6.6, cx, h + 0.15, cz, m.dark)
    this.addBlock(7.8, 0.1, 0.25, cx, h + 0.35, cz - 3.3, m.neonOrange, false, false)
    this.addBlock(7.8, 0.1, 0.25, cx, h + 0.35, cz + 3.3, m.neonOrange, false, false)
  }

  private buildSpawnPads(m: ArenaMaterials): void {
    for (const spawn of [this.spawnA, this.spawnB]) {
      const pad = new Mesh(new CylinderGeometry(1.3, 1.5, 0.12, 24), m.padCyan)
      pad.position.set(spawn.x, 0.06, spawn.z)
      pad.receiveShadow = true
      this.group.add(pad)

      const ring = new Mesh(new TorusGeometry(1.05, 0.06, 8, 32), m.neonOrange)
      ring.rotation.x = -Math.PI / 2
      ring.position.set(spawn.x, 0.14, spawn.z)
      this.group.add(ring)
    }
  }

  /** Silhouettes décoratives hors arène, voilées par le brouillard. */
  private buildOuterDecor(m: ArenaMaterials): void {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        this.addBlock(2.5, 10, 2.5, sx * 42, 3, sz * 42, m.dark, false, false)
        this.addBlock(2.7, 0.2, 2.7, sx * 42, 8.1, sz * 42, m.neonCyan, false, false)
      }
    }
  }
}
