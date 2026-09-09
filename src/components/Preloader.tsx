import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import { angleFor, Gauge } from '@/components/Gauge'
import { SCENES } from '@/lib/scenes'
import { useSceneFrames } from '@/lib/useSceneFrames'

const RPM_MAX = 8000
const RPM_REDLINE = 7000
const RPM_IDLE = 800
const RPM_LAUNCH = 7650
const SPEED_MAX = 305

/**
 * Road speed is derived from engine speed rather than animated separately, so
 * the two needles are inherently in step — as they are in the car. Scaled so
 * the launch peak lands exactly on the top of the speedometer.
 */
const speedFor = (rpm: number) => {
  const t = (rpm - RPM_IDLE) / (RPM_LAUNCH - RPM_IDLE)
  return Math.min(Math.max(t, 0), 1) * SPEED_MAX
}

/**
 * Shortest time the cluster stays up. On a fast connection scene 1 lands in
 * about a second, which would skip the blips entirely and cut straight to the
 * launch — this keeps the light / medium / full escalation legible.
 */
const MIN_HOLD_MS = 4200

/** Throttle blips escalate: light, then medium, then full. */
const peakFor = (t: number) => {
  if (t < 0.35) return 3200
  if (t < 0.7) return 5200
  return 7400
}

/**
 * Gates the page on scene 1 being fully decoded — scrubbing a sequence that is
 * still downloading is what makes this kind of page feel broken, so the wait
 * is taken up front. Scenes 2 and 3 stay lazy, so this is ~7 MB, not all 17.
 *
 * Rather than a percentage, the wait is a rev counter blipping the throttle,
 * with the blips getting deeper as more of the sequence arrives. When it is
 * ready the engine goes to the redline, the speedometer sweeps, and the page
 * launches.
 */
export function Preloader({ onDone }: { onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [gone, setGone] = useState(false)
  const { progress, ready } = useSceneFrames(SCENES['scene-1'])

  /*
   * Read by the looping blip timeline on every repeat. The stage is whichever
   * has advanced least — real load progress, or elapsed time against the
   * minimum hold — so the revs always climb through all three stages in order.
   */
  const peakRef = useRef(peakFor(0))
  const progressRef = useRef(progress)
  progressRef.current = progress

  const [held, setHeld] = useState(false)
  useEffect(() => {
    const started = performance.now()
    const done = setTimeout(() => setHeld(true), MIN_HOLD_MS)
    const tick = setInterval(() => {
      const elapsed = (performance.now() - started) / MIN_HOLD_MS
      peakRef.current = peakFor(Math.min(progressRef.current, elapsed))
    }, 120)
    return () => {
      clearTimeout(done)
      clearInterval(tick)
    }
  }, [])

  /** Engine speed is the only animated value; the speedometer follows it. */
  const dial = useRef({ rpm: RPM_IDLE })

  /** Push the current values into both dials. */
  const render = () => {
    const root = rootRef.current
    if (!root) return

    const set = (id: string, value: number, max: number) => {
      const g = root.querySelector(`[data-gauge="${id}"]`)
      if (!g) return
      const needle = g.querySelector<SVGGElement>('[data-needle]')
      const out = g.querySelector('[data-readout]')
      if (needle) needle.style.transform = `rotate(${angleFor(value, max)}deg)`
      if (out) out.textContent = Math.round(value).toString()
    }

    set('rpm', dial.current.rpm, RPM_MAX)
    set('speed', speedFor(dial.current.rpm), SPEED_MAX)
  }

  /* Idle blipping while the frames come in. */
  useGSAP(
    () => {
      render()
      const tl = gsap.timeline({ repeat: -1, repeatRefresh: true, onUpdate: render })
      tl.to(dial.current, { rpm: () => peakRef.current, duration: 0.8, ease: 'power2.out' })
        .to(dial.current, { rpm: RPM_IDLE + 120, duration: 1.15, ease: 'power2.inOut' })
        .to({}, { duration: 0.3 })
      return () => {
        tl.kill()
      }
    },
    { scope: rootRef },
  )

  /* Loaded and the minimum hold is up: to the redline, then launch. */
  useEffect(() => {
    if (!ready || !held) return

    gsap.killTweensOf(dial.current)
    const tl = gsap.timeline({
      onUpdate: render,
      onComplete: () => {
        setGone(true)
        onDone()
      },
    })

    tl.to(dial.current, { rpm: RPM_LAUNCH, duration: 2.2, ease: 'power2.inOut' })
      .to(rootRef.current, { opacity: 0, duration: 0.8, ease: 'power2.inOut' }, '-=0.5')

    return () => {
      tl.kill()
    }
  }, [ready, held, onDone])

  if (gone) return null

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex flex-col justify-between bg-ink px-6 py-8 text-white md:px-12 md:py-10 lg:px-20"
    >
      <div className="flex items-start justify-between gap-6">
        <p className="eyebrow text-white/55">BMW M5 Competition</p>
        <div className="m-stripe h-[3px] w-28 md:w-40" />
      </div>

      {/* Cluster order as in the car: speedometer left, rev counter right. */}
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-10 md:gap-x-20">
        <Gauge
          id="speed"
          max={SPEED_MAX}
          step={50}
          unit="km/h"
          caption="Road speed"
          size={330}
        />
        <Gauge
          id="rpm"
          max={RPM_MAX}
          step={1000}
          redlineFrom={RPM_REDLINE}
          labelDivisor={1000}
          unit="rpm × 1000"
          caption="Engine speed"
          size={330}
        />
      </div>

      <p className="eyebrow text-center text-white/35">
        Warming up — sequence 01, {SCENES['scene-1'].count} frames
      </p>
    </div>
  )
}
