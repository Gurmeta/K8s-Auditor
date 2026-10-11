import { EditorView } from '@codemirror/view'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { diffLines, type DiffOp } from '../core/diff'
import { findingKey, lint } from '../core/engine'
import { autoFix } from '../core/fixer'
import { rules } from '../core/rules'
import { computeScore } from '../core/scoring'
import type { Finding, FixSafety, Severity } from '../core/types'
import { EXAMPLES } from '../examples'
import { useI18n } from '../i18n/context'
import { findingText } from '../i18n/localize'
import type { AnnotationHandlers } from './annotations'
import { ANNOTATION_LIMIT, buildAnnotationItems, fixSpot } from './annotationItems'
import { DiffView } from './DiffView'
import { Editor } from './Editor'
import { Findings } from './Findings'
import { FixPanel } from './FixPanel'
import { ScoreMeter } from './ScoreMeter'

type Mode = 'edit' | 'review'

const NO_LINES: ReadonlySet<number> = new Set()
const RULES_BY_ID = new Map(rules.map((r) => [r.id, r]))
const standardsOf = (ruleId: string) =>
  (RULES_BY_ID.get(ruleId)?.standards ?? []).map((s) => `${s.name}: ${s.ref}`).join('; ')

export function Auditor() {
  const { t, tn, lang } = useI18n()
  const [text, setText] = useState(EXAMPLES[0].yaml)
  const [mode, setMode] = useState<Mode>('edit')
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Severity | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [fresh, setFresh] = useState<ReadonlySet<number>>(NO_LINES)
  const [focusLine, setFocusLine] = useState<number | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const freshTimer = useRef<number>(0)

  useEffect(() => () => window.clearTimeout(freshTimer.current), [])

  const deferred = useDeferredValue(text)
  const result = useMemo(() => lint(deferred), [deferred])
  const score = useMemo(() => computeScore(result), [result])
  const allFixes = useMemo(() => autoFix(deferred), [deferred])

  const preview = useMemo(
    () => (mode === 'review' ? autoFix(deferred, { include: (id) => !excluded.has(id) }) : null),
    [mode, deferred, excluded],
  )
  const afterScore = useMemo(() => (preview ? computeScore(lint(preview.output)) : null), [preview])

  const fixable = useMemo(() => {
    const spots = new Map<string, FixSafety>()
    for (const fix of allFixes.fixes) {
      const spot = fixSpot(fix)
      if (spots.get(spot) !== 'review') spots.set(spot, fix.safety)
    }
    return spots
  }, [allFixes])

  // Each suggestion costs one run of the fixer, so only the open annotations get one.
  const suggestions = useMemo(() => {
    const diffs = new Map<string, DiffOp[]>()
    for (const f of result.findings) {
      const key = findingKey(f)
      if (!expanded.has(key) || !fixable.has(fixSpot(f))) continue
      const fixed = autoFix(deferred, { only: (x) => findingKey(x) === key })
      if (fixed.fixes.length > 0) diffs.set(key, diffLines(deferred, fixed.output))
    }
    return diffs
  }, [deferred, expanded, result.findings, fixable])

  const labels = useMemo(
    () => ({
      apply: t('ann.apply'),
      how: t('findings.how'),
      maps: t('findings.maps'),
      manual: t('findings.manual'),
      safe: t('fix.safe'),
      review: t('fix.review'),
      suggestion: t('ann.suggestion'),
      severity: { critical: t('sev.critical'), warning: t('sev.warning'), info: t('sev.info') },
    }),
    [t],
  )

  const annotations = useMemo(
    () =>
      buildAnnotationItems({
        findings: result.findings,
        filter,
        expanded,
        fixable,
        suggestions,
        text: (f) => findingText(lang, f),
        standards: standardsOf,
        labels,
      }),
    [result.findings, filter, expanded, fixable, suggestions, lang, labels],
  )

  const hasScore = score.resources.length > 0 && result.errors.length === 0
  const meterScore = !hasScore ? null : (afterScore ?? score).overall

  const meterCaption = (() => {
    if (text.trim() === '') return t('meter.empty')
    if (result.tooLarge) return t('meter.tooLarge')
    if (result.errors.length > 0) return t('meter.syntax')
    if (!hasScore) return t('meter.noWorkloads')
    if (afterScore && preview) return tn('meter.projected', preview.fixes.length, { score: score.overall })
    const resources = tn('count.resource', score.resources.length)
    return result.findings.length === 0
      ? t('meter.clean', { resources })
      : t('meter.findings', { findings: tn('count.finding', result.findings.length), resources })
  })()

  const goToLine = (line: number | undefined) => {
    setFocusLine(line ?? null)
    const view = viewRef.current
    if (!view || !line || line > view.state.doc.lines) return
    const pos = view.state.doc.line(line).from
    view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) })
  }

  const selectFinding = (finding: Finding) => {
    goToLine(finding.line)
    if (finding.line) setExpanded((prev) => new Set(prev).add(findingKey(finding)))
  }

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (!next.delete(key)) next.add(key)
      return next
    })

  const applyOne = (key: string) => {
    const fixed = autoFix(text, { only: (f) => findingKey(f) === key })
    if (fixed.fixes.length === 0) return
    const changed = diffLines(text, fixed.output).flatMap((op) => (op.type === 'add' && op.line ? [op.line] : []))
    setText(fixed.output)
    setFresh(new Set(changed))
    window.clearTimeout(freshTimer.current)
    freshTimer.current = window.setTimeout(() => setFresh(NO_LINES), 1700)
    setExpanded((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  // The editor keeps one handlers object for its widgets, so it must always reach the latest callbacks.
  const actions = useRef({ toggle, apply: applyOne })
  useEffect(() => {
    actions.current = { toggle, apply: applyOne }
  })
  const handlers = useMemo<AnnotationHandlers>(
    () => ({ toggle: (key) => actions.current.toggle(key), apply: (key) => actions.current.apply(key) }),
    [],
  )

  const load = (yaml: string) => {
    setText(yaml)
    setMode('edit')
    setFocusLine(null)
    setExpanded(new Set())
  }

  const toggleRule = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const fixCount = allFixes.fixes.length

  return (
    <section id="tool" aria-label={t('tool.region')} className="mx-auto w-full max-w-6xl scroll-mt-4 px-4 sm:px-5">
      <div className="grid overflow-hidden rounded-lg border border-line bg-panel lg:h-[min(82dvh,800px)] lg:grid-cols-[minmax(0,1fr)_26rem] lg:grid-rows-[auto_minmax(0,1fr)]">
        <div className="order-1 lg:order-none lg:col-start-2 lg:row-start-1">
          <ScoreMeter score={meterScore} caption={meterCaption} />
        </div>

        <section
          className="order-2 flex h-[65dvh] min-w-0 flex-col border-b border-line lg:order-none lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:h-auto lg:border-b-0"
          aria-label={t('tool.manifest')}
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 sm:px-4">
            {mode === 'edit' ? (
              <>
                <span className="mr-1 text-sm text-dim">{t('tool.load')}</span>
                {EXAMPLES.map((ex) => (
                  <button key={ex.id} type="button" onClick={() => load(ex.yaml)} className="btn">
                    {t(ex.labelKey)}
                  </button>
                ))}
                <button type="button" onClick={() => load('')} disabled={text === ''} className="btn">
                  {t('tool.clear')}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('review')}
                  disabled={fixCount === 0 || result.errors.length > 0}
                  title={fixCount === 0 ? t('tool.nothingFixable') : undefined}
                  className="btn btn-primary w-full sm:ml-auto sm:w-auto"
                >
                  {fixCount === 0 ? t('tool.autofix') : tn('tool.autofix', fixCount)}
                </button>
              </>
            ) : (
              <span className="text-sm text-dim">{t('tool.diffHint')}</span>
            )}
          </div>
          <div className="min-h-0 flex-1">
            {mode === 'edit' ? (
              <Editor
                value={text}
                onChange={setText}
                findings={result.findings}
                errors={result.errors}
                focusLine={focusLine}
                fresh={fresh}
                annotations={annotations.items}
                handlers={handlers}
                viewRef={viewRef}
                label={t('tool.editorLabel')}
                placeholder={t('tool.placeholder')}
              />
            ) : (
              <DiffView original={text} modified={preview?.output ?? text} label={t('tool.diffLabel')} />
            )}
          </div>
        </section>

        <aside className="order-3 flex min-h-0 flex-col lg:order-none lg:col-start-2 lg:row-start-2" aria-label={t('tool.results')}>
          {mode === 'review' && preview ? (
            <FixPanel
              allFixes={allFixes.fixes}
              excluded={excluded}
              onToggle={toggleRule}
              output={preview.output}
              onApply={() => {
                load(preview.output)
                setExcluded(new Set())
              }}
              onBack={() => setMode('edit')}
            />
          ) : (
            <>
              {result.tooLarge && (
                <p role="alert" className="border-b border-line px-4 py-3 text-sm text-crit sm:px-5 lg:border-l">
                  {t('err.tooLarge', {
                    size: Math.ceil(result.tooLarge.bytes / 1024),
                    limit: result.tooLarge.limit / 1024,
                  })}
                </p>
              )}
              {result.errors.length > 0 && (
                <div role="alert" className="space-y-1 border-b border-line px-4 py-3 text-sm text-crit sm:px-5 lg:border-l">
                  {result.errors.slice(0, 4).map((e, i) => (
                    <p key={i}>
                      <button type="button" className="font-mono underline" onClick={() => goToLine(e.line)}>
                        {t('err.at', { line: e.line, col: e.col })}
                      </button>
                      : {e.message.split('\n')[0]}
                    </p>
                  ))}
                </div>
              )}
              {text.trim() === '' ? (
                <div className="space-y-3 px-4 py-6 text-sm text-dim sm:px-5 lg:border-l lg:border-line">
                  <p>{t('empty.text')}</p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLES.map((ex) => (
                      <button key={ex.id} type="button" onClick={() => load(ex.yaml)} className="btn text-text">
                        {t(ex.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                !result.tooLarge &&
                result.errors.length === 0 && (
                  <Findings
                    findings={result.findings}
                    counts={score.counts}
                    filter={filter}
                    onFilter={setFilter}
                    onSelect={selectFinding}
                    hidden={annotations.hidden}
                    shown={ANNOTATION_LIMIT}
                  />
                )
              )}
            </>
          )}
        </aside>
      </div>
    </section>
  )
}
