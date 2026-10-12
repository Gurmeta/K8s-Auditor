import { useMemo, useState } from 'react'
import type { AppliedFix } from '../core/fixer'
import { rules } from '../core/rules'
import { useI18n } from '../i18n/context'
import { fixText, ruleTitle } from '../i18n/localize'

const RULES_BY_ID = new Map(rules.map((r) => [r.id, r]))

interface Props {
  /** Every fix Auto-Fix could apply, before any rule is deselected. */
  allFixes: AppliedFix[]
  excluded: Set<string>
  onToggle: (ruleId: string) => void
  output: string
  onApply: () => void
  onBack: () => void
}

export function FixPanel({ allFixes, excluded, onToggle, output, onApply, onBack }: Props) {
  const { t, tn, lang } = useI18n()
  const [copied, setCopied] = useState(false)

  const groups = useMemo(() => {
    const byRule = new Map<string, AppliedFix[]>()
    for (const fix of allFixes) byRule.set(fix.ruleId, [...(byRule.get(fix.ruleId) ?? []), fix])
    return [...byRule.entries()]
  }, [allFixes])

  const selected = groups.filter(([id]) => !excluded.has(id)).reduce((n, [, fixes]) => n + fixes.length, 0)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard blocked: the Download button still works
    }
  }

  const download = () => {
    const url = URL.createObjectURL(new Blob([output], { type: 'text/yaml' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'fixed-manifest.yaml' })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:border-l lg:border-line">
      <div className="border-b border-line px-4 py-3 text-sm text-dim sm:px-5">{t('fix.hint')}</div>

      <ul className="max-h-[50dvh] min-h-0 flex-1 overflow-y-auto lg:max-h-none">
        {groups.map(([id, fixes]) => {
          const off = excluded.has(id)
          const review = fixes.some((f) => f.safety === 'review')
          const rule = RULES_BY_ID.get(id)
          const description = [...new Set(fixes.map((f) => fixText(lang, f)))].join(', ')
          return (
            <li key={id} className="border-b border-line/70">
              <label className="flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors duration-150 hover:bg-raised/60 active:bg-raised sm:px-5">
                <input type="checkbox" checked={!off} onChange={() => onToggle(id)} className="mt-1 size-4 accent-[var(--color-k8s)]" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm">{description}</span>
                    <span className={`shrink-0 font-mono text-xs ${review ? 'text-warn' : 'text-ok'}`}>
                      {t(review ? 'fix.review' : 'fix.safe')}
                    </span>
                  </span>
                  <span className="mt-0.5 block font-mono text-xs text-dim">
                    {id} · {rule ? ruleTitle(lang, rule) : id} · {fixes.length}×
                  </span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      <div className="space-y-2 border-t border-line p-4">
        <button type="button" onClick={onApply} disabled={selected === 0} className="btn btn-primary w-full">
          {tn('fix.apply', selected)}
        </button>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={copy} disabled={selected === 0} className="btn">
            {copied ? t('fix.copied') : t('fix.copy')}
          </button>
          <button type="button" onClick={download} disabled={selected === 0} className="btn">
            {t('fix.download')}
          </button>
          <button type="button" onClick={onBack} className="btn">
            {t('fix.back')}
          </button>
        </div>
      </div>
    </div>
  )
}
