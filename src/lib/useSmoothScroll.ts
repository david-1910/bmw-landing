import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/**
 * Smooth scrolling for the reel.
 *
 * Lenis is deliberately the *native*-scroll kind of smoothing: it eases
 * `scrollTop` itself rather than transforming a wrapper, so the pinned stage in
 * `SceneReel` keeps working as a plain `position: sticky` element and every
 * ScrollTrigger keeps measuring against the real document.
 *
 * Lenis and GSAP must share one clock — two independent rAF loops read the
 * scroll position at different moments in a frame and the scrubbed sequences
 * tear. So Lenis is stepped from `gsap.ticker`, and `lagSmoothing(0)` stops
 * GSAP from silently skipping time after a long frame (a decode hitch here can
 * easily cost 100ms) which would otherwise jump the sequence forward.
 *
 * `enabled` is false until the preloader releases: the body is `overflow:
 * hidden` until then, and an animating scroll against a locked body just fights
 * itself.
 */
export function useSmoothScroll(enabled: boolean) {
  useGSAP(() => {
    const lenis = new Lenis({
      /*
       * Framerate-independent easing toward the target. 0.1 is the usual
       * "luxury" setting; the frame scrubs already carry 0.55s of their own
       * smoothing, so anything softer reads as lag rather than weight.
       */
      lerp: 0.1,
      wheelMultiplier: 1,
      /*
       * Touch keeps the platform's own momentum — iOS rubber-banding driven
       * through a lerp feels broken, and phones get the light path anyway.
       */
      syncTouch: false,
      /* A trackpad flick should not outrun the frames that have to decode. */
      touchMultiplier: 1.4,
    })

    /* Every eased step is a scroll position ScrollTrigger has not seen yet. */
    lenis.on('scroll', ScrollTrigger.update)

    const step = (time: number) => lenis.raf(time * 1000) // gsap ticks in seconds
    gsap.ticker.add(step)
    gsap.ticker.lagSmoothing(0)

    if (!enabled) lenis.stop()

    return () => {
      gsap.ticker.remove(step)
      gsap.ticker.lagSmoothing(500, 33) // back to the GSAP default
      lenis.destroy()
    }
  }, [enabled])
}
