import { useEffect, useRef, useState } from 'react'
import { frameUrl, type SceneDef, type SceneId } from './scenes'

/**
 * Loads and decodes a whole frame sequence, then hands back the array of
 * <img> elements for the canvas to draw.
 *
 * Two things matter for smoothness:
 *  - requests are capped, so a lazily-loaded scene never starves the visible one
 *  - every frame is `decode()`d before it counts as ready, so the first
 *    drawImage() of a frame never blocks the scroll thread on JPEG decoding
 */

const CONCURRENCY = 10

type CacheEntry = {
  frames: HTMLImageElement[]
  loaded: number
  promise: Promise<HTMLImageElement[]>
  subscribers: Set<(loaded: number) => void>
}

/** Module-level so StrictMode double-mounts and remounts never refetch. */
const cache = new Map<SceneId, CacheEntry>()

function loadFrame(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    const done = () => resolve(img)
    // decode() is the reliable "pixels are ready" signal, but it rejects on
    // detached or failed images in some browsers — onload is a good fallback.
    img.decode().then(done, () => {
      if (img.complete) done()
      else {
        img.onload = done
        img.onerror = done
      }
    })
  })
}

function startLoading(scene: SceneDef): CacheEntry {
  const existing = cache.get(scene.id)
  if (existing) return existing

  const frames: HTMLImageElement[] = new Array(scene.count)
  const entry: CacheEntry = {
    frames,
    loaded: 0,
    subscribers: new Set(),
    promise: Promise.resolve(frames),
  }
  cache.set(scene.id, entry)

  let cursor = 0
  const worker = async () => {
    while (cursor < scene.count) {
      const i = cursor++
      frames[i] = await loadFrame(frameUrl(scene, i))
      entry.loaded += 1
      for (const notify of entry.subscribers) notify(entry.loaded)
    }
  }

  entry.promise = Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, scene.count) }, worker),
  ).then(() => frames)

  return entry
}

export interface SceneFrames {
  /** Sparse until `ready`; index holes are normal mid-load. */
  frames: HTMLImageElement[]
  /** 0..1 */
  progress: number
  ready: boolean
}

/**
 * @param scene  the sequence to load
 * @param active when false, loading is deferred (used to hold scenes 2 and 3
 *               back until the reader is one screen away)
 */
export function useSceneFrames(scene: SceneDef, active = true): SceneFrames {
  const [loaded, setLoaded] = useState(() => cache.get(scene.id)?.loaded ?? 0)
  const framesRef = useRef<HTMLImageElement[]>(cache.get(scene.id)?.frames ?? [])

  useEffect(() => {
    if (!active) return
    const entry = startLoading(scene)
    framesRef.current = entry.frames
    setLoaded(entry.loaded)

    entry.subscribers.add(setLoaded)
    return () => {
      entry.subscribers.delete(setLoaded)
    }
  }, [scene, active])

  return {
    frames: framesRef.current,
    progress: loaded / scene.count,
    ready: loaded >= scene.count,
  }
}

/** Imperative variant for the preloader gate. */
export function preloadScene(scene: SceneDef): Promise<HTMLImageElement[]> {
  return startLoading(scene).promise
}

/**
 * Live read straight from the cache.
 *
 * Canvas painters must use this rather than closing over the array returned by
 * the hook: a render-scoped copy can go stale (a remount, a re-render ordering,
 * a tween built before the first frame landed) and a stale reference paints
 * bare plate over a perfectly good frame. There is one array per scene for the
 * life of the page, so reading it at paint time is always correct.
 */
export function framesOf(id: SceneId): HTMLImageElement[] {
  return cache.get(id)?.frames ?? []
}
