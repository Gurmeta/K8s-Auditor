import { REPO_URL } from '../config'
import { useI18n } from '../i18n/context'
import { LanguageSwitch } from './LanguageSwitch'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
  const { t } = useI18n()
  const link = 'py-2 text-sm text-dim transition-colors hover:text-text active:text-k8s'

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center gap-5 px-4 py-3.5 sm:px-5">
      <a href="#top" className="flex shrink-0 items-center gap-2.5 font-mono text-base font-semibold whitespace-nowrap">
        <Logo className="size-6" />
        K8s Auditor
      </a>
      <nav aria-label={t('nav.aria')} className="ml-3 hidden items-center gap-5 md:flex">
        <a href="#how" className={link}>{t('nav.how')}</a>
        <a href="#rules" className={link}>{t('nav.rules')}</a>
        <a href="#privacy" className={link}>{t('nav.privacy')}</a>
        <a href={REPO_URL} className={link} rel="noopener noreferrer">{t('nav.github')}</a>
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <LanguageSwitch />
        <ThemeToggle />
      </div>
    </header>
  )
}
