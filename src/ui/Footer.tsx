import { REPO_URL } from '../config'
import { useI18n } from '../i18n/context'

export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-x-6 gap-y-2 px-4 py-6 text-sm text-dim sm:px-5">
        <p>{t('footer.license')}</p>
        <a href={REPO_URL} rel="noopener noreferrer" className="hover:text-text">
          github.com/Gurmeta/K8s-Auditor
        </a>
      </div>
    </footer>
  )
}
