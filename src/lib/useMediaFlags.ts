import { useEffect, useState } from 'react'

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Readers who asked for less motion get the static, scrubbing-free document. */
export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')

/** Portrait / narrow viewports letterbox the 16:9 plates instead of cropping. */
export const useIsNarrow = () => useMediaQuery('(max-width: 767px)')
