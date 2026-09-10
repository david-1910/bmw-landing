import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef } from 'react'
import type { ChapterGeom } from '@/lib/reel'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const SRC = '/notevibes-timeline.mp3'
const VOLUME = 0.55

/**
 * Headless: plays a clip once, in the middle of a chapter's sequence, and
 * never again — scrolling back and forth does not retrigger it.
 *
 * Nothing at all happens until `armed`: no element, no download, no trigger.
 * While the preloader is up the whole page is inert, and the clip must not
 * compete with the frame sequence for bandwidth.
 *
 * Browsers also refuse to start audio until the page has had a real user
 * gesture, and scrolling does not count. If the attempt is refused, playback
 * retries on the next click or key press — but only while the chapter is
 * still on screen, otherwise a stray click much later fires it at an
 * unrelated moment.
 */
export function SceneAudio({
  geom,
  track,
  armed,
}: {
  geom: ChapterGeom
  track: HTMLElement | null
  armed: boolean
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  /** Latches on the first successful play, so the clip is heard once. */
  const playedRef = useRef(false)
  /** True only while the cue window is on screen. */
  const insideRef = useRef(false)

  const play = () => {
    const el = audioRef.current
    if (!el || playedRef.current) return

    const start = () => {
      playedRef.current = true
      gsap.fromTo(el, { volume: 0 }, { volume: VOLUME, duration: 1.1, ease: 'power1.out' })
    }

    const p = el.play()
    if (p) p.then(start).catch(() => {/* no gesture yet — the listeners retry */})
    else start()
  }

  useEffect(() => {
    if (!armed) return

    const el = new Audio(SRC)
    el.preload = 'auto'
    el.volume = 0
    audioRef.current = el

    const onGesture = () => {
      if (insideRef.current) play()
    }
    window.addEventListener('pointerdown', onGesture)
    window.addEventListener('keydown', onGesture)

    return () => {
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
      gsap.killTweensOf(el)
      el.pause()
      audioRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed])

  /** Half way through the sequence, not at its edge. */
  const cueAt = geom.start + (geom.scrubEnd - geom.start) / 2

  useGSAP(
    () => {
      if (!armed || !track) return
      const px = (vh: number) => vh * window.innerHeight * 0.01

      const st = ScrollTrigger.create({
        trigger: track,
        start: () => `top top-=${px(cueAt)}`,
        end: () => `top top-=${px(geom.holdEnd)}`,
        invalidateOnRefresh: true,
        onToggle: (self) => {
          insideRef.current = self.isActive
          if (self.isActive) play()
        },
      })
      return () => st.kill()
    },
    { dependencies: [armed, cueAt, geom.holdEnd, track] },
  )

  return null
}
