import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useRef } from 'react'
import { intro } from '@/content'
import { INTRO_GEOM } from '@/lib/reel'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/**
 * The title card. Bottom layer of the stage, so scene 1 surfaces up through
 * it — the reader never lands on a full-bleed car.
 */
export function IntroLayer({
  track,
  animate = true,
}: {
  track: HTMLElement | null
  animate?: boolean
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (!track || !rootRef.current) return

      const px = (vh: number) => vh * window.innerHeight * 0.01
      const tween = gsap.to(rootRef.current, {
        opacity: 0,
        scale: 1.05,
        ease: 'none',
        scrollTrigger: {
          trigger: track,
          start: () => `top top-=${px(INTRO_GEOM.exitFrom)}`,
          end: () => `top top-=${px(INTRO_GEOM.exitTo)}`,
          scrub: 0.55,
          invalidateOnRefresh: true,
        },
      })
      return () => {
        tween.scrollTrigger?.kill()
        tween.kill()
      }
    },
    { scope: rootRef },
  )

  const anim = (spec: string) => (animate ? { animation: spec } : undefined)

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden bg-ink">
      {/* A single off-centre light source, so the black is not flat. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(120% 90% at 18% 108%, rgba(1,102,177,0.28) 0%, rgba(8,9,10,0) 58%)',
        }}
      />
      <div aria-hidden className="grain-layer absolute inset-0 opacity-[0.05] mix-blend-screen" />

      <div className="absolute inset-0 flex flex-col justify-between px-6 py-8 md:px-12 md:py-10 lg:px-20">
        <p className="eyebrow text-white/55" style={anim('fade 800ms 100ms both ease-out')}>
          {intro.eyebrow}
        </p>

        <div>
          <div className="flex items-end gap-5 md:gap-8">
            <span className="block overflow-hidden">
              <span
                className="display-xl block text-[clamp(6rem,22vw,20rem)] text-white"
                style={anim('rise 1200ms 200ms both cubic-bezier(.16,1,.3,1)')}
              >
                {intro.title}
              </span>
            </span>
            <span
              className="eyebrow mb-[clamp(1rem,3vw,3.2rem)] text-white/60"
              style={anim('fade 900ms 760ms both ease-out')}
            >
              {intro.subtitle}
            </span>
          </div>

          <div
            className="m-stripe mt-7 h-[3px] w-40 origin-left md:w-64"
            style={anim('wipe 1000ms 660ms both cubic-bezier(.16,1,.3,1)')}
          />

          <p
            className="prose-editorial mt-7 max-w-[34rem] text-white/55"
            style={anim('rise 1000ms 840ms both cubic-bezier(.16,1,.3,1)')}
          >
            {intro.standfirst}
          </p>

          {/* The headline figures, up front. */}
          <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6 border-t border-white/10 pt-7">
            {intro.specs.map((s, i) => (
              <div key={s.label} style={anim(`rise 800ms ${980 + i * 80}ms both cubic-bezier(.16,1,.3,1)`)}>
                <dd className="display-lg text-[clamp(1.5rem,2.1vw,2.3rem)] text-white">
                  {s.value}
                  {s.unit && (
                    <span className="ml-1 font-mono text-[0.36em] font-medium tracking-[0.12em] text-accent">
                      {s.unit}
                    </span>
                  )}
                </dd>
                <dt className="eyebrow mt-2 text-white/38">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex items-center gap-4" style={anim('fade 900ms 1050ms both ease-out')}>
          <span className="eyebrow text-white/55">{intro.scrollCue}</span>
          <span aria-hidden className="relative h-14 w-px overflow-hidden bg-white/15">
            <span
              className="absolute inset-x-0 top-0 h-1/2 bg-white"
              style={animate ? { animation: 'drop 1900ms 1300ms infinite cubic-bezier(.5,0,.5,1)' } : undefined}
            />
          </span>
        </div>
      </div>

      <style>{`
        @keyframes rise { from { transform: translateY(110%); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes wipe { from { transform: scaleX(0) } to { transform: none } }
        @keyframes drop { 0% { transform: translateY(-100%) } 55%,100% { transform: translateY(200%) } }
      `}</style>
    </div>
  )
}
