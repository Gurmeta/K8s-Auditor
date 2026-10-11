import type { LintResult } from '../engine'
import type { Finding, Severity } from '../types'

export const WEIGHTS: Record<Severity, number> = { critical: 15, warning: 5, info: 1 }
/** Repeats of the same rule (e.g. 10 containers) add this share of the weight each... */
export const REPEAT_FACTOR = 0.5
/** ...up to this multiple of the weight, so one noisy rule can't zero the score on its own. */
export const MAX_RULE_MULTIPLE = 2
export const CRITICAL_CAP = 60

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F'

export interface ResourceScore {
  index: number
  kind: string
  name: string
  score: number
  counts: Record<Severity, number>
}

export interface ScoreSummary {
  /** 0-100; mean of the resource scores, capped at CRITICAL_CAP if anything is critical. */
  overall: number
  grade: Grade
  counts: Record<Severity, number>
  resources: ResourceScore[]
}

const emptyCounts = (): Record<Severity, number> => ({ critical: 0, warning: 0, info: 0 })

export function gradeOf(score: number): Grade {
  return score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F'
}

function scoreResource(findings: Finding[]): { score: number; counts: Record<Severity, number> } {
  const counts = emptyCounts()
  const perRule = new Map<string, { severity: Severity; n: number }>()
  for (const f of findings) {
    counts[f.severity]++
    const entry = perRule.get(f.ruleId) ?? { severity: f.severity, n: 0 }
    entry.n++
    perRule.set(f.ruleId, entry)
  }
  let deduction = 0
  for (const { severity, n } of perRule.values()) {
    deduction += WEIGHTS[severity] * Math.min(MAX_RULE_MULTIPLE, 1 + REPEAT_FACTOR * (n - 1))
  }
  let score = Math.round(Math.max(0, 100 - deduction))
  if (counts.critical > 0) score = Math.min(score, CRITICAL_CAP)
  return { score, counts }
}

export function computeScore({ findings, resources }: Pick<LintResult, 'findings' | 'resources'>): ScoreSummary {
  const scored: ResourceScore[] = resources
    .filter((r) => r.applicable)
    .map((r) => {
      const { score, counts } = scoreResource(findings.filter((f) => f.resourceIndex === r.index))
      return { index: r.index, kind: r.kind, name: r.name, score, counts }
    })

  const counts = emptyCounts()
  for (const f of findings) counts[f.severity]++

  const mean = scored.length ? scored.reduce((sum, r) => sum + r.score, 0) / scored.length : 100
  const overall = Math.round(counts.critical > 0 ? Math.min(mean, CRITICAL_CAP) : mean)
  return { overall, grade: gradeOf(overall), counts, resources: scored }
}
