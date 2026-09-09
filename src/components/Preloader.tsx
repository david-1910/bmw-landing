import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import { SCENES } from '@/lib/scenes'
import { useSceneFrames } from '@/lib/useSceneFrames'

/**
 * Gates the page on scene 1 being fully decoded. Scrubbing through a sequence
 * that is still downloading is the one thing that makes this kind of page feel
 * broken, so the wait is worth taking up front — and scenes 2 and 3 stay lazy,
 * so this is ~5 MB, not all 17.
 */
export function Preloader({ onDone }: { onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [gone, setGone] = useState(false)
  const { progress, ready } = useSceneFrames(SCENES['scene-1'])

  const pct = Math.round(progress * 100)

  useEffect(() => {
    if (!ready) return
    const tl = gsap.timeline({
      // A beat on 100% before leaving, so the number is legible.
      delay: 0.35,
      onComplete: () => {
        setGone(true)
        onDone()
      },
    })
    tl.to(rootRef.current, { opacity: 0, duration: 0.7, ease: 'power2.inOut' })
    return () => {
      tl.kill()
    }
  }, [ready, onDone])

  if (gone) return null

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex flex-col justify-between bg-ink px-6 py-8 md:px-12 md:py-10 lg:px-20"
    >
      <p className="eyebrow text-white/55">BMW M5 Competition</p>

      <div>
        <p className="display-xl text-[clamp(4rem,17vw,15rem)] tabular-nums text-white">
          {String(pct).padStart(2, '0')}
        </p>
        <div className="mt-6 h-[3px] w-full max-w-[52rem] bg-white/12">
          <div
            className="m-stripe h-full origin-left transition-transform duration-200 ease-out"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
      </div>

      <p className="eyebrow text-white/35">
        Loading sequence 01 — {SCENES['scene-1'].count} frames
      </p>
    </div>
  )
}
