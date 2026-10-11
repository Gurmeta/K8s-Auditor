import { useI18n } from '../i18n/context'
import type { Lang } from '../i18n/messages'
import { FlagBG, FlagGB } from './Flags'

const OPTIONS: { code: Lang; label: string; Flag: () => React.JSX.Element }[] = [
  { code: 'en', label: 'EN', Flag: FlagGB },
  { code: 'bg', label: 'BG', Flag: FlagBG },
]

export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n()

  return (
    <div role="group" aria-label={t('lang.aria')} className="relative inline-grid grid-cols-2 rounded-full border border-line bg-panel p-0.5">
      <span
        aria-hidden="true"
        className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full border border-line bg-raised transition-transform duration-200 ease-out"
        style={{ transform: lang === 'bg' ? 'translateX(100%)' : 'none' }}
      />
      {OPTIONS.map(({ code, label, Flag }) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={lang === code}
          aria-label={t(code === 'en' ? 'lang.en' : 'lang.bg')}
          onClick={() => setLang(code)}
          className={`relative z-10 inline-flex min-h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors ${
            lang === code ? 'text-text' : 'text-dim hover:text-text'
          }`}
        >
          <Flag />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
