import { intro } from '@/content'
import { CHAPTERS } from '@/lib/reel'
import { frameUrl } from '@/lib/scenes'

/**
 * The prefers-reduced-motion document: the same three scenes and the same
 * copy, as a plain readable page with no pinning or scrubbing.
 */
export function StaticReel() {
  return (
    <>
      <section className="flex min-h-screen flex-col justify-end bg-ink px-6 py-12 md:px-12 lg:px-20">
        <p className="eyebrow text-white/55">{intro.eyebrow}</p>
        <h1 className="display-xl mt-5 text-[clamp(5rem,18vw,16rem)] text-white">{intro.title}</h1>
        <p className="eyebrow mt-3 text-white/60">{intro.subtitle}</p>
        <div className="m-stripe mt-8 h-[3px] w-40 md:w-64" />
        <p className="prose-editorial mt-7 max-w-[34rem] text-white/55">{intro.standfirst}</p>
      </section>

      {CHAPTERS.flatMap(({ scene, stations }) =>
        /*
         * One section per stop that carries copy, illustrated by the frame it
         * stops on. A stop can be pure spectacle — the slogan pass — and there
         * is nothing to show for it here. Consecutive stops that share a frame
         * only get the image once.
         */
        stations.map((st, i) => {
          if (!st.copy) return null
          const frame = Math.round((scene.count - 1) * st.at)
          const repeat = i > 0 && Math.round((scene.count - 1) * stations[i - 1].at) === frame
          return (
        <section key={`${scene.id}-${st.copy.eyebrow}`}>
          {!repeat && (
            <img
              src={frameUrl(scene, frame)}
              alt={`${scene.title} — BMW M5 Competition`}
              className="block h-[70vh] w-full object-cover"
            />
          )}
          <div className="bg-ink px-6 py-24 md:px-12 md:py-32 lg:px-20">
            <div className="mx-auto grid max-w-[100rem] gap-y-9 md:grid-cols-12 md:gap-x-10">
              <div className="md:col-span-7 lg:col-span-6">
                <p className="eyebrow text-accent">{st.copy.eyebrow}</p>
                <h2 className="display-xl mt-5 text-[clamp(2.2rem,5.6vw,5.4rem)] text-white">
                  {st.copy.lines.join(' ')}
                </h2>
                <div className="m-stripe mt-8 h-[3px] w-36 md:w-48" />
              </div>
              <div className="md:col-span-5 md:col-start-8 lg:col-span-4 lg:col-start-9">
                <p className="prose-editorial text-white/64">{st.copy.body}</p>
                {st.copy.stats && (
                  <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8 border-t border-white/12 pt-8">
                    {st.copy.stats.map((s) => (
                      <div key={s.label}>
                        <dd className="display-lg text-[clamp(1.8rem,2.4vw,2.7rem)] text-white">
                          {s.value}
                          {s.unit && (
                            <span className="ml-1.5 font-mono text-[0.34em] font-medium tracking-[0.14em] text-accent">
                              {s.unit}
                            </span>
                          )}
                        </dd>
                        <dt className="eyebrow mt-2.5 text-white/42">{s.label}</dt>
                      </div>
                    ))}
                  </dl>
                )}
                {st.copy.note && <p className="eyebrow mt-9 text-white/42">{st.copy.note}</p>}
              </div>
            </div>
          </div>
        </section>
          )
        }),
      )}
    </>
  )
}
