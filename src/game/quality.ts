import type { Quality } from './types'

export interface QualityPreset {
  pixelRatioCap: number
  shadows: boolean
  shadowMapSize: number
}

export const QUALITY_PRESETS: Record<Quality, QualityPreset> = {
  LOW: { pixelRatioCap: 1, shadows: false, shadowMapSize: 512 },
  MEDIUM: { pixelRatioCap: 1.5, shadows: true, shadowMapSize: 1024 },
  HIGH: { pixelRatioCap: 2, shadows: true, shadowMapSize: 2048 },
}
