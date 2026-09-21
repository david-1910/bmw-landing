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
 * on the stops of its own scene, and the next scene surfaces through it. The
 * finale is the last two stops of scene 3 rather than a layer of its own, so
 * the roundel is never handed off and re-introduced.
 *
 * `started` is false until the preloader releases, so nothing runs before then.
 */
export function SceneReel({
  fit,
  started,
  sound,
}: {
  fit: FitMode
  started: boolean
  sound: boolean
}) {
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
        <IntroLayer track={track} animate={started} />
        {REEL.geoms.map((geom) => (
          <ChapterLayer key={geom.scene.id} geom={geom} track={track} fit={fit} />
        ))}
      </div>

      {/* Sound rides the last chapter only, and only once the page is live. */}
      <SceneAudio
        geom={REEL.geoms[REEL.geoms.length - 1]}
        track={track}
        armed={started}
        enabled={sound}
      />
    </section>
  )
}
