/**
 * The three frame sequences in public/. Every folder is numbered contiguously
 * from 001, so a frame URL is pure arithmetic — no manifest, no import.meta.glob
 * (bundling 420 images would be pointless when Vite serves public/ verbatim).
 */

export type SceneId = 'scene-1' | 'scene-2' | 'scene-3'

export interface SceneDef {
  id: SceneId
  /** Total frames in the folder, numbered 001..count. */
  count: number
  /** Shown in the on-screen HUD label. */
  index: string
  title: string
}

/** `title` names the subject of the chapter, not the camera move. */
export const SCENES: Record<SceneId, SceneDef> = {
  'scene-1': { id: 'scene-1', count: 120, index: '01', title: 'Interior' },
  'scene-2': { id: 'scene-2', count: 150, index: '02', title: 'Chassis & Body' },
  'scene-3': { id: 'scene-3', count: 150, index: '03', title: 'Powertrain' },
}

export const SCENE_ORDER: SceneId[] = ['scene-1', 'scene-2', 'scene-3']

/** `i` is a zero-based frame index. */
export function frameUrl(scene: SceneDef, i: number): string {
  const n = Math.min(Math.max(i, 0), scene.count - 1) + 1
  return `/${scene.id}/ezgif-frame-${String(n).padStart(3, '0')}.jpg`
}

export const firstFrameUrl = (scene: SceneDef) => frameUrl(scene, 0)
export const lastFrameUrl = (scene: SceneDef) => frameUrl(scene, scene.count - 1)
