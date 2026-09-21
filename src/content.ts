/**
 * All page copy. Every figure is a manufacturer specification for the
 * BMW M5 Competition (F90 LCI) — the car in the footage. The CS variant reads
 * 635 hp / 3.0 s if that is the one you mean instead.
 */

export interface Stat {
  value: string
  unit: string
  label: string
}

/** The title card that opens the page. */
export const intro = {
  eyebrow: 'Bayerische Motoren Werke · F90',
  title: 'M5',
  subtitle: 'Competition',
  standfirst:
    'A four-door saloon with a 4.4-litre twin-turbo V8, all-wheel drive it will happily switch off, and a chassis signed off at the Nürburgring.',
  /** Headline figures, shown as a strip under the title. */
  specs: [
    { value: '4.4', unit: 'l', label: 'Twin-turbo V8' },
    { value: '625', unit: 'hp', label: 'At 6000 rpm' },
    { value: '3.3', unit: 's', label: '0–100 km/h' },
    { value: '305', unit: 'km/h', label: 'Top speed' },
  ] satisfies Stat[],
  scrollCue: 'Begin',
} as const

export interface ChapterCopy {
  eyebrow: string
  /** Rendered one line per entry, revealed in sequence. */
  lines: string[]
  body: string
  stats?: Stat[]
  /** A closing line under the body, where a stop has one. */
  note?: string
}

/** Held on the end of scene 1, which finishes inside the cabin. */
export const chapterInterior: ChapterCopy = {
  eyebrow: '01 — Interior',
  lines: ['Built around', 'the driver'],
  body:
    'Two red buttons on the steering wheel, M1 and M2, each store a complete configuration — engine response, damper stiffness, steering weight, brake feel, drivetrain mode and traction control. The M Mode button reduces the driver assistance and the head-up display down to a shift light and little else. Under it all sits an ordinary 530-litre boot.',
  stats: [
    { value: '2', unit: '', label: 'M presets on the wheel' },
    { value: '10', unit: '', label: 'M Traction Control stages' },
    { value: '12.3', unit: 'in', label: 'Central display' },
    { value: '530', unit: 'l', label: 'Luggage capacity' },
  ],
}

/**
 * Scene 2 is a full orbit, so it is read in four stops rather than one: the
 * camera halts and each halt holds the part of the car it is actually looking
 * at. One block of copy over a rotating body would have described nothing in
 * particular.
 *
 * The order is the camera's, not an editor's — the orbit runs three-quarter
 * front, tail, the far flank, and back round to the nose — so these may not be
 * reordered without re-timing `at` in the reel to match. A block describing the
 * exhaust while the frame is showing the grille is the one failure this whole
 * structure exists to avoid.
 */
export const chapterChassis: ChapterCopy[] = [
  {
    eyebrow: '02.1 — Proportion',
    lines: ['Long bonnet,', 'short overhangs'],
    body:
      'Nearly five metres of saloon standing on a 2.98-metre wheelbase, which is what leaves the overhangs as short as they look from here. The Competition sits seven millimetres lower than the standard M5 on its own springs, and carries a carbon-fibre roof to take mass out of the highest point on the car.',
    stats: [
      { value: '4.96', unit: 'm', label: 'Overall length' },
      { value: '2.98', unit: 'm', label: 'Wheelbase' },
      { value: '1.90', unit: 'm', label: 'Width, mirrors folded' },
      { value: '1865', unit: 'kg', label: 'Kerb weight, DIN' },
    ],
  },
  {
    eyebrow: '02.2 — Tail',
    lines: ['Four pipes,', 'one diffuser'],
    body:
      'The quad tailpipes are the honest ones — all four are live, fed by a flap-controlled exhaust quiet enough to leave at dawn and emphatically not when it is asked. Above them a boot-lid spoiler and an M rear diffuser do the actual work of keeping the rear axle loaded at the 305 km/h the M Driver’s Package unlocks.',
    stats: [
      { value: '4', unit: '', label: 'Live tailpipes' },
      { value: '1624', unit: 'mm', label: 'Rear track' },
      { value: '530', unit: 'l', label: 'Luggage capacity' },
      { value: '305', unit: 'km/h', label: 'Limiter lifted' },
    ],
  },
  {
    eyebrow: '02.3 — Profile',
    lines: ['Twenty inches,', 'staggered'],
    body:
      'Forged M double-spoke wheels, wider at the back than the front, which is the clearest sign that M xDrive is rear-biased by design rather than by mode. Behind them sit six-piston fixed front calipers; the carbon-ceramic option swaps them for larger discs and takes around 23 kg out of the unsprung mass.',
    stats: [
      { value: '20', unit: 'in', label: 'Forged M wheels' },
      { value: '285', unit: '/35', label: 'Rear tyre, R20' },
      { value: '3', unit: '', label: 'Adaptive damper settings' },
      { value: '23', unit: 'kg', label: 'Saved on ceramics' },
    ],
  },
  {
    eyebrow: '02.4 — Front end',
    lines: ['Air first,', 'styling second'],
    body:
      'Almost none of this face is decoration. The kidneys and the three lower intakes feed a radiator pack sized for sustained track use — engine, gearbox and charge-air coolers all draw through here — and the front track is wider than a 5 Series to put the extra rubber where the load goes.',
    stats: [
      { value: '3', unit: '', label: 'Lower air intakes' },
      { value: '1633', unit: 'mm', label: 'Front track' },
      { value: '275', unit: '/35', label: 'Front tyre, R20' },
      { value: '395', unit: 'mm', label: 'Front M compound discs' },
    ],
  },
]

/** Held on the end of scene 3, on the roundel. */
export const chapterRoundel: ChapterCopy = {
  eyebrow: '03 — Powertrain',
  lines: ['Six hundred', 'and twenty five'],
  body:
    'The S63 V8: 4.4 litres, two turbochargers nestled inside the vee, 625 hp at 6000 rpm and 750 Nm held flat from 1800 to 5860 rpm. It drives an eight-speed M Steptronic and M xDrive — and if you disable the front axle and the stability control together, only the rear wheels.',
  stats: [
    { value: '625', unit: 'hp', label: 'At 6000 rpm' },
    { value: '750', unit: 'Nm', label: 'From 1800 rpm' },
    { value: '3.3', unit: 's', label: '0–100 km/h' },
    { value: '10.8', unit: 's', label: '0–200 km/h' },
  ],
}

/**
 * The slogan, driven through the roundel on the stop after the powertrain
 * data. Two bands rather than one line: they travel in opposite directions and
 * blend against the plate, so the badge has to be passed *through* rather than
 * decorated.
 */
export const slogan = ['Freude am Fahren', 'Sheer driving pleasure'] as const

/**
 * The last stop of the last scene. This is where the plate finally drains to
 * ink — the only blackout in scene 3, and the page ends on it.
 */
export const chapterSignoff: ChapterCopy = {
  eyebrow: 'F90 · 2018–2023',
  lines: ['Nothing left', 'to prove'],
  body:
    'Six hundred and twenty five horsepower, four doors and a boot that takes the weekend. The M5 has never had to explain itself — it just has to be started.',
  note: 'BMW M GmbH · Garching bei München',
}

export const footer = {
  mark: 'BMW M5 Competition · F90',
  footnote:
    'An independent demonstration page. BMW, M5 and the BMW roundel are trademarks of Bayerische Motoren Werke AG. Figures quoted are manufacturer specifications for the M5 Competition (F90 LCI) and vary by market.',
} as const
