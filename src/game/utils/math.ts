export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function approach(current: number, target: number, delta: number): number {
  if (current < target) return Math.min(current + delta, target)
  return Math.max(current - delta, target)
}

export function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  const twoPi = Math.PI * 2
  const diff = ((((target - current) % twoPi) + twoPi * 1.5) % twoPi) - Math.PI
  return current + diff * (1 - Math.exp(-lambda * dt))
}
