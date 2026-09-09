import { footer } from '@/content'

/**
 * Deliberately slim. The closing statement is held on the end of scene 3, so
 * all that is left here is the credit line.
 */
export function Footer() {
  return (
    <footer className="bg-ink px-6 py-10 md:px-12 lg:px-20">
      <div className="mx-auto flex max-w-[100rem] flex-col gap-5 border-t border-white/10 pt-7 md:flex-row md:items-start md:justify-between">
        <p className="eyebrow shrink-0 text-white/45">{footer.mark}</p>
        <p className="max-w-[46rem] font-mono text-[0.6875rem] leading-relaxed text-white/32">
          {footer.footnote}
        </p>
      </div>
    </footer>
  )
}
