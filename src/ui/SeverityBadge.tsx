import { useI18n } from '../i18n/context'
import type { Severity } from '../core/types'
import { SEVERITY_GLYPH, SEVERITY_TEXT } from './severity'

export function SeverityGlyph({ severity }: { severity: Severity }) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-4 shrink-0 place-items-center rounded-[3px] border border-current text-[10px] leading-none ${SEVERITY_TEXT[severity]}`}
    >
      {SEVERITY_GLYPH[severity]}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const { t } = useI18n()
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${SEVERITY_TEXT[severity]}`}>
      <SeverityGlyph severity={severity} />
      {t(`sev.${severity}`)}
    </span>
  )
}
