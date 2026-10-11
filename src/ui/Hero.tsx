import { REPO_URL } from '../config'
import { useI18n } from '../i18n/context'

export function Hero() {
  const { t } = useI18n()

  const goToTool = (event: React.MouseEvent) => {
    event.preventDefault()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('tool')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
    document.querySelector<HTMLElement>('#tool .cm-content')?.focus({ preventScroll: true })
  }

  return (
    <section id="top" className="mx-auto w-full max-w-6xl px-4 pt-10 pb-10 sm:px-5 sm:pt-14">
      <h1 className="max-w-[18em] text-[clamp(2rem,5vw,3.25rem)] leading-[1.08] font-semibold tracking-tight">{t('hero.title')}</h1>
      <p className="mt-5 max-w-[44em] text-lg text-dim">{t('hero.lead')}</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <a href="#tool" onClick={goToTool} className="btn btn-primary">
          {t('hero.cta')}
        </a>
        <a href={REPO_URL} rel="noopener noreferrer" className="btn">
          {t('hero.cta2')}
        </a>
      </div>
    </section>
  )
}
