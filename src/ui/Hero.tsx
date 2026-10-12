import { REPO_URL } from '../config'
import { useI18n } from '../i18n/context'
import { GhostManifest } from './GhostManifest'

const step = (i: number) => ({ '--i': i }) as React.CSSProperties

export function Hero() {
  const { t } = useI18n()

  const goToTool = (event: React.MouseEvent) => {
    event.preventDefault()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('tool')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
    document.querySelector<HTMLElement>('#tool .cm-content')?.focus({ preventScroll: true })
  }

  return (
    <section
      id="top"
      className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-10 pb-10 sm:px-5 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center xl:grid-cols-[minmax(0,1fr)_26rem]"
    >
      <div>
        <h1 style={step(0)} className="rise max-w-[18em] text-[clamp(2rem,5vw,3.25rem)] leading-[1.08] font-semibold tracking-tight text-balance">
          {t('hero.title')}
        </h1>
        <p style={step(1)} className="rise mt-5 max-w-[44em] text-lg text-pretty text-dim">{t('hero.lead')}</p>
        <div style={step(2)} className="rise mt-7 flex flex-wrap gap-3">
          <a href="#tool" onClick={goToTool} className="btn btn-primary">
            {t('hero.cta')}
          </a>
          <a href={REPO_URL} rel="noopener noreferrer" className="btn">
            {t('hero.cta2')}
          </a>
        </div>
      </div>
      <div style={step(3)} className="rise hidden border-l border-line pl-6 lg:block">
        <GhostManifest />
      </div>
    </section>
  )
}
