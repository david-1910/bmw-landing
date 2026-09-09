import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useCallback, useEffect, useRef, useState } from 'react'
import { drawFrame, nearestLoaded, PLATE, sizeCanvas, type FitMode } from '@/lib/canvasStage'
import type { ChapterGeom } from '@/lib/reel'
import { framesOf, useSceneFrames } from '@/lib/useSceneFrames'

gsap.registerPlugin(ScrollTrigger, useGSAP)

interface Props {
  geom: ChapterGeom
  /** The shared scroll track every trigger is measured against. */
  track: HTMLElement | null
  fit: FitMode
}

/**
 * One scene of the reel: its canvas, the veil that darkens it, and the data
 * held on the end of it. Layers stack in DOM order, so this one's canvas rises
 * over the darkened chapter beneath — that overlap *is* the transition.
 */
export function ChapterLayer({ geom, track, fit }: Props) {
  const { scene, copy } = geom

  const layerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const head = useRef({ i: 0 })

  const [awake, setAwake] = useState(geom.index === 0)
  const { progress } = useSceneFrames(scene, awake)

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

      /* Timelines as well as tweens go in here, so type it as Animation. */
      const made: gsap.core.Animation[] = []

      /**
       * Scrubbed tween over a window of the shared track. Initial state is
       * always applied with an explicit `set` rather than `fromTo`, which is
       * far more predictable when a trigger has not been reached yet.
       */
      const span = (target: gsap.TweenTarget, from: number, to: number, vars: gsap.TweenVars) => {
        const t = gsap.to(target, {
          ...vars,
          ease: vars.ease ?? 'none',
          scrollTrigger: {
            trigger: track,
            start: at(from),
            end: at(to),
            scrub: 0.55,
            invalidateOnRefresh: true,
          },
        })
        made.push(t)
        return t
      }

      const canvas = q('[data-el="canvas"]')
      const veil = q('[data-el="veil"]')
      const info = q('[data-el="info"]')
      const hud = q('[data-el="hud"]')
      const lines = q('[data-reveal="line"]')
      const rule = q('[data-reveal="rule"]')
      const soft = q('[data-reveal="soft"]')

      /* Everything starts hidden; scroll is what reveals it. */
      gsap.set(veil, { opacity: 0 })
      gsap.set(info, { opacity: 1, y: 0 })
      gsap.set(hud, { opacity: 1 })
      gsap.set(lines, { yPercent: 115 })
      gsap.set(rule, { scaleX: 0 })
      gsap.set(soft, { opacity: 0, y: 28 })

      /*
       * Arrival: the scene settles forward out of the dark rather than
       * cutting. Every chapter has an entrance — the first one surfaces
       * through the title card, so it must start hidden too.
       */
      if (geom.enterVh > 0) {
        gsap.set(layer, { opacity: 0 })
        gsap.set(canvas, { scale: 1.07, filter: 'blur(7px)' })
        span(layer, geom.enterFrom, geom.start, { opacity: 1 })
        span(canvas, geom.enterFrom, geom.start + 40, { scale: 1, filter: 'blur(0px)' })
      } else {
        gsap.set(layer, { opacity: 1 })
        gsap.set(canvas, { scale: 1, filter: 'blur(0px)' })
      }

      /* The sequence itself. */
      const scrub = gsap.to(head.current, {
        i: scene.count - 1,
        ease: 'none',
        scrollTrigger: {
          trigger: track,
          start: at(geom.start),
          end: at(geom.scrubEnd),
          scrub: 0.55,
          invalidateOnRefresh: true,
        },
        onUpdate: () => paintRef.current(),
      })
      made.push(scrub)

      /*
       * The hold: light drains out of the final frame, then the data arrives.
       *
       * `SETTLE` is the gap between the last frame and the first hint of the
       * overlay. The scrub carries 0.55s of smoothing, so the sequence is
       * still visibly catching up after `scrubEnd` — without this buffer the
       * copy starts appearing over footage that is still moving.
       *
       * Everything else is measured against where the copy starts *leaving*,
       * not the end of the hold, so the reveal always finishes before the
       * exit begins and the last stretch is pure reading time.
       */
      const SETTLE = 45
      const holdStart = geom.scrubEnd + SETTLE
      const exitStart = geom.exitFrom ?? geom.holdEnd
      const reveal = Math.max(exitStart - holdStart, 60)

      span(veil, holdStart, holdStart + reveal * 0.42, { opacity: 1 })
      /* The marker belongs to the moving footage: it retires as the frame
         freezes, which also stops two chapters' labels colliding mid-fade. */
      span(hud, geom.scrubEnd, holdStart + reveal * 0.25, { opacity: 0 })
      span(lines, holdStart + reveal * 0.14, holdStart + reveal * 0.6, {
        yPercent: 0,
        stagger: 0.12,
        ease: 'power2.out',
      })
      span(rule, holdStart + reveal * 0.34, holdStart + reveal * 0.62, {
        scaleX: 1,
        ease: 'power2.out',
      })
      span(soft, holdStart + reveal * 0.36, holdStart + reveal * 0.7, {
        opacity: 1,
        y: 0,
        stagger: 0.14,
        ease: 'power2.out',
      })

      /* Departure: the copy leaves and this scene recedes as the next rises. */
      if (geom.exitFrom !== null) {
        span(info, geom.exitFrom, geom.holdEnd, { opacity: 0, y: -30, ease: 'power2.in' })
        span(canvas, geom.exitFrom, geom.holdEnd, { scale: 1.05 })
      }

      return () => {
        for (const t of made) {
          t.scrollTrigger?.kill()
          t.kill()
        }
      }
    },
    { dependencies: [geom.index, scene.count, track], scope: layerRef },
  )

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
    <div ref={layerRef} className="absolute inset-0" aria-label={`${scene.index} — ${scene.title}`}>
      <canvas
        data-el="canvas"
        ref={canvasRef}
        className="block h-full w-full will-change-transform"
      />

      {/* The darkening that the data is read against. */}
      <div data-el="veil" className="absolute inset-0 bg-ink" />

      {/* The data, held on the end of the scene. */}
      <div data-el="info" className="absolute inset-0 flex items-center px-6 md:px-12 lg:px-20">
        <div className="mx-auto grid w-full max-w-[100rem] gap-y-9 md:grid-cols-12 md:gap-x-10">
          <div className="md:col-span-7 lg:col-span-6">
            <span className="block overflow-hidden pb-1">
              <span data-reveal="line" className="eyebrow block text-accent">
                {copy.eyebrow}
              </span>
            </span>

            <h2 className="display-xl mt-5 text-[clamp(2.2rem,5.4vw,5.2rem)] text-white">
              {copy.lines.map((line) => (
                <span key={line} className="block overflow-hidden pb-[0.06em]">
                  <span data-reveal="line" className="block will-change-transform">
                    {line}
                  </span>
                </span>
              ))}
            </h2>

            <div data-reveal="rule" className="m-stripe mt-8 h-[3px] w-36 origin-left md:w-48" />
          </div>

          <div className="md:col-span-5 md:col-start-8 lg:col-span-4 lg:col-start-9 md:pt-[6.5rem]">
            <p data-reveal="soft" className="prose-editorial text-white/64">
              {copy.body}
            </p>

            {copy.stats && (
              <dl
                data-reveal="soft"
                className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8 border-t border-white/12 pt-8"
              >
                {copy.stats.map((s) => (
                  <div key={s.label}>
                    <dd className="display-lg text-[clamp(1.8rem,2.4vw,2.7rem)] text-white">
                      {s.value}
                      {s.unit && (
                        <span className="ml-1.5 font-mono text-[0.34em] font-medium tracking-[0.14em] text-accent">
                          {s.unit}
                        </span>
                      )}
                    </dd>
                    <dt className="eyebrow mt-2.5 text-white/42">{s.label}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </div>

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
