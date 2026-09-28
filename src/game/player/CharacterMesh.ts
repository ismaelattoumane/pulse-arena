import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three'
import { PHYSICS } from '../constants'
import { clamp } from '../utils/math'

export interface CharacterRig {
  group: Group
  animate: (dt: number, speed: number, grounded: boolean, verticalVelocity: number) => void
}

function standardMaterial(color: number, emissive = 0x000000, emissiveIntensity = 1): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    flatShading: true,
    roughness: 0.75,
    metalness: 0.15,
  })
}

function createMesh(geometry: Mesh['geometry'], material: Mesh['material']): Mesh {
  const mesh = new Mesh(geometry, material)
  mesh.castShadow = true
  return mesh
}

function addMesh(parent: Group, geometry: Mesh['geometry'], material: MeshStandardMaterial, x = 0, y = 0, z = 0): Mesh {
  const mesh = createMesh(geometry, material)
  mesh.position.set(x, y, z)
  parent.add(mesh)
  return mesh
}

/**
 * Personnage placeholder low-poly construit par primitives.
 * Remplaçable plus tard par un vrai modèle : le contrat est le groupe +
 * animate(), le reste du jeu n'en dépend pas.
 */
export function createCharacterMesh(): CharacterRig {
  const body = standardMaterial(0x3b4358)
  const dark = standardMaterial(0x232838)
  const cyan = standardMaterial(0x0e2a33, 0x19e3ff, 2.2)
  const orange = standardMaterial(0x33190a, 0xff9040, 2.2)

  const group = new Group()
  const bodyGroup = new Group()
  group.add(bodyGroup)

  // Jambes (pivot à la hanche pour l'animation de marche)
  const legGeometry = new BoxGeometry(0.22, 0.8, 0.26)
  const footGeometry = new BoxGeometry(0.24, 0.12, 0.36)
  const hipL = new Group()
  hipL.position.set(0.14, 0.8, 0)
  const hipR = new Group()
  hipR.position.set(-0.14, 0.8, 0)
  addMesh(hipL, legGeometry, dark, 0, -0.4, 0)
  addMesh(hipL, footGeometry, body, 0, -0.74, 0.05)
  addMesh(hipR, legGeometry, dark, 0, -0.4, 0)
  addMesh(hipR, footGeometry, body, 0, -0.74, 0.05)
  group.add(hipL, hipR)

  // Torse
  addMesh(bodyGroup, new CylinderGeometry(0.24, 0.3, 0.62, 8), body, 0, 1.11, 0)
  addMesh(bodyGroup, new BoxGeometry(0.22, 0.18, 0.06), cyan, 0, 1.18, 0.27)
  addMesh(bodyGroup, new BoxGeometry(0.34, 0.42, 0.16), dark, 0, 1.12, -0.3)
  addMesh(bodyGroup, new BoxGeometry(0.2, 0.3, 0.04), cyan, 0, 1.12, -0.4)

  // Bras (pivot à l'épaule)
  const armGeometry = new BoxGeometry(0.17, 0.62, 0.19)
  const shoulderGeometry = new BoxGeometry(0.22, 0.12, 0.24)
  const shoulderL = new Group()
  shoulderL.position.set(0.4, 1.36, 0)
  const shoulderR = new Group()
  shoulderR.position.set(-0.4, 1.36, 0)
  addMesh(shoulderL, shoulderGeometry, body, 0, 0.02, 0)
  addMesh(shoulderL, armGeometry, dark, 0, -0.31, 0)
  addMesh(shoulderR, shoulderGeometry, body, 0, 0.02, 0)
  addMesh(shoulderR, armGeometry, dark, 0, -0.31, 0)
  bodyGroup.add(shoulderL, shoulderR)

  // Tête + visor
  addMesh(bodyGroup, new SphereGeometry(0.235, 10, 8), body, 0, 1.62, 0)
  addMesh(bodyGroup, new BoxGeometry(0.28, 0.1, 0.06), orange, 0, 1.64, 0.21)
  addMesh(bodyGroup, new BoxGeometry(0.06, 0.14, 0.3), cyan, 0, 1.84, -0.02)

  let time = 0
  let phase = 0

  const animate = (dt: number, speed: number, grounded: boolean, verticalVelocity: number) => {
    time += dt
    phase += dt * (4 + speed * 2.2)
    const runFactor = clamp(speed / PHYSICS.SPRINT_SPEED, 0, 1)

    let legLAngle = 0
    let legRAngle = 0
    let armLAngle = 0
    let armRAngle = 0
    let bobY = Math.sin(time * 2) * 0.012

    if (grounded) {
      const swing = Math.sin(phase) * (0.22 + 0.5 * runFactor)
      legLAngle = swing
      legRAngle = -swing
      armLAngle = -swing * 0.75
      armRAngle = swing * 0.75
      bobY += Math.abs(Math.sin(phase)) * 0.06 * runFactor
    } else {
      const rising = verticalVelocity > 0
      legLAngle = rising ? -0.55 : 0.35
      legRAngle = rising ? 0.3 : -0.5
      armLAngle = -0.85
      armRAngle = -0.85
    }

    hipL.rotation.x = legLAngle
    hipR.rotation.x = legRAngle
    shoulderL.rotation.x = armLAngle
    shoulderR.rotation.x = armRAngle
    bodyGroup.position.y = bobY
    bodyGroup.rotation.x = runFactor * 0.08
  }

  return { group, animate }
}
