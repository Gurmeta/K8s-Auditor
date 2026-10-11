import type { DiffOp } from '../core/diff'
import { findingKey } from '../core/engine'
import type { Finding, FixSafety, Severity } from '../core/types'
import type { AnnotationItem } from './annotations'

export const ANNOTATION_LIMIT = 300

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }

/** Groups the places a fix can be applied: the same rule in the same resource and container. */
export const fixSpot = (f: { ruleId: string; resource: { kind: string; name: string }; container?: string }): string =>
  `${f.ruleId}|${f.resource.kind}/${f.resource.name}|${f.container ?? ''}`

export interface Labels {
  apply: string
  how: string
  maps: string
  manual: string
  safe: string
  review: string
  suggestion: string
  severity: Record<Severity, string>
}

export interface BuildInput {
  findings: Finding[]
  filter: Severity | null
  expanded: ReadonlySet<string>
  /** Spots Auto-Fix can change, with how risky the change is (from one run over the whole file). */
  fixable: ReadonlyMap<string, FixSafety>
  /** Diffs for the expanded findings only; computing one costs a run of the fixer. */
  suggestions: ReadonlyMap<string, DiffOp[]>
  text: (finding: Finding) => { message: string; how: string }
  standards: (ruleId: string) => string
  labels: Labels
}

export function buildAnnotationItems(input: BuildInput): { items: AnnotationItem[]; hidden: number } {
  const eligible = input.findings
    .filter((f) => f.line && (!input.filter || f.severity === input.filter))
    .sort((a, b) => a.line! - b.line! || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  const items = eligible.slice(0, ANNOTATION_LIMIT).map((f): AnnotationItem => {
    const key = findingKey(f)
    const safety = input.fixable.get(fixSpot(f))
    const expanded = input.expanded.has(key)
    const text = input.text(f)
    return {
      key,
      line: f.line!,
      severity: f.severity,
      severityLabel: input.labels.severity[f.severity],
      ruleId: f.ruleId,
      title: text.message,
      how: text.how,
      maps: input.standards(f.ruleId),
      expanded,
      fix: safety
        ? {
            tag: safety,
            tagLabel: safety === 'safe' ? input.labels.safe : input.labels.review,
            suggestion: expanded ? (input.suggestions.get(key) ?? null) : null,
          }
        : null,
      labels: {
        apply: input.labels.apply,
        how: input.labels.how,
        maps: input.labels.maps,
        manual: input.labels.manual,
        suggestion: input.labels.suggestion,
      },
    }
  })

  return { items, hidden: eligible.length - items.length }
}
