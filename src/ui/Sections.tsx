import { rules } from '../core/rules'
import { useI18n } from '../i18n/context'
import type { MessageKey } from '../i18n/messages'
import { ruleTitle } from '../i18n/localize'
import { RULE_GROUPS } from './ruleGroups'
import { SeverityGlyph } from './SeverityBadge'

const RULES_BY_ID = new Map(rules.map((r) => [r.id, r]))
const shell = 'mx-auto w-full max-w-6xl px-4 pt-16 sm:px-5'
const heading = 'text-2xl font-semibold tracking-tight'

const STEPS = ['1', '2', '3'] as const

export function HowItWorks() {
  const { t } = useI18n()
  return (
    <section id="how" className={shell}>
      <h2 className={heading}>{t('how.title')}</h2>
      <p className="mt-2 mb-6 max-w-[42em] text-dim">{t('how.sub')}</p>
      <ol className="grid rounded-lg border border-line bg-panel md:grid-cols-3">
        {STEPS.map((n) => (
          <li key={n} className="border-b border-line p-5 last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0">
            <span className="font-mono text-sm font-semibold text-k8s">{n}</span>
            <h3 className="mt-1.5 mb-2 text-base font-semibold">{t(`how.${n}.t`)}</h3>
            <p className="text-[15px] text-dim">{t(`how.${n}.d`)}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function RulesSection() {
  const { t, lang } = useI18n()
  return (
    <section id="rules" className={shell}>
      <h2 className={heading}>{t('rules.title')}</h2>
      <p className="mt-2 mb-6 max-w-[42em] text-dim">{t('rules.sub')}</p>
      <div className="grid items-start gap-3 md:grid-cols-3">
        {RULE_GROUPS.map((group) => (
          <details key={group.key} className="group rounded-lg border border-line bg-panel">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <span className="font-semibold">{t(`group.${group.key}` as MessageKey)}</span>
              <span className="flex items-center gap-2 font-mono text-xs text-dim">
                {group.ids.length}
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-open:rotate-90" aria-hidden="true">
                  <path d="m6 3 5 5-5 5" />
                </svg>
              </span>
            </summary>
            <div className="border-t border-line px-4 pt-3 pb-4">
              <p className="text-sm text-dim">{t(`group.${group.key}.d` as MessageKey)}</p>
              <ul className="mt-3 space-y-2">
                {group.ids.map((id) => {
                  const rule = RULES_BY_ID.get(id)
                  if (!rule) return null
                  return (
                    <li key={id} className="flex items-start gap-2 text-sm">
                      <SeverityGlyph severity={rule.severity} />
                      <span>
                        <span className="mr-1.5 font-mono text-xs text-dim">{id}</span>
                        {ruleTitle(lang, rule)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}

export function PrivacyAndLimits() {
  const { t } = useI18n()
  const card = 'rounded-lg border border-line bg-panel p-5'
  return (
    <section id="privacy" className={shell}>
      <div className="grid gap-6 md:grid-cols-2">
        <div className={card}>
          <h2 className="mb-2 text-lg font-semibold">{t('privacy.title')}</h2>
          <p className="text-[15px] text-dim">{t('privacy.d')}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] text-dim">
            <li>{t('privacy.1')}</li>
            <li>{t('privacy.2')}</li>
            <li>{t('privacy.3')}</li>
          </ul>
        </div>
        <div className={card}>
          <h2 className="mb-2 text-lg font-semibold">{t('limits.title')}</h2>
          <p className="text-[15px] text-dim">{t('limits.d')}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] text-dim">
            <li>{t('limits.1')}</li>
            <li>{t('limits.2')}</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

const FAQ = ['1', '2', '3'] as const

export function Faq() {
  const { t } = useI18n()
  return (
    <section className={shell}>
      <h2 className={heading}>{t('faq.title')}</h2>
      <div className="mt-4">
        {FAQ.map((n) => (
          <details key={n} className="border-b border-line py-4">
            <summary className="cursor-pointer font-semibold">{t(`faq.${n}.q`)}</summary>
            <p className="mt-2.5 max-w-[46em] text-dim">{t(`faq.${n}.a`)}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
