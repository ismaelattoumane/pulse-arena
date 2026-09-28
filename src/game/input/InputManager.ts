export interface MouseDelta {
  dx: number
  dy: number
}

/**
 * Centralise clavier + souris. Le suivi des mouvements de souris n'est actif
 * qu'en pointer lock. Les "pressed" sont consommés une fois par frame.
 */
export class InputManager {
  private readonly keys = new Set<string>()
  private readonly pressed = new Set<string>()
  private mouseDX = 0
  private mouseDY = 0
  private wheelDelta = 0
  pointerLocked = false

  private readonly disposers: Array<() => void> = []

  constructor(
    private readonly target: HTMLElement,
    private readonly onLockChange: (locked: boolean) => void,
  ) {
    const keydown = (e: KeyboardEvent) => {
      if (e.repeat) return
      this.keys.add(e.code)
      this.pressed.add(e.code)
      if (this.pointerLocked && (e.code === 'Space' || e.code.startsWith('Arrow'))) {
        e.preventDefault()
      }
    }
    const keyup = (e: KeyboardEvent) => this.keys.delete(e.code)
    const blur = () => this.keys.clear()
    const mousemove = (e: MouseEvent) => {
      if (!this.pointerLocked) return
      this.mouseDX += e.movementX
      this.mouseDY += e.movementY
    }
    const wheel = (e: WheelEvent) => {
      if (!this.pointerLocked) return
      e.preventDefault()
      this.wheelDelta += e.deltaY
    }
    const contextmenu = (e: Event) => e.preventDefault()
    const lockChange = () => {
      this.pointerLocked = document.pointerLockElement === this.target
      if (!this.pointerLocked) this.keys.clear()
      this.onLockChange(this.pointerLocked)
    }

    window.addEventListener('keydown', keydown)
    window.addEventListener('keyup', keyup)
    window.addEventListener('blur', blur)
    window.addEventListener('mousemove', mousemove)
    target.addEventListener('wheel', wheel, { passive: false })
    target.addEventListener('contextmenu', contextmenu)
    document.addEventListener('pointerlockchange', lockChange)

    this.disposers.push(
      () => window.removeEventListener('keydown', keydown),
      () => window.removeEventListener('keyup', keyup),
      () => window.removeEventListener('blur', blur),
      () => window.removeEventListener('mousemove', mousemove),
      () => target.removeEventListener('wheel', wheel),
      () => target.removeEventListener('contextmenu', contextmenu),
      () => document.removeEventListener('pointerlockchange', lockChange),
    )
  }

  isDown(code: string): boolean {
    return this.keys.has(code)
  }

  wasPressed(code: string): boolean {
    return this.pressed.has(code)
  }

  endFrame(): void {
    this.pressed.clear()
  }

  consumeMouseDelta(): MouseDelta {
    const delta = { dx: this.mouseDX, dy: this.mouseDY }
    this.mouseDX = 0
    this.mouseDY = 0
    return delta
  }

  consumeWheel(): number {
    const wheel = this.wheelDelta
    this.wheelDelta = 0
    return wheel
  }

  dispose(): void {
    this.disposers.forEach((dispose) => dispose())
    this.disposers.length = 0
  }
}
