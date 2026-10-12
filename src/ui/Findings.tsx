import { useMemo } from 'react'
import type { Finding, Severity } from '../core/types'
import { useI18n } from '../i18n/context'
import { findingText } from '../i18n/localize'
import { SEVERITIES, SEVERITY_TEXT } from './severity'
import { SeverityBadge } from './SeverityBadge'

const ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }

interface Props {
  findings: Finding[]
  counts: Record<Severity, number>
  filter: Severity | null
  onFilter: (severity: Severity | null) => void
  onSelect: (finding: Finding) => void
  /** Findings that did not fit in the editor as annotations. */
  hidden: number
  shown: number
}

export function Findings({ findings, counts, filter, onFilter, onSelect, hidden, shown }: Props) {
  const { t, lang } = useI18n()

  const sorted = useMemo(
    () => [...findings].sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || (a.line ?? 0) - (b.line ?? 0)),
    [findings],
  )
  const visible = filter ? sorted.filter((f) => f.severity === filter) : sorted

  if (findings.length === 0) {
    return (
      <p className="px-4 py-8 text-sm text-ok sm:px-5 lg:border-l lg:border-line" role="status">
        {t('findings.none')}
      </p>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:border-l lg:border-line">
      <div className="flex flex-wrap gap-2 border-b border-line px-4 py-3 sm:px-5" role="group" aria-label={t('findings.filter')}>
        {SEVERITIES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={filter === s}
            disabled={counts[s] === 0}
            onClick={() => onFilter(filter === s ? null : s)}
            className={`btn ${filter === s ? 'border-current bg-raised' : ''} ${SEVERITY_TEXT[s]}`}
          >
            {counts[s]} {t(`chip.${s}`)}
          </button>
        ))}
      </div>
      {hidden > 0 && (
        <p className="border-b border-line px-4 py-2 text-xs text-dim sm:px-5">{t('ann.capped', { shown, total: shown + hidden })}</p>
      )}

      <ul className="max-h-[70dvh] min-h-0 flex-1 overflow-y-auto lg:max-h-none">
        {visible.map((f, i) => (
          <li key={`${f.ruleId}:${f.resourceIndex}:${f.path.join('.')}:${i}`} className="border-b border-line/70">
            <button type="button" onClick={() => onSelect(f)} className="block w-full px-4 py-3 text-left transition-colors duration-150 hover:bg-raised/60 active:bg-raised focus-visible:outline-offset-[-2px] sm:px-5">
              <span className="flex items-center justify-between gap-3">
                <SeverityBadge severity={f.severity} />
                <span className="font-mono text-xs text-dim">{f.ruleId}</span>
              </span>
              <span className="mt-1.5 block text-sm leading-snug">{findingText(lang, f).message}</span>
              <span className="mt-1 block font-mono text-xs text-dim">
                {f.resource.kind}/{f.resource.name}
                {f.container ? ` · ${f.container}` : ''}
                {f.line ? ` · ${t('findings.line', { n: f.line })}` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
