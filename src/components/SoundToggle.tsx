/**
 * The page's only control — and the only reason the engine note is audible at
 * all. Browsers refuse `audio.play()` until the page has had a real user
 * gesture, and scrolling is explicitly not one, so a scroll-driven page has no
 * way to earn playback on its own. Clicking this *is* the gesture: the toggle
 * exists to unlock the audio as much as to express a preference.
 *
 * It starts muted. Sound that arrives uninvited on a page the reader is only
 * scrolling through is worse than no sound at all.
 */
export function SoundToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      aria-label={on ? 'Mute the engine note' : 'Play the engine note'}
      /*
        `blend-invert` is the same difference blend the chapter markers use, so
        one control reads correctly over both the lit plates and the dark
        holds without anything having to tell it which is underneath.
      */
      className="blend-invert fixed top-5 right-5 z-40 flex cursor-pointer items-center gap-2.5 p-2 opacity-55 transition-opacity duration-300 hover:opacity-100 md:top-9 md:right-9"
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M2.4 6h2.3L7.6 3.3v9.4L4.7 10H2.4z" fill="currentColor" stroke="none" />
        {on ? (
          <>
            <path d="M9.9 5.9a3 3 0 0 1 0 4.2" />
            <path d="M11.9 3.9a5.7 5.7 0 0 1 0 8.2" />
          </>
        ) : (
          <path d="M10.3 6.2 13.9 9.8M13.9 6.2 10.3 9.8" />
        )}
      </svg>

      <span className="eyebrow hidden sm:inline">{on ? 'Sound' : 'Muted'}</span>
    </button>
  )
}
