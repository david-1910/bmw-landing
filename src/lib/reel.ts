import { chapterInterior, chapterPerformance, chapterRoundel, type ChapterCopy } from '@/content'
import { SCENES, type SceneDef } from './scenes'

/**
 * The whole page is one scroll track. Each chapter owns a slice of it:
 *
 *   [ enter ][ scrub the sequence ][ hold: darken + read the data ]
 *                                   └── the next chapter's `enter`
 *                                       overlaps this tail, so the new
 *                                       scene surfaces out of the dark
 *                                       instead of cutting in.
 *
 * The track opens with a title card, so the first thing on screen is type on
 * black rather than a full-bleed car; scene 1 then surfaces through it using
 * the same overlap as every other transition.
 *
 * Lengths are in vh. A longer `scrub` means finer frame granularity, which is
 * what keeps a sequence from reading like a flicked film strip.
 */

export const INTRO_HOLD_VH = 150

export interface ChapterSpec {
  scene: SceneDef
  copy: ChapterCopy
  scrubVh: number
  holdVh: number
  /** Cross-fade length for this chapter's arrival. */
  enterVh: number
}

/*
 * `holdVh` has to cover three things in order: the veil darkening, the copy
 * revealing, and a stretch of pure reading time — before the next chapter's
 * `enterVh` eats into its tail. Too short a hold and the body text is still
 * arriving while it is already being faded out.
 */
const CHAPTER_SPECS: ChapterSpec[] = [
  { scene: SCENES['scene-1'], copy: chapterInterior, scrubVh: 260, holdVh: 320, enterVh: 110 },
  { scene: SCENES['scene-2'], copy: chapterPerformance, scrubVh: 280, holdVh: 320, enterVh: 90 },
  // Scene 3 gets the longest scrub: it is a slow pull-back to the roundel and
  // reads as a rushed swipe at the same rate as the others.
  { scene: SCENES['scene-3'], copy: chapterRoundel, scrubVh: 420, holdVh: 290, enterVh: 90 },
]

export interface ChapterGeom extends ChapterSpec {
  index: number
  /** vh offset where this layer begins surfacing over the one below. */
  enterFrom: number
  /** vh offset where its own frame scrub begins. */
  start: number
  scrubEnd: number
  holdEnd: number
  /** vh offset where its copy starts leaving — where the next chapter arrives. */
  exitFrom: number | null
  isLast: boolean
}

function layoutReel(specs: ChapterSpec[]) {
  const geoms: ChapterGeom[] = []
  let cursor = INTRO_HOLD_VH

  for (const [index, spec] of specs.entries()) {
    const start = cursor
    const scrubEnd = start + spec.scrubVh
    const holdEnd = scrubEnd + spec.holdVh
    geoms.push({
      ...spec,
      index,
      enterFrom: start - spec.enterVh,
      start,
      scrubEnd,
      holdEnd,
      exitFrom: null,
      isLast: index === specs.length - 1,
    })
    cursor = holdEnd
  }

  // A chapter's copy leaves exactly as the next one begins surfacing.
  for (let i = 0; i < geoms.length - 1; i++) {
    geoms[i].exitFrom = geoms[i + 1].enterFrom
  }

  return { geoms, totalVh: cursor }
}

/*
 * Computed once at module load. This must never be rebuilt per render: the
 * geoms are useGSAP dependencies, and fresh objects would tear down and
 * recreate every ScrollTrigger on each render — which scrambles the scrubbed
 * from/to states and leaves the canvases painting bare plate.
 */
export const REEL = layoutReel(CHAPTER_SPECS)

/** The title card holds until scene 1 has finished surfacing over it. */
export const INTRO_GEOM = {
  exitFrom: REEL.geoms[0].enterFrom,
  exitTo: REEL.geoms[0].start,
} as const

export const CHAPTERS = CHAPTER_SPECS
