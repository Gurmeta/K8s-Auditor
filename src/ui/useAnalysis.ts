import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { diffLines, type DiffOp } from '../core/diff'
import { findingKey, lint, type ErrorReporter } from '../core/engine'
import { autoFix } from '../core/fixer'
import { rules } from '../core/rules'
import { computeScore } from '../core/scoring'
import type { FixSafety } from '../core/types'
import { fixSpot } from './annotationItems'

/** The core stays free of console access, so the page decides what to do with recovered errors. */
export const reportCoreError: ErrorReporter = (message, error) => console.error(message, error)

// Above this size every keystroke would run the whole analysis for hundreds of milliseconds, so it waits for a pause.
const LARGE_INPUT_CHARS = 100 * 1024
const LARGE_INPUT_DELAY_MS = 300

function useAnalysedText(text: string): string {
  const deferred = useDeferredValue(text)
  const [settled, setSettled] = useState(deferred)
  const large = deferred.length > LARGE_INPUT_CHARS

  useEffect(() => {
    if (!large) return
    const timer = window.setTimeout(() => setSettled(deferred), LARGE_INPUT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [deferred, large])

  return large ? settled : deferred
}

interface Options {
  text: string
  reviewing: boolean
  excluded: Set<string>
  expanded: Set<string>
}

export function useAnalysis({ text, reviewing, excluded, expanded }: Options) {
  const analysed = useAnalysedText(text)
  const result = useMemo(() => lint(analysed, rules, reportCoreError), [analysed])
  const score = useMemo(() => computeScore(result), [result])
  const allFixes = useMemo(() => autoFix(analysed, { onError: reportCoreError }), [analysed])

  const preview = useMemo(
    () =>
      reviewing ? autoFix(analysed, { include: (id) => !excluded.has(id), onError: reportCoreError }) : null,
    [reviewing, analysed, excluded],
  )
  const afterScore = useMemo(() => (preview ? computeScore(lint(preview.output, rules, reportCoreError)) : null), [preview])

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
      const fixed = autoFix(analysed, { only: (x) => findingKey(x) === key, onError: reportCoreError })
      if (fixed.fixes.length > 0) diffs.set(key, diffLines(analysed, fixed.output))
    }
    return diffs
  }, [analysed, expanded, result.findings, fixable])

  return { result, score, allFixes, preview, afterScore, fixable, suggestions }
}
