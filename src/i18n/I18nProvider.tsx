import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { I18nContext, type I18n, type Params } from './context'
import { messages, type Lang, type MessageKey } from './messages'

const STORAGE_KEY = 'lang'

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'bg') return stored
  } catch {
    // storage can be blocked
  }
  return navigator.language.toLowerCase().startsWith('bg') ? 'bg' : 'en'
}

const fill = (text: string, params?: Params) =>
  text.replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name] ?? `{${name}}`))

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<I18n>(() => {
    const dict = messages[lang]
    return {
      lang,
      setLang: (next) => {
        setLangState(next)
        try {
          localStorage.setItem(STORAGE_KEY, next)
        } catch {
          // the choice then lasts until reload
        }
      },
      t: (key, params) => fill(dict[key], params),
      tn: (base, n, params) => fill(dict[`${base}.${n === 1 ? 'one' : 'other'}` as MessageKey], { n, ...params }),
    }
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
