import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/**
 * Cruise speed, in viewport heights per second. This is the page's pace, and
 * the only thing that decides it — no input can exceed it.
 */
const SPEED_VH = 1.35

/**
 * What one wheel event is worth, in viewport heights. Distance, not speed:
 * a notch buys travel, which is then spent at SPEED_VH however hard it was
 * delivered.
 */
const STEP_VH = 0.3

/**
 * The most travel that may be banked ahead. Without a ceiling a trackpad —
 * which fires a burst of events per swipe, and keeps firing through the OS's
 * own inertia — would queue up whole chapters and coast through them after
 * the fingers had left the pad.
 */
const MAX_BANK_VH = 0.6

/** Seconds to reach cruise speed, and to come back down to nothing. */
const RAMP = 0.11

/** Beyond this, the page was scrolled by something other than us. */
const RESYNC_PX = 2

/**
 * Constant-rate scrolling for the reel.
 *
 * The wheel is taken over completely. A wheel event contributes nothing but a
 * direction and a fixed quantum of distance; the page then travels at exactly
 * SPEED_VH regardless of how violently that event was produced. A slow turn
 * and a hard flick advance the reel at the same speed — the flick simply keeps
 * it moving for longer.
 *
 * That is the whole point on a frame-scrubbed page. With proportional
 * scrolling the pacing belongs to whoever is holding the mouse: one trackpad
 * swipe can cross half a chapter faster than the JPEGs can be decoded, so the
 * sequence tears and the copy of three stops flashes past unread. Here the
 * pacing is authored and the decoder always keeps up.
 *
 * This is also why there is no smooth-scroll library any more. Lenis — and
 * every other easing scroller — approaches its target exponentially, so its
 * speed is by definition proportional to the distance left to cover. Constant
 * rate is the one thing that model cannot express, and layering it underneath
 * would only fight this loop for the same scrollTop.
 *
 * Deliberately left native:
 *   - touch, which keeps the platform's own momentum; a phone driven at a
 *     fixed rate feels broken, and rubber-banding needs the real scroller
 *   - keyboard and the scrollbar, which must keep working as the OS expects
 *
 * Those all move `window.scrollY` behind our back, which is why the position
 * is re-read rather than owned: see the resync below.
 *
 * `enabled` is false until the preloader releases, so nothing is intercepted
 * while the page is still inert.
 */
export function useSmoothScroll(enabled: boolean) {
  useGSAP(() => {
    if (!enabled) return

    /** -1, 0 or 1. Never a magnitude — that is the entire idea. */
    let dir = 0
    /** Travel still owed, in px. */
    let bank = 0
    /** Current speed in px/s, eased toward the cruise so stops are not jerks. */
    let v = 0
    /** Our own sub-pixel position; `scrollTo` would round away slow motion. */
    let pos = window.scrollY

    const onWheel = (e: WheelEvent) => {
      /* Let the browser have anything meant for a scrollable panel. */
      if (e.ctrlKey) return
      e.preventDefault()

      const next = Math.sign(e.deltaY)
      if (next === 0) return

      const h = window.innerHeight
      /* A reversal spends the bank rather than fighting it. */
      if (next !== dir) bank = 0
      dir = next
      bank = Math.min(bank + STEP_VH * h, MAX_BANK_VH * h)
    }

    const step = (_time: number, deltaMs: number) => {
      /* A decode hitch must not be paid back as one enormous jump. */
      const dt = Math.min(deltaMs, 50) / 1000
      const h = window.innerHeight

      /*
       * Anything else that scrolls the document — touch, keyboard, the
       * scrollbar, a browser restore — wins, and we carry on from there.
       */
      if (Math.abs(window.scrollY - pos) > RESYNC_PX) pos = window.scrollY

      /*
       * Start braking once what is left of the bank is only as long as the
       * stopping distance. Clamping the step to the remaining bank instead
       * would halt the page dead on the last pixel of credit, at full speed —
       * the ramp exists precisely so that does not happen, and it needs road
       * to happen on.
       */
      if (bank <= Math.abs(v) * RAMP) dir = 0

      /* Framerate-independent approach to the one permitted speed. */
      const cruise = dir * SPEED_VH * h
      v += (cruise - v) * (1 - Math.exp(-dt / RAMP))

      if (!dir && Math.abs(v) < 1) {
        v = 0
        bank = 0
        return
      }

      const dy = v * dt
      bank = Math.max(0, bank - Math.abs(dy))
      if (!dy) return

      const max = document.documentElement.scrollHeight - h
      const to = Math.min(Math.max(pos + dy, 0), max)
      if (to === pos) {
        /* Against a stop: drop the queue rather than grinding at the edge. */
        bank = 0
        dir = 0
        v = 0
        return
      }

      pos = to
      window.scrollTo(0, pos)
      /* Every step is a scroll position ScrollTrigger has not seen yet. */
      ScrollTrigger.update()
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    gsap.ticker.add(step)
    /*
     * Stops GSAP from silently skipping time after a long frame. A decode
     * hitch here can easily cost 100ms, and swallowing it would jump the
     * sequence forward — exactly what a fixed rate exists to prevent.
     */
    gsap.ticker.lagSmoothing(0)

    return () => {
      window.removeEventListener('wheel', onWheel)
      gsap.ticker.remove(step)
      gsap.ticker.lagSmoothing(500, 33) // back to the GSAP default
    }
  }, [enabled])
}
