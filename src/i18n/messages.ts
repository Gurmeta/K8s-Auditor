import { bg } from './bg'
import { en } from './en'

export type Lang = 'en' | 'bg'
export type MessageKey = keyof typeof en

type PluralBaseOf<K> = K extends `${infer Base}.one` ? Base : never
export type PluralBase = PluralBaseOf<MessageKey>

export const messages: Record<Lang, Record<MessageKey, string>> = { en, bg }
