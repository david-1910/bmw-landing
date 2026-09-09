/**
 * A single instrument dial. Static SVG — the needle and readout are updated
 * imperatively by whoever owns the animation, via
 * `[data-gauge="<id>"] [data-needle]` / `[data-readout]`, so a 60fps sweep
 * never goes through React state.
 */

/** Gap at the bottom, like a real cluster. Angles run clockwise from 3 o'clock. */
const START = 140
const SWEEP = 260

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

const arcPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p0 = polar(cx, cy, r, a0)
  const p1 = polar(cx, cy, r, a1)
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`
}

/** Value -> needle angle, exported so the animation can use the same mapping. */
export const angleFor = (value: number, max: number) =>
  START + (Math.min(Math.max(value, 0), max) / max) * SWEEP

interface Props {
  id: string
  max: number
  /** Major tick interval, in value units. */
  step: number
  /** Values at and above this are in the red. Omit for no redline. */
  redlineFrom?: number
  /** Divisor for the tick labels (e.g. 1000 to show rpm as 1..8). */
  labelDivisor?: number
  unit: string
  caption: string
  size?: number
}

export function Gauge({
  id,
  max,
  step,
  redlineFrom,
  labelDivisor = 1,
  unit,
  caption,
  size = 320,
}: Props) {
  const c = size / 2
  const rTrack = c - 26
  const rMajor = rTrack - 4
  const rMinor = rTrack - 4
  const rLabel = rTrack - 34

  const majors: number[] = []
  for (let v = 0; v <= max; v += step) majors.push(v)

  const minorStep = step / 2
  const minors: number[] = []
  for (let v = 0; v <= max; v += minorStep) if (v % step !== 0) minors.push(v)

  return (
    <svg
      data-gauge={id}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="overflow-visible"
      aria-hidden
    >
      {/* Dial track, then the red sector on top of it. */}
      <path
        d={arcPath(c, c, rTrack, START, START + SWEEP)}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.16}
        strokeWidth={2}
      />
      {redlineFrom !== undefined && (
        <path
          d={arcPath(c, c, rTrack, angleFor(redlineFrom, max), angleFor(max, max))}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={3}
        />
      )}

      {minors.map((v) => {
        const a = angleFor(v, max)
        const p0 = polar(c, c, rMinor, a)
        const p1 = polar(c, c, rMinor - 7, a)
        return (
          <line
            key={`m${v}`}
            x1={p0.x}
            y1={p0.y}
            x2={p1.x}
            y2={p1.y}
            stroke="currentColor"
            strokeOpacity={0.28}
            strokeWidth={1}
          />
        )
      })}

      {majors.map((v) => {
        const a = angleFor(v, max)
        const p0 = polar(c, c, rMajor, a)
        const p1 = polar(c, c, rMajor - 14, a)
        const lp = polar(c, c, rLabel, a)
        const hot = redlineFrom !== undefined && v >= redlineFrom
        return (
          <g key={`M${v}`}>
            <line
              x1={p0.x}
              y1={p0.y}
              x2={p1.x}
              y2={p1.y}
              stroke={hot ? 'var(--color-accent)' : 'currentColor'}
              strokeOpacity={hot ? 1 : 0.75}
              strokeWidth={2}
            />
            <text
              x={lp.x}
              y={lp.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="font-mono"
              fontSize={size * 0.055}
              fill={hot ? 'var(--color-accent)' : 'currentColor'}
              fillOpacity={hot ? 1 : 0.55}
            >
              {v / labelDivisor}
            </text>
          </g>
        )
      })}

      {/*
        Readout sits below the pivot, in the dead space left by the gap at the
        bottom of the dial — centred on the hub it collided with both the
        needle and the 0 / max tick labels.
      */}
      <text
        data-readout
        x={c}
        y={c + size * 0.265}
        textAnchor="middle"
        className="display-lg"
        fontSize={size * 0.115}
        fill="currentColor"
      >
        0
      </text>
      <text
        x={c}
        y={c + size * 0.335}
        textAnchor="middle"
        className="font-mono"
        fontSize={size * 0.038}
        letterSpacing={size * 0.011}
        fill="currentColor"
        fillOpacity={0.4}
      >
        {unit}
      </text>

      {/* Needle, drawn pointing right and rotated about the centre. */}
      <g data-needle style={{ transform: `rotate(${START}deg)`, transformOrigin: `${c}px ${c}px` }}>
        <polygon
          points={`${c - 6},${c - 3.2} ${c + rTrack - 12},${c - 1.1} ${c + rTrack - 12},${c + 1.1} ${c - 6},${c + 3.2}`}
          fill="var(--color-accent)"
        />
      </g>
      <circle cx={c} cy={c} r={size * 0.035} fill="currentColor" fillOpacity={0.9} />
      <circle cx={c} cy={c} r={size * 0.015} fill="var(--color-ink)" />

      <text
        x={c}
        y={size - 2}
        textAnchor="middle"
        className="font-mono"
        fontSize={size * 0.04}
        letterSpacing={size * 0.011}
        fill="currentColor"
        fillOpacity={0.4}
      >
        {caption}
      </text>
    </svg>
  )
}
