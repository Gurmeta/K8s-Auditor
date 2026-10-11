import { createContext, useContext } from 'react'
import type { Lang, MessageKey, PluralBase } from './messages'

export type Params = Record<string, string | number>

export interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: MessageKey, params?: Params) => string
  tn: (base: PluralBase, n: number, params?: Params) => string
}

export const I18nContext = createContext<I18n | null>(null)

export function useI18n(): I18n {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside I18nProvider')
  return value
}
