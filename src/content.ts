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

/** Held on the end of scene 2, after the full exterior orbit. */
export const chapterPerformance: ChapterCopy = {
  eyebrow: '02 — Chassis & body',
  lines: ['Five metres,', 'held down'],
  body:
    'Almost five metres of saloon on forged 20-inch wheels, with a wider front track, stiffer engine mounts and M-specific adaptive dampers offering three distinct settings. The M compound brakes can be swapped for carbon ceramics; either way the speed limiter lifts from 250 to 305 km/h with the M Driver’s Package.',
  stats: [
    { value: '4.96', unit: 'm', label: 'Overall length' },
    { value: '20', unit: 'in', label: 'Forged M wheels' },
    { value: '3', unit: '', label: 'Damper settings' },
    { value: '305', unit: 'km/h', label: 'M Driver’s Package' },
  ],
}

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

export const footer = {
  mark: 'BMW M5 Competition · F90',
  footnote:
    'An independent demonstration page. BMW, M5 and the BMW roundel are trademarks of Bayerische Motoren Werke AG. Figures quoted are manufacturer specifications for the M5 Competition (F90 LCI) and vary by market.',
} as const
