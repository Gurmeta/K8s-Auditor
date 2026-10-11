import { describe, expect, it } from 'vitest'
import { lint, findingKey } from '../src/core/engine'
import { autoFix } from '../src/core/fixer'
import { ANNOTATION_LIMIT, buildAnnotationItems, fixSpot, type BuildInput } from '../src/ui/annotationItems'

const manifest = `kind: Pod
metadata:
  name: p
spec:
  hostNetwork: true
  containers:
    - name: app
      image: nginx:latest
      securityContext:
        privileged: true
`

const labels: BuildInput['labels'] = {
  apply: 'Apply',
  how: 'How: ',
  maps: 'Maps to',
  manual: 'Manual',
  safe: 'safe',
  review: 'review',
  suggestion: 'Change',
  severity: { critical: 'Critical', warning: 'Warning', info: 'Info' },
}

function input(overrides: Partial<BuildInput> = {}): BuildInput {
  const { findings } = lint(manifest)
  const fixable = new Map(autoFix(manifest).fixes.map((f) => [fixSpot(f), f.safety] as const))
  return {
    findings,
    filter: null,
    expanded: new Set(),
    fixable,
    suggestions: new Map(),
    text: (f) => ({ message: f.message, how: f.recommendation }),
    standards: () => '',
    labels,
    ...overrides,
  }
}

describe('buildAnnotationItems', () => {
  it('orders annotations by line, then by severity, and only keeps findings with a line', () => {
    const { items } = buildAnnotationItems(input())
    const lines = items.map((i) => i.line)
    expect(lines).toEqual([...lines].sort((a, b) => a - b))
    const sameLine = items.filter((i) => i.line === items[0].line).map((i) => i.severity)
    expect(sameLine).toEqual([...sameLine].sort())
  })

  it('offers a fix only where Auto-Fix can change something', () => {
    const { items } = buildAnnotationItems(input())
    expect(items.find((i) => i.ruleId === 'KSA-005')!.fix).toBeNull()
    expect(items.find((i) => i.ruleId === 'KSA-008')!.fix).toMatchObject({ tag: 'review', tagLabel: 'review' })
    expect(items.find((i) => i.ruleId === 'KSA-010')!.fix).toMatchObject({ tag: 'safe' })
  })

  it('filters by severity', () => {
    const { items } = buildAnnotationItems(input({ filter: 'critical' }))
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((i) => i.severity === 'critical')).toBe(true)
  })

  it('includes a suggestion only for expanded findings', () => {
    const { findings } = lint(manifest)
    const target = findings.find((f) => f.ruleId === 'KSA-010')!
    const key = findingKey(target)
    const suggestions = new Map([[key, [{ type: 'add' as const, text: 'allowPrivilegeEscalation: false', line: 11 }]]])

    const collapsed = buildAnnotationItems(input({ suggestions }))
    expect(collapsed.items.find((i) => i.key === key)!.fix!.suggestion).toBeNull()

    const open = buildAnnotationItems(input({ suggestions, expanded: new Set([key]) }))
    const item = open.items.find((i) => i.key === key)!
    expect(item.expanded).toBe(true)
    expect(item.fix!.suggestion).toHaveLength(1)
  })

  it('caps the number of annotations and reports how many were left out', () => {
    const one = lint(manifest).findings[0]
    const findings = Array.from({ length: ANNOTATION_LIMIT + 25 }, (_, i) => ({ ...one, path: [...one.path, i] }))
    const { items, hidden } = buildAnnotationItems(input({ findings }))
    expect(items).toHaveLength(ANNOTATION_LIMIT)
    expect(hidden).toBe(25)
  })
})
