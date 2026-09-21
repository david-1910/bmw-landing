import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useCallback, useEffect, useState } from 'react'
import { Footer } from '@/components/Footer'
import { Preloader } from '@/components/Preloader'
import { SceneReel } from '@/components/SceneReel'
import { SoundToggle } from '@/components/SoundToggle'
import { StaticReel } from '@/components/StaticReel'
import { useIsNarrow, useReducedMotion } from '@/lib/useMediaFlags'
import { useSmoothScroll } from '@/lib/useSmoothScroll'

export default function App() {
  const reduced = useReducedMotion()
  const narrow = useIsNarrow()
  const fit = narrow ? 'contain' : 'cover'

  const [open, setOpen] = useState(false)

  /*
   * Muted until asked. The click that turns this on is also the user gesture
   * the browser requires before any audio may play at all — see SoundToggle.
   */
  const [sound, setSound] = useState(false)

  /*
   * Eased scrolling, but only for the reel: the reduced-motion document is a
   * plain page, and hijacking its scroll is exactly what that setting asks us
   * not to do.
   */
  useSmoothScroll(open && !reduced)

  /* Hold the page still while the first sequence loads. */
  useEffect(() => {
    document.body.style.overflow = open ? '' : 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const onLoaded = useCallback(() => {
    setOpen(true)
    // The track was measured against a scroll-locked body and before the
    // webfonts settled; both change where every trigger actually sits.
    requestAnimationFrame(() => ScrollTrigger.refresh())
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
  }, [])

  useEffect(() => {
    ScrollTrigger.config({ ignoreMobileResize: true })
  }, [])

  return (
    <>
      <Preloader onDone={onLoaded} />

      <main
        className={open ? 'opacity-100' : 'pointer-events-none opacity-0'}
        style={{ transition: 'opacity 500ms ease-out' }}
      >
        {reduced ? <StaticReel /> : <SceneReel fit={fit} started={open} sound={sound} />}
        <Footer />
        {!reduced && open && <SoundToggle on={sound} onChange={setSound} />}
      </main>
    </>
  )
}
