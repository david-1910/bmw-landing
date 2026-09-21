import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useCallback, useEffect, useRef } from 'react'
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
 * Nothing audible happens until `enabled` either. Browsers refuse
 * `audio.play()` until the page has had a real user gesture and scrolling is
 * not one, so the sound toggle is what actually buys playback; this component
 * only decides when to spend it.
 */
export function SceneAudio({
  geom,
  track,
  armed,
  enabled,
}: {
  geom: ChapterGeom
  track: HTMLElement | null
  armed: boolean
  enabled: boolean
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  /** Latches on the first successful play, so the clip is heard once. */
  const playedRef = useRef(false)
  /** True only while the cue window is on screen. */
  const insideRef = useRef(false)
  /*
   * The cue fires from a ScrollTrigger callback, which closes over whatever
   * `enabled` was when the trigger was built — and the trigger outlives every
   * toggle. A ref is the value it has to read.
   */
  const enabledRef = useRef(enabled)

  const play = useCallback(() => {
    const el = audioRef.current
    if (!el || playedRef.current || !enabledRef.current || !insideRef.current) return

    playedRef.current = true
    el.currentTime = 0
    gsap.fromTo(el, { volume: 0 }, { volume: VOLUME, duration: 1.1, ease: 'power1.out' })
    el.play()?.catch(() => {
      /* Still locked: give the cue back so a later unlock can spend it. */
      playedRef.current = false
      gsap.killTweensOf(el)
      el.volume = 0
    })
  }, [])

  useEffect(() => {
    if (!armed) return

    const el = new Audio(SRC)
    el.preload = 'auto'
    el.volume = 0
    audioRef.current = el

    return () => {
      gsap.killTweensOf(el)
      el.pause()
      audioRef.current = null
    }
  }, [armed])

  /* Follow the toggle. */
  useEffect(() => {
    enabledRef.current = enabled

    const el = audioRef.current
    if (!el) return

    if (!enabled) {
      gsap.killTweensOf(el)
      el.pause()
      el.volume = 0
      return
    }

    if (insideRef.current) {
      play()
      return
    }

    /*
     * The cue is still screens away, but the activation the toggle just
     * granted is not: iOS only ever treats an audio element as unlocked if
     * play() was called on it under a user gesture, and Chrome's transient
     * activation expires in seconds. So spend it now on a silent play and
     * immediately rewind — the element stays unlocked for the real cue.
     */
    el.volume = 0
    el.play()
      ?.then(() => {
        el.pause()
        el.currentTime = 0
      })
      .catch(() => {})
  }, [enabled, armed, play])

  /** Half way through the chapter's first leg, not at its edge. */
  const first = geom.stations[0]
  const cueAt = geom.start + (first.scrubEnd - geom.start) / 2

  useGSAP(
    () => {
      if (!armed || !track) return
      const px = (vh: number) => vh * window.innerHeight * 0.01

      const st = ScrollTrigger.create({
        trigger: track,
        start: () => `top top-=${px(cueAt)}`,
        end: () => `top top-=${px(geom.end)}`,
        invalidateOnRefresh: true,
        onToggle: (self) => {
          insideRef.current = self.isActive
          if (self.isActive) play()
        },
      })
      return () => st.kill()
    },
    { dependencies: [armed, cueAt, geom.end, track, play] },
  )

  return null
}
