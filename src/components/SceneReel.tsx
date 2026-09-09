import { useState } from 'react'
import { ChapterLayer } from '@/components/ChapterLayer'
import { IntroLayer } from '@/components/IntroLayer'
import { SceneAudio } from '@/components/SceneAudio'
import type { FitMode } from '@/lib/canvasStage'
import { REEL } from '@/lib/reel'

/**
 * The whole visual page: one scroll track, one pinned stage, and the layers
 * stacked inside it — title card first, then a layer per scene. There are no
 * per-scene sections and no separate interstitials: a chapter's data is held
 * on the end of its own scene, and the next scene surfaces through it.
 */
export function SceneReel({ fit, animateIntro }: { fit: FitMode; animateIntro: boolean }) {
  /*
   * A callback ref into state, not a plain ref: the layers measure their
   * triggers against this element from inside useGSAP, which is a layout
   * effect — and a child's layout effect runs *before* a parent ref is
   * attached. Holding it in state re-renders the children once it exists.
   */
  const [track, setTrack] = useState<HTMLElement | null>(null)

  return (
    <section ref={setTrack} className="relative bg-ink" style={{ height: `${REEL.totalVh}vh` }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <IntroLayer track={track} animate={animateIntro} />
        {REEL.geoms.map((geom) => (
          <ChapterLayer key={geom.scene.id} geom={geom} track={track} fit={fit} />
        ))}
      </div>

      {/* Sound rides the last chapter only. */}
      <SceneAudio geom={REEL.geoms[REEL.geoms.length - 1]} track={track} />
    </section>
  )
}
