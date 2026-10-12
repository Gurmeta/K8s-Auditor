import { useI18n } from '../i18n/context'

// Holds the space (and the #tool anchor) while the editor chunk loads, so the page below does not jump.
export function AuditorPlaceholder() {
  const { t } = useI18n()

  return (
    <section id="tool" aria-label={t('tool.region')} aria-busy="true" className="mx-auto w-full max-w-6xl scroll-mt-4 px-4 sm:px-5">
      <div className="h-[65dvh] rounded-lg border border-line bg-panel lg:h-[min(82dvh,800px)]" />
    </section>
  )
}
