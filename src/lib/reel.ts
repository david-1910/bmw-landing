import {
  chapterChassis,
  chapterInterior,
  chapterRoundel,
  chapterSignoff,
  slogan,
  type ChapterCopy,
} from '@/content'
import { SCENES, type SceneDef } from './scenes'

/**
 * The whole page is one scroll track. Each chapter owns a slice of it, and a
 * chapter is a sequence of *stops*:
 *
 *   [ enter ][ turn to stop 1 ][ hold: veil + read ][ turn to stop 2 ][ hold ]…
 *                                                    └── the same sequence
 *                                                        resumes; the canvas
 *                                                        never cross-fades
 *                                                        between stops.
 *
 * Most chapters have exactly one stop. Scene 2 is a full orbit and has four: a
 * body that rotates past without ever stopping gives the reader nothing to
 * attach a figure to.
 *
 * Only the *last* stop of a chapter cross-fades out, because the next
 * chapter's `enter` overlaps its tail — that overlap is the transition.
 *
 * The page's finale is not a layer of its own. It is the last two stops of
 * scene 3, standing on the same canvas the roundel is already on: a separate
 * outro layer had to fade its own copy of the plate back in, which read as the
 * logo arriving a second time in a new scene.
 *
 * The track opens with a title card, so the first thing on screen is type on
 * black rather than a full-bleed car; scene 1 then surfaces through it using
 * the same overlap as every other transition.
 *
 * Lengths are in vh. A longer scrub means finer frame granularity, which is
 * what keeps a sequence from reading like a flicked film strip.
 */

export const INTRO_HOLD_VH = 150

/**
 * Gap between a leg's last frame and the first hint of its overlay. The scrub
 * carries 0.55s of smoothing, so the sequence is still visibly catching up
 * after a leg ends — without this buffer the copy starts appearing over
 * footage that is still moving.
 */
export const SETTLE_VH = 45

/** How long a stop's copy takes to leave before the next leg starts turning. */
const STATION_EXIT_VH = 90

export interface StationSpec {
  /** A stop can be pure spectacle — the slogan pass carries no copy at all. */
  copy?: ChapterCopy
  /** Where this leg stops in the sequence, as a fraction of the scene's frames. */
  at: number
  scrubVh: number
  holdVh: number
  /** How far the veil closes over the frame. 1 blacks it out entirely. */
  veil?: number
  /** A light stop reads as ink on the studio plate instead of white on ink. */
  tone?: 'dark' | 'light'
  /** A stop may carry a wordmark blended into the frame behind the car. */
  wordmark?: string
  /** A stop may instead drive bands of type through the frame. */
  bands?: readonly string[]
  /**
   * Where the copy sits, relative to where the car is in frame. `center` is
   * the wide spread; `bottom` a band under a tail-on shot; `left` one column
   * beside a subject parked on the other half.
   */
  place?: 'center' | 'bottom' | 'left'
}

export interface ChapterSpec {
  scene: SceneDef
  stations: StationSpec[]
  /** Cross-fade length for this chapter's arrival. */
  enterVh: number
}

/** A chapter read in one go, which is the ordinary case. */
const single = (copy: ChapterCopy, scrubVh: number, holdVh: number): StationSpec[] => [
  { copy, at: 1, scrubVh, holdVh },
]

/*
 * A stop's `holdVh` has to cover three things in order: the veil closing, the
 * copy revealing, and a stretch of pure reading time — before STATION_EXIT_VH
 * (or the next chapter's `enterVh`) eats into its tail. Too short a hold and
 * the body text is still arriving while it is already being faded out.
 */
const CHAPTER_SPECS: ChapterSpec[] = [
  { scene: SCENES['scene-1'], stations: single(chapterInterior, 260, 320), enterVh: 110 },
  {
    scene: SCENES['scene-2'],
    /*
     * Four stops around one orbit, at the quarter points — which is where this
     * footage actually parks the car: frame 38 is three-quarter front, 75 the
     * tail with the diffuser and all four pipes, 113 the far flank and wheels,
     * and 150 comes back round to the nose.
     *
     * The orbit is a closed 360, so the last frame is the *first* view again.
     * That is the trap here: `at: 1` looks like it should be the end of the
     * story and is in fact the beginning of it, which is how the exhaust copy
     * ended up held over the front bumper. Each stop's copy is written to the
     * frame it lands on — re-time these and the copy has to move with them.
     *
     * Legs are equal because the arcs are, so the body turns at one steady
     * rate throughout.
     *
     * The closing stop is the odd one out: the plate stays lit and the copy
     * inverts to ink, which is the ground the wordmark needs in order to blend
     * into the car rather than glow in front of it.
     */
    stations: [
      { copy: chapterChassis[0], at: 0.25, scrubVh: 155, holdVh: 280 },
      { copy: chapterChassis[1], at: 0.5, scrubVh: 155, holdVh: 280 },
      { copy: chapterChassis[2], at: 0.75, scrubVh: 155, holdVh: 280 },
      {
        copy: chapterChassis[3],
        at: 1,
        scrubVh: 155,
        holdVh: 320,
        veil: 0,
        tone: 'light',
        wordmark: 'BMW',
      },
    ],
    enterVh: 90,
  },
  {
    scene: SCENES['scene-3'],
    /*
     * The longest scrub on the page — a slow pull-back to the roundel, which
     * reads as a rushed swipe at the same rate as the others — and then the
     * finale, on the same frame, without ever letting go of it.
     *
     * All three stops sit at `at: 1`, so only the first one actually turns
     * anything; the other two are held on the badge. Their short `scrubVh` is
     * just the gap in which one stop's copy leaves before the next arrives.
     *
     * The first two stops stay light on purpose. Draining to ink to read the
     * powertrain data and then lifting the plate again to show the slogan is
     * exactly the second arrival this scene is meant not to have.
     */
    stations: [
      // The badge ends up on the right of frame, so the data keeps to the left.
      {
        copy: chapterRoundel,
        at: 1,
        scrubVh: 420,
        holdVh: 330,
        veil: 0,
        tone: 'light',
        place: 'left',
      },
      { bands: slogan, at: 1, scrubVh: 70, holdVh: 290, veil: 0, tone: 'light' },
      { copy: chapterSignoff, at: 1, scrubVh: 90, holdVh: 330, place: 'center' },
    ],
    enterVh: 90,
  },
]

export interface StationGeom extends StationSpec {
  index: number
  /** Frame indices this leg turns between. */
  frameFrom: number
  frameTo: number
  /** vh offsets on the shared track. */
  scrubFrom: number
  scrubEnd: number
  holdStart: number
  holdEnd: number
  /** vh offset where its copy starts leaving. */
  exitFrom: number
  /** False when another stop of the same chapter follows. */
  isLastOfChapter: boolean
}

export interface ChapterGeom {
  scene: SceneDef
  index: number
  enterVh: number
  /** vh offset where this layer begins surfacing over the one below. */
  enterFrom: number
  /** vh offset where its first leg starts turning. */
  start: number
  /** vh offset where its last stop is done with the track. */
  end: number
  stations: StationGeom[]
  isLast: boolean
}

const lastStation = (geom: ChapterGeom) => geom.stations[geom.stations.length - 1]

function layoutReel(specs: ChapterSpec[]) {
  const geoms: ChapterGeom[] = []
  let cursor = INTRO_HOLD_VH

  for (const [index, spec] of specs.entries()) {
    const start = cursor
    const stations: StationGeom[] = []
    let frameFrom = 0

    for (const [si, st] of spec.stations.entries()) {
      const frameTo = Math.round((spec.scene.count - 1) * st.at)
      const scrubEnd = cursor + st.scrubVh
      const holdEnd = scrubEnd + st.holdVh
      const isLastOfChapter = si === spec.stations.length - 1

      stations.push({
        ...st,
        index: si,
        frameFrom,
        frameTo,
        scrubFrom: cursor,
        scrubEnd,
        holdStart: scrubEnd + SETTLE_VH,
        holdEnd,
        /*
         * Within a chapter a stop hands straight over to the next leg of the
         * same sequence. The last stop is patched below, once the chapter
         * after it is known.
         */
        exitFrom: isLastOfChapter ? holdEnd : holdEnd - STATION_EXIT_VH,
        isLastOfChapter,
      })

      frameFrom = frameTo
      cursor = holdEnd
    }

    geoms.push({
      scene: spec.scene,
      index,
      enterVh: spec.enterVh,
      enterFrom: start - spec.enterVh,
      start,
      end: cursor,
      stations,
      isLast: index === specs.length - 1,
    })
  }

  // A chapter's last stop leaves exactly as the next chapter begins surfacing.
  for (let i = 0; i < geoms.length - 1; i++) {
    lastStation(geoms[i]).exitFrom = geoms[i + 1].enterFrom
  }

  /*
   * The very last stop of the page has nothing to hand over to, so it keeps
   * its copy to the end of the track — `exitFrom` at its own `holdEnd` is the
   * signal for that, and the layer skips the departure it would otherwise
   * animate.
   */
  return { geoms, totalVh: geoms[geoms.length - 1].end }
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
