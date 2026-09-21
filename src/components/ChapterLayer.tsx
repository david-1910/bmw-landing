import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useCallback, useEffect, useRef, useState } from 'react'
import { drawFrame, nearestLoaded, PLATE, sizeCanvas, type FitMode } from '@/lib/canvasStage'
import type { ChapterGeom, StationGeom } from '@/lib/reel'
import { framesOf, useSceneFrames } from '@/lib/useSceneFrames'

gsap.registerPlugin(ScrollTrigger, useGSAP)

interface Props {
  geom: ChapterGeom
  /** The shared scroll track every trigger is measured against. */
  track: HTMLElement | null
  fit: FitMode
}

/** Shortest window a stop's copy may reveal over, in vh. */
const MIN_REVEAL = 60

/** How far the wordmark leans with the pointer, in degrees. */
const TILT = 11

/**
 * The wordmark's own colour before it is multiplied into the frame. A mid
 * grey, not ink: see the note where it is rendered.
 */
const WORDMARK_INK = '#787f82'

/** Repeats of a band's phrase; enough that it still spans at either extreme. */
const REPEATS = 5

/** A marquee is one phrase repeated; the index is the only key there is. */
const marquee = (text: string) =>
  Array.from({ length: REPEATS }, (_, i) => (
    <span key={`${text}-${i}`} className="px-[0.22em]">
      {text}
      <span aria-hidden className="px-[0.4em] opacity-40">
        &bull;
      </span>
    </span>
  ))

/** Lifts the plate back to a readable ground under a light stop's copy. */
const PLATE_SCRIM =
  'linear-gradient(to top, rgba(205,211,214,0.97) 0%, rgba(205,211,214,0.88) 38%, rgba(205,211,214,0) 100%)'

/** The same, for a centred light stop: a side wash rather than a floor. */
const PLATE_WASH =
  'linear-gradient(to right, rgba(205,211,214,0.96) 0%, rgba(205,211,214,0.82) 46%, rgba(205,211,214,0) 74%)'

/**
 * A light stop is read as ink on the lit studio plate; a dark one as white on
 * the closed veil. Two palettes rather than one set of opacity utilities,
 * because a `text-white/42` label is illegible on the plate and a `text-ink/50`
 * one is invisible on the veil.
 */
const TONES = {
  dark: {
    head: 'text-white',
    body: 'text-white/64',
    label: 'text-white/42',
    border: 'border-white/12',
  },
  light: {
    head: 'text-ink',
    body: 'text-ink/72',
    label: 'text-ink/55',
    border: 'border-ink/15',
  },
} as const

/**
 * One scene of the reel: its canvas, the veil that darkens it, and a block of
 * data per stop. Layers stack in DOM order, so this one's canvas rises over the
 * darkened chapter beneath — that overlap *is* the transition.
 *
 * A chapter with several stops turns its sequence in legs, halting at each one
 * to hold a block of copy against the frozen frame, then resuming. The canvas
 * is continuous throughout: only the veil and the copy come and go.
 */
export function ChapterLayer({ geom, track, fit }: Props) {
  const { scene } = geom

  const layerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const head = useRef({ i: 0 })

  const [awake, setAwake] = useState(geom.index === 0)
  const { progress } = useSceneFrames(scene, awake)

  const wordmarkOf = geom.stations.find((st) => st.wordmark)
  const bandsOf = geom.stations.find((st) => st.bands?.length)

  /*
   * Reads the frame array from the cache on every call rather than closing
   * over it. `paint` is invoked from a GSAP tween, a ResizeObserver and an
   * effect, and a closure captured before the frames landed would paint bare
   * plate over a good draw — which is what made whole scenes go blank.
   * Depending only on stable values also means the ScrollTriggers are built
   * once, not rebuilt on each of the ~150 loading re-renders.
   */
  const paint = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const { w, h } = sizeCanvas(canvas)
    const img = nearestLoaded(framesOf(scene.id), Math.round(head.current.i))

    if (img) drawFrame(ctx, img, w, h, fit)
    else {
      ctx.fillStyle = PLATE
      ctx.fillRect(0, 0, w, h)
    }
  }, [scene.id, fit])

  const paintRef = useRef(paint)
  useEffect(() => {
    paintRef.current = paint
  }, [paint])

  /* Wake this chapter's frames a screen or so before it surfaces. */
  useEffect(() => {
    if (awake || !track) return

    const check = () => {
      const scrolled = -track.getBoundingClientRect().top
      if (scrolled > (geom.enterFrom - 140) * window.innerHeight * 0.01) {
        setAwake(true)
        return true
      }
      return false
    }
    if (check()) return

    const onScroll = () => {
      if (check()) window.removeEventListener('scroll', onScroll)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [awake, geom.enterFrom, track])

  useGSAP(
    () => {
      const layer = layerRef.current
      if (!track || !layer) return

      const q = gsap.utils.selector(layerRef)
      const px = (vh: number) => vh * window.innerHeight * 0.01
      const at = (vh: number) => () => `top top-=${px(vh)}`
      /* Timeline time is measured in vh from where the chapter starts arriving. */
      const rel = (vh: number) => vh - geom.enterFrom

      const made: gsap.core.Animation[] = []

      /**
       * One scrubbed timeline spanning the whole chapter, positioned in vh.
       *
       * A shared target — the veil, the HUD, the frame head — *must* be driven
       * from a single timeline rather than one tween per stop. Several scrubbed
       * tweens on the same property all write on every tick, and the one
       * created last wins no matter where the reader actually is, so the veil
       * would snap open the moment the fourth stop's tween existed.
       *
       * Every segment is a `fromTo`: a plain `to` captures its start value the
       * first time it renders, which with a scrub can be at any point in the
       * chapter and in any direction.
       */
      const span = geom.end - geom.enterFrom
      const chapterTl = (vars: gsap.TimelineVars = {}) => {
        const tl = gsap.timeline({
          ...vars,
          scrollTrigger: {
            trigger: track,
            start: at(geom.enterFrom),
            end: at(geom.end),
            scrub: 0.55,
            invalidateOnRefresh: true,
          },
        })
        /*
         * Pin the timeline to the chapter's full length before anything is
         * added to it. A scrub maps its whole scroll range onto the timeline's
         * *own* duration, and a timeline's duration is only as long as its
         * last segment — so one that finishes early gets stretched to fill the
         * range and runs fast. That is not a rounding error: the veil closes
         * over a stop whose copy left ten screens ago, and every stop's data
         * drifts further out of step than the one before it.
         */
        tl.to({}, { duration: span }, 0)
        made.push(tl)
        return tl
      }

      const seg = (
        tl: gsap.core.Timeline,
        target: gsap.TweenTarget,
        from: gsap.TweenVars,
        to: number,
        vars: gsap.TweenVars,
        start: number,
      ) =>
        tl.fromTo(
          target,
          from,
          {
            ...vars,
            ease: vars.ease ?? 'none',
            duration: Math.max(to - start, 1),
            /*
             * The one setting this whole file depends on.
             *
             * A `fromTo` paints its start values on the first tick even when
             * it sits far down the timeline, so with several segments on one
             * target the last one created wins — a block's *exit* would set it
             * back to opacity 1 and undo the hidden state it is supposed to
             * begin in. Every initial state is therefore declared once with
             * `gsap.set` below, and no segment is allowed to pre-empt it; each
             * one initialises when the playhead actually reaches it.
             */
            immediateRender: false,
          },
          rel(start),
        )

      /** Reading window of a stop: from the first hint of copy to its exit. */
      const revealOf = (st: StationGeom) => Math.max(st.exitFrom - st.holdStart, MIN_REVEAL)

      const canvas = q('[data-el="canvas"]')
      const veil = q('[data-el="veil"]')
      const hud = q('[data-el="hud"]')
      const wordmark = q('[data-el="wordmark"]')
      const bandFar = q('[data-el="band-far"]')
      const bandNear = q('[data-el="band-near"]')
      const last = geom.stations[geom.stations.length - 1]
      /*
       * A stop without copy renders no block, so the blocks cannot be indexed
       * by stop number — they are keyed by it instead.
       */
      const blockOf = (st: StationGeom) =>
        layer.querySelector<HTMLElement>(`[data-station="${st.index}"]`)

      /* The very last stop of the page has nothing to hand over to. */
      const staysToTheEnd = (st: StationGeom) => st.exitFrom >= st.holdEnd

      /* The sequence itself, one leg per stop. Gaps between legs hold the
         last frame, which is what a stop *is*. */
      const headTl = chapterTl({ onUpdate: () => paintRef.current() })
      for (const st of geom.stations) {
        seg(headTl, head.current, { i: st.frameFrom }, st.scrubEnd, { i: st.frameTo }, st.scrubFrom)
      }

      /*
       * Arrival: the scene settles forward out of the dark rather than cutting.
       * Every chapter has an entrance — the first one surfaces through the
       * title card, so it must start hidden too.
       */
      const stageTl = chapterTl()
      if (geom.enterVh > 0) {
        seg(stageTl, layer, { opacity: 0 }, geom.start, { opacity: 1 }, geom.enterFrom)
        seg(
          stageTl,
          canvas,
          { scale: 1.07, filter: 'blur(7px)' },
          geom.start + 40,
          { scale: 1, filter: 'blur(0px)' },
          geom.enterFrom,
        )
      } else {
        gsap.set(layer, { opacity: 1 })
        gsap.set(canvas, { scale: 1, filter: 'blur(0px)' })
      }

      /* Departure: this scene recedes as the next one rises through it. */
      if (!staysToTheEnd(last)) {
        seg(stageTl, canvas, { scale: 1 }, last.holdEnd, { scale: 1.05 }, last.exitFrom)
      }

      /*
       * The veil closes over each stop and opens again as the sequence resumes.
       * `standing` tracks what it was left at, so every segment states both
       * ends explicitly.
       */
      const veilTl = chapterTl()
      let standing = 0
      for (const st of geom.stations) {
        const shut = st.veil ?? 1
        const reveal = revealOf(st)
        seg(
          veilTl,
          veil,
          { opacity: standing },
          st.holdStart + reveal * 0.42,
          { opacity: shut },
          st.holdStart,
        )
        standing = shut
        if (!st.isLastOfChapter) {
          seg(veilTl, veil, { opacity: shut }, st.holdEnd, { opacity: 0 }, st.exitFrom)
          standing = 0
        }
      }

      /* The marker belongs to the moving footage: it retires as each frame
         freezes, which also stops two stops' labels colliding mid-fade. It only
         comes back if the stop after this one actually turns the sequence —
         scene 3's finale stops sit on one frame, and a label blinking in and
         out between them would announce a cut that is not happening. */
      const hudTl = chapterTl()
      for (const [i, st] of geom.stations.entries()) {
        const next = geom.stations[i + 1]
        const reveal = revealOf(st)
        seg(hudTl, hud, { opacity: 1 }, st.holdStart + reveal * 0.25, { opacity: 0 }, st.scrubEnd)
        if (next && next.frameTo !== next.frameFrom) {
          seg(hudTl, hud, { opacity: 0 }, st.holdEnd, { opacity: 1 }, st.exitFrom)
        }
      }

      /*
       * The bands' fixed depth. `z` and `rotationX` never animate, so they are
       * set once and only `rotationY` and `xPercent` are scrubbed — which also
       * keeps each band's transform to a single tween and out of the
       * shared-target trap the timelines above exist to avoid.
       */
      gsap.set(bandFar, { z: -260, rotationX: -7, opacity: 0, xPercent: 6, rotationY: 24 })
      gsap.set(bandNear, { z: 190, rotationX: 5, opacity: 0, xPercent: -46, rotationY: 24 })

      /*
       * Every hidden state has to be set here as well as stated as a `fromTo`
       * start, and this is not belt and braces.
       *
       * A `fromTo` placed part-way along a timeline does not apply its start
       * values when the timeline is built — only when the playhead first
       * reaches it. So until the reader scrolls into a stop, that stop's copy
       * is simply at its natural position: fully opaque, unshifted, and drawn
       * on top of whichever stop is actually being read. Four stops meant four
       * headlines stacked on one another.
       *
       * (A stagger makes it worse still, since each target starts at its own
       * offset, but the plain case is enough to break it.)
       *
       * The block itself starts hidden rather than merely holding hidden
       * children, because not everything inside one is text: a light stop
       * carries a plate-coloured scrim, and hiding only the copy left that
       * scrim lying over the closed veil of every dark stop before it, as a
       * pale wash across the bottom of the screen.
       */
      gsap.set(head.current, { i: 0 })
      gsap.set(veil, { opacity: 0 })
      gsap.set(hud, { opacity: 1 })
      gsap.set(wordmark, { opacity: 0, scale: 1.26 })
      if (geom.enterVh > 0) {
        gsap.set(layer, { opacity: 0 })
        gsap.set(canvas, { scale: 1.07, filter: 'blur(7px)' })
      }
      for (const st of geom.stations) {
        const root = blockOf(st)
        if (!root) continue
        const sq = gsap.utils.selector(root)
        gsap.set(root, { opacity: 0, y: 0 })
        gsap.set(sq('[data-reveal="line"]'), { yPercent: 115 })
        gsap.set(sq('[data-reveal="rule"]'), { scaleX: 0 })
        gsap.set(sq('[data-reveal="soft"]'), { opacity: 0, y: 28 })
      }

      /* The copy of each stop, plus whatever spectacle that stop carries. */
      const copyTl = chapterTl()
      for (const st of geom.stations) {
        const reveal = revealOf(st)
        /* Stagger is in the timeline's own units, so it scales with the stop. */
        const step = reveal * 0.05
        const root = blockOf(st)

        if (root) {
          const sq = gsap.utils.selector(root)
          /* The block arrives just ahead of its first line, scrim and all. */
          seg(
            copyTl,
            root,
            { opacity: 0 },
            st.holdStart + reveal * 0.14,
            { opacity: 1 },
            st.holdStart,
          )
          seg(
            copyTl,
            sq('[data-reveal="line"]'),
            { yPercent: 115 },
            st.holdStart + reveal * 0.6,
            { yPercent: 0, stagger: step, ease: 'power2.out' },
            st.holdStart + reveal * 0.14,
          )
          seg(
            copyTl,
            sq('[data-reveal="rule"]'),
            { scaleX: 0 },
            st.holdStart + reveal * 0.62,
            { scaleX: 1, ease: 'power2.out' },
            st.holdStart + reveal * 0.34,
          )
          seg(
            copyTl,
            sq('[data-reveal="soft"]'),
            { opacity: 0, y: 28 },
            st.holdStart + reveal * 0.7,
            { opacity: 1, y: 0, stagger: step, ease: 'power2.out' },
            st.holdStart + reveal * 0.36,
          )
          if (!staysToTheEnd(st)) {
            seg(
              copyTl,
              root,
              { opacity: 1, y: 0 },
              st.holdEnd,
              { opacity: 0, y: -30, ease: 'power2.in' },
              st.exitFrom,
            )
          }
        }

        if (st.wordmark && wordmark.length) {
          seg(
            copyTl,
            wordmark,
            { opacity: 0, scale: 1.26 },
            st.holdStart + reveal * 0.66,
            { opacity: 1, scale: 1, ease: 'power2.out' },
            st.scrubEnd,
          )
          seg(
            copyTl,
            wordmark,
            { opacity: 1 },
            st.holdEnd,
            { opacity: 0, ease: 'power2.in' },
            st.exitFrom,
          )
        }

        /*
         * The slogan pass. Both bands cross the frame over the whole stop so
         * they scissor past each other, and they share a rotation sweep so the
         * vanishing point drifts — without that the parallax reads as two flat
         * layers sliding rather than as depth.
         */
        if (st.bands && bandFar.length) {
          const span = st.holdEnd - st.scrubFrom
          const lit = st.scrubFrom + span * 0.22
          const dim = st.scrubFrom + span * 0.82

          seg(copyTl, bandFar, { opacity: 0 }, lit, { opacity: 1 }, st.scrubFrom)
          seg(copyTl, bandNear, { opacity: 0 }, lit, { opacity: 1 }, st.scrubFrom)
          seg(
            copyTl,
            bandFar,
            { xPercent: 6, rotationY: 24 },
            st.holdEnd,
            { xPercent: -40, rotationY: -22 },
            st.scrubFrom,
          )
          seg(
            copyTl,
            bandNear,
            { xPercent: -46, rotationY: 24 },
            st.holdEnd,
            { xPercent: 4, rotationY: -20 },
            st.scrubFrom,
          )
          seg(copyTl, bandFar, { opacity: 1 }, st.holdEnd, { opacity: 0 }, dim)
          seg(copyTl, bandNear, { opacity: 1 }, st.holdEnd, { opacity: 0 }, dim)
        }
      }

      return () => {
        for (const anim of made) {
          anim.scrollTrigger?.kill()
          anim.kill()
        }
      }
    },
    { dependencies: [geom.index, scene.count, track], scope: layerRef },
  )

  /*
   * The wordmark follows the pointer. It is the only thing on the page that
   * answers to something other than scroll, so it needs its own lifecycle: the
   * listener is only live while the stop that carries it is on screen,
   * otherwise a cursor moving over the footer would still be steering it.
   *
   * Until the pointer arrives it sways on its own — on a phone it never will,
   * and a dead wordmark would read as a bug rather than as an invitation.
   */
  useEffect(() => {
    const layer = layerRef.current
    const wm = layer?.querySelector<HTMLElement>('[data-el="wordmark"]')
    if (!track || !layer || !wm || !wordmarkOf) return

    const px = (vh: number) => vh * window.innerHeight * 0.01
    const rotY = gsap.quickTo(wm, 'rotationY', { duration: 0.7, ease: 'power3' })
    const rotX = gsap.quickTo(wm, 'rotationX', { duration: 0.7, ease: 'power3' })

    let idle: gsap.core.Tween | null = null
    let live = false

    const sway = () => {
      idle?.kill()
      idle = gsap.fromTo(
        wm,
        { rotationY: -TILT * 0.45 },
        {
          rotationY: TILT * 0.45,
          duration: 3.6,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        },
      )
    }

    const onMove = (e: PointerEvent) => {
      if (!live) return
      idle?.kill()
      idle = null
      const r = layer.getBoundingClientRect()
      const nx = (e.clientX - r.left) / r.width - 0.5
      const ny = (e.clientY - r.top) / r.height - 0.5
      rotY(nx * TILT * 2)
      rotX(-ny * TILT * 1.2)
    }

    const st = ScrollTrigger.create({
      trigger: track,
      start: () => `top top-=${px(wordmarkOf.scrubEnd)}`,
      end: () => `top top-=${px(wordmarkOf.holdEnd)}`,
      invalidateOnRefresh: true,
      onToggle: (self) => {
        live = self.isActive
        if (self.isActive) sway()
        else {
          idle?.kill()
          idle = null
          rotY(0)
          rotX(0)
        }
      },
    })

    window.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('pointermove', onMove)
      idle?.kill()
      gsap.killTweensOf(wm)
      st.kill()
    }
  }, [track, wordmarkOf])

  /* Repaint as frames stream in and on resize. */
  useEffect(() => {
    paint()
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => paint())
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [paint, progress])

  return (
    <div
      ref={layerRef}
      className="absolute inset-0"
      aria-label={`${scene.index} — ${scene.title}`}
      /*
        `isolation` keeps the wordmark's blend inside this chapter — without it
        it would composite against whatever scene is stacked underneath — and
        `perspective` is what turns its pointer lean into an actual rotation
        rather than a squash. Perspective only reaches one level down, so the
        wordmark has to stay a direct child of this element, with nothing
        transformed in between.
      */
      style={{ isolation: 'isolate', perspective: '1400px' }}
    >
      <canvas
        data-el="canvas"
        ref={canvasRef}
        className="block h-full w-full will-change-transform"
      />

      {/*
        The wordmark sits between the frame and the veil, multiplied into the
        footage rather than drawn on top of it. Its grey is the whole trick: a
        near-black would multiply to near-black over everything and just sit
        there as a flat sticker. At WORDMARK_INK the letters only *darken* what
        is behind them, so the car's own highlights and panel shading carry
        straight through the glyphs — and wherever the car is already darker
        than the ink (glass, tyres, the diffuser) the letters are swallowed
        whole and the body reads as standing in front of its own name.
      */}
      {wordmarkOf && (
        <span
          data-el="wordmark"
          aria-hidden
          className="display-xl pointer-events-none absolute inset-0 flex items-center justify-center whitespace-nowrap text-[clamp(6rem,30vw,26rem)] leading-none will-change-transform"
          style={{ color: WORDMARK_INK, mixBlendMode: 'multiply' }}
        >
          {wordmarkOf.wordmark}
        </span>
      )}

      {/*
        The slogan pass, on the same terms as the wordmark and for the same
        reason: these are composited into the frame, not laid over it.

          - the `multiply` band, ink on the lit plate — multiplying into the
            black of the roundel yields black, so the words are swallowed where
            they cross it and read as passing *behind* the badge;
          - the `exclusion` band, white — inverted to dark over the plate but
            bright over the roundel, so it reads as passing *in front* of it.

        They are direct children for the same reason the wordmark is: a
        transformed wrapper would close the blend group and leave them
        compositing against nothing.
      */}
      {bandsOf?.bands && (
        <>
          <p
            data-el="band-far"
            aria-hidden
            className="display-xl pointer-events-none absolute top-[30%] left-0 w-max whitespace-nowrap text-[clamp(3.4rem,11vw,10rem)] text-ink will-change-transform"
            style={{ mixBlendMode: 'multiply' }}
          >
            {marquee(bandsOf.bands[0])}
          </p>
          <p
            data-el="band-near"
            aria-hidden
            className="display-lg pointer-events-none absolute top-[52%] left-0 w-max whitespace-nowrap text-[clamp(2.6rem,8vw,7.5rem)] text-white will-change-transform"
            style={{ mixBlendMode: 'exclusion' }}
          >
            {marquee(bandsOf.bands[1] ?? bandsOf.bands[0])}
          </p>
        </>
      )}

      {/* The darkening that dark-toned data is read against. */}
      <div data-el="veil" className="absolute inset-0 bg-ink opacity-0" />

      {/* One block of data per stop that has any — held on the frozen frame. */}
      {geom.stations.map((st) => {
        const copy = st.copy
        if (!copy) return null

        const light = st.tone === 'light'
        const tone = TONES[light ? 'light' : 'dark']
        /*
         * Where the copy goes is a function of where the car is, so a light
         * stop never defaults to the centre spread: that puts the data column
         * straight over the subject. A tail-on shot clears the bottom; a badge
         * parked to one side clears the opposite half.
         */
        const place = st.place ?? (light ? 'bottom' : 'center')
        const bottom = place === 'bottom'
        const aside = place === 'left'
        return (
          <div
            key={st.index}
            data-station={st.index}
            className={`absolute inset-0 flex px-6 md:px-12 lg:px-20 ${
              bottom ? 'items-end pb-12 md:pb-16' : 'items-center'
            }`}
          >
            {/* Ink on a lit plate needs a floor: the car's lower body sits
                exactly where this copy does. */}
            {light && (
              <div
                aria-hidden
                className={`pointer-events-none absolute inset-x-0 ${
                  bottom ? 'bottom-0 h-[62%]' : 'inset-y-0'
                }`}
                style={{ backgroundImage: bottom ? PLATE_SCRIM : PLATE_WASH }}
              />
            )}

            <div className="relative mx-auto grid w-full max-w-[100rem] gap-y-9 md:grid-cols-12 md:gap-x-10">
              <div
                className={
                  bottom
                    ? 'md:col-span-5'
                    : aside
                      ? 'md:col-span-6 lg:col-span-5'
                      : 'md:col-span-7 lg:col-span-6'
                }
              >
                <span className="block overflow-hidden pb-1">
                  <span data-reveal="line" className="eyebrow block text-accent">
                    {copy.eyebrow}
                  </span>
                </span>

                <h2
                  className={`display-xl mt-5 ${tone.head} ${
                    bottom
                      ? 'text-[clamp(1.9rem,3.8vw,3.4rem)]'
                      : aside
                        ? 'text-[clamp(2rem,4.2vw,3.9rem)]'
                        : 'text-[clamp(2.2rem,5.4vw,5.2rem)]'
                  }`}
                >
                  {copy.lines.map((line) => (
                    <span key={line} className="block overflow-hidden pb-[0.06em]">
                      <span data-reveal="line" className="block will-change-transform">
                        {line}
                      </span>
                    </span>
                  ))}
                </h2>

                <div
                  data-reveal="rule"
                  className="m-stripe mt-6 h-[3px] w-36 origin-left md:w-48"
                />
              </div>

              <div
                className={
                  bottom
                    ? 'md:col-span-6 md:col-start-7'
                    : aside
                      ? /* Stacked under the headline, not beside it: the whole
                           block has to stay clear of the same half. */
                        'md:col-span-6 md:col-start-1 lg:col-span-5'
                      : 'md:col-span-5 md:col-start-8 md:pt-[6.5rem] lg:col-span-4 lg:col-start-9'
                }
              >
                <p data-reveal="soft" className={`prose-editorial ${tone.body}`}>
                  {copy.body}
                </p>

                {copy.stats && (
                  <dl
                    data-reveal="soft"
                    className={`mt-8 grid gap-x-8 gap-y-8 border-t pt-7 ${tone.border} ${
                      bottom ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 mt-10'
                    }`}
                  >
                    {copy.stats.map((s) => (
                      <div key={s.label}>
                        <dd
                          className={`display-lg ${tone.head} ${
                            bottom || aside
                              ? 'text-[clamp(1.4rem,1.9vw,2rem)]'
                              : 'text-[clamp(1.8rem,2.4vw,2.7rem)]'
                          }`}
                        >
                          {s.value}
                          {s.unit && (
                            <span className="ml-1.5 font-mono text-[0.34em] font-medium tracking-[0.14em] text-accent">
                              {s.unit}
                            </span>
                          )}
                        </dd>
                        <dt className={`eyebrow mt-2.5 ${tone.label}`}>{s.label}</dt>
                      </div>
                    ))}
                  </dl>
                )}

                {copy.note && (
                  <p data-reveal="soft" className={`eyebrow mt-9 ${tone.label}`}>
                    {copy.note}
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* Chapter marker; inverts itself over both light plates and the dark hold. */}
      <div
        data-el="hud"
        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-6 md:p-10"
      >
        <p className="eyebrow blend-invert flex items-baseline gap-3">
          <span className="opacity-55">{scene.index}</span>
          <span>{scene.title}</span>
        </p>
      </div>
    </div>
  )
}
