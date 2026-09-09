import { intro } from '@/content'
import { CHAPTERS } from '@/lib/reel'
import { lastFrameUrl } from '@/lib/scenes'

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

      {CHAPTERS.map(({ scene, copy }) => (
        <section key={scene.id}>
          <img
            src={lastFrameUrl(scene)}
            alt={`${scene.title} — BMW M5 Competition`}
            className="block h-[70vh] w-full object-cover"
          />
          <div className="bg-ink px-6 py-24 md:px-12 md:py-32 lg:px-20">
            <div className="mx-auto grid max-w-[100rem] gap-y-9 md:grid-cols-12 md:gap-x-10">
              <div className="md:col-span-7 lg:col-span-6">
                <p className="eyebrow text-accent">{copy.eyebrow}</p>
                <h2 className="display-xl mt-5 text-[clamp(2.2rem,5.6vw,5.4rem)] text-white">
                  {copy.lines.join(' ')}
                </h2>
                <div className="m-stripe mt-8 h-[3px] w-36 md:w-48" />
              </div>
              <div className="md:col-span-5 md:col-start-8 lg:col-span-4 lg:col-start-9">
                <p className="prose-editorial text-white/64">{copy.body}</p>
                {copy.stats && (
                  <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8 border-t border-white/12 pt-8">
                    {copy.stats.map((s) => (
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
              </div>
            </div>
          </div>
        </section>
      ))}
    </>
  )
}
