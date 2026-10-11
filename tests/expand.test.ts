import { describe, expect, it } from 'vitest'
import { lint } from '../src/core/engine'
import { autoFix } from '../src/core/fixer'
import { parseManifests } from '../src/core/parser'
import { MAX_EXPANDED_NODES } from '../src/core/parser/expand'

const pod = (containers: string) => `apiVersion: v1
kind: Pod
metadata:
  name: web
  namespace: prod
spec:
  containers:
${containers}`

const privilegedContainers = (yaml: string) =>
  lint(yaml)
    .findings.filter((f) => f.ruleId === 'KSA-008')
    .map((f) => f.container)

describe('alias expansion', () => {
  const shared = pod(`    - name: app
      image: nginx:1.27
      securityContext: &sc
        privileged: true
    - name: side
      image: busybox:1.36
      securityContext: *sc
`)

  it('lets rules see values that come from an alias', () => {
    expect(privilegedContainers(shared)).toEqual(['app', 'side'])
  })

  it('points a finding from an alias at the anchor line', () => {
    const side = lint(shared).findings.find((f) => f.ruleId === 'KSA-008' && f.container === 'side')
    expect(side?.line).toBe(lint(shared).findings.find((f) => f.container === 'app' && f.ruleId === 'KSA-008')?.line)
  })

  it('resolves merge keys, with the explicit keys winning', () => {
    const yaml = pod(`    - &base
      name: base
      image: nginx:1.27
      securityContext:
        privileged: true
    - <<: *base
      name: child
      securityContext:
        privileged: false
    - <<: *base
      name: heir
`)
    expect(privilegedContainers(yaml)).toEqual(['base', 'heir'])
  })

  it('lets earlier sources win in a merge list', () => {
    const withOrder = (order: string) =>
      pod(`    - name: app
      image: nginx:1.27
      securityContext:
        <<: [${order}]
`).replace(
        'spec:',
        `x-off: &off
  privileged: false
x-on: &on
  privileged: true
spec:`,
      )
    expect(privilegedContainers(withOrder('*off, *on'))).toEqual([])
    expect(privilegedContainers(withOrder('*on, *off'))).toEqual(['app'])
  })

  it('expands nested aliases', () => {
    const yaml = `kind: Pod
metadata:
  name: web
x-sc: &inner
  privileged: true
x-ctx: &outer
  securityContext: *inner
spec:
  containers:
    - name: app
      image: nginx:1.27
      <<: *outer
`
    expect(privilegedContainers(yaml)).toEqual(['app'])
  })

  it('refuses exponentially nested aliases instead of expanding them', () => {
    const levels = 30
    const lines = ['kind: Pod', 'metadata:', '  name: bomb', 'x-0: &a0 [lol, lol]']
    for (let i = 1; i < levels; i++) lines.push(`x-${i}: &a${i} [*a${i - 1}, *a${i - 1}]`)
    lines.push('spec:', '  containers: []')

    const started = Date.now()
    const { resources, errors } = parseManifests(lines.join('\n') + '\n', { expand: true })
    expect(Date.now() - started).toBeLessThan(2000)
    expect(resources).toEqual([])
    expect(errors[0].message).toContain(String(MAX_EXPANDED_NODES))
  })

  it('does not expand by default, so documents still serialize to the input', () => {
    const [r] = parseManifests(shared).resources
    expect(r.doc.toString()).toBe(shared)
  })

  it('keeps anchors and aliases when auto-fixing', () => {
    const { output } = autoFix(shared)
    expect(output).toContain('&sc')
    expect(output).toContain('*sc')
  })

  it('does not offer a fix for a spot that only exists through an alias', () => {
    const { fixes } = autoFix(shared)
    expect(fixes.some((f) => f.container === 'side' && f.ruleId === 'KSA-008')).toBe(false)
  })
})
