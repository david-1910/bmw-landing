import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef } from 'react'
import type { ChapterGeom } from '@/lib/reel'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const SRC = '/notevibes-timeline.mp3'
const VOLUME = 0.55

/**
 * Headless: plays a clip a single time, the first time a given chapter is
 * reached, and never again — scrolling back and forth does not retrigger it.
 *
 * Browsers refuse to start audio until the page has had a real user gesture,
 * and scrolling does not count as one. So if the first attempt is refused,
 * playback is armed to fire on the next click or key press instead of being
 * lost. Nothing is rendered and there is no mute control.
 */
export function SceneAudio({ geom, track }: { geom: ChapterGeom; track: HTMLElement | null }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  /** Latches on the first successful play, so the clip is heard once. */
  const playedRef = useRef(false)
  /** True once the reader has actually got to this chapter. */
  const reachedRef = useRef(false)

  useEffect(() => {
    const el = new Audio(SRC)
    el.preload = 'auto'
    el.volume = 0
    audioRef.current = el

    /* Fallback for the autoplay policy: the first gesture anywhere releases it. */
    const onGesture = () => {
      if (reachedRef.current) play()
    }
    window.addEventListener('pointerdown', onGesture)
    window.addEventListener('keydown', onGesture)

    return () => {
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
      el.pause()
      audioRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const play = () => {
    const el = audioRef.current
    if (!el || playedRef.current) return

    const p = el.play()
    if (p) {
      p.then(() => {
        playedRef.current = true
        gsap.fromTo(el, { volume: 0 }, { volume: VOLUME, duration: 1.1, ease: 'power1.out' })
      }).catch(() => {
        /* Refused for want of a gesture — the window listeners will retry. */
      })
    } else {
      playedRef.current = true
      gsap.fromTo(el, { volume: 0 }, { volume: VOLUME, duration: 1.1, ease: 'power1.out' })
    }
  }

  useGSAP(
    () => {
      if (!track) return
      const px = (vh: number) => vh * window.innerHeight * 0.01

      const st = ScrollTrigger.create({
        trigger: track,
        start: () => `top top-=${px(geom.start)}`,
        end: () => `top top-=${px(geom.holdEnd)}`,
        invalidateOnRefresh: true,
        onToggle: (self) => {
          if (!self.isActive) return
          reachedRef.current = true
          play()
        },
      })
      return () => st.kill()
    },
    { dependencies: [geom.start, geom.holdEnd, track] },
  )

  return null
}
