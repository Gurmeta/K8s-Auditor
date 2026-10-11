import { describe, expect, it } from 'vitest'
import { lint } from '../src/core/engine'
import { autoFix } from '../src/core/fixer'
import { parseManifests } from '../src/core/parser'
import { computeScore } from '../src/core/scoring'

const deployment = (container: string, extra = '') => `# my app
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web # the web tier
spec:
${extra}  template:
    spec:
      containers:
        - name: app
          image: nginx:latest
${container}`

const ruleIds = (yaml: string) => lint(yaml).findings.map((f) => f.ruleId)
const containerOf = (yaml: string) => parseManifests(yaml).resources[0].doc.getIn(['spec', 'template', 'spec', 'containers', 0]) as { toJSON(): Record<string, any> }

describe('autoFix', () => {
  const input = deployment('          ports:\n            - containerPort: 8080\n')

  it('resolves fixable findings and improves the score', () => {
    const { output, fixes } = autoFix(input)
    expect(fixes.length).toBeGreaterThan(5)
    const fixed = new Set(ruleIds(output))
    for (const id of ['KSA-001', 'KSA-002', 'KSA-003', 'KSA-004', 'KSA-009', 'KSA-010', 'KSA-011', 'KSA-012', 'KSA-013']) {
      expect(fixed.has(id), id).toBe(false)
    }
    expect(computeScore(lint(output)).overall).toBeGreaterThan(computeScore(lint(input)).overall)
  })

  it('never touches :latest (manual-only) or Services', () => {
    const { output } = autoFix(input)
    expect(ruleIds(output)).toContain('KSA-005')
    expect(containerOf(output).toJSON().image).toBe('nginx:latest')
  })

  it('preserves comments', () => {
    const { output } = autoFix(input)
    expect(output).toContain('# my app')
    expect(output).toContain('# the web tier')
  })

  it('marks review fixes with a TODO comment and safe fixes without one', () => {
    const { output, fixes } = autoFix(input)
    expect(output).toContain('TODO(k8s-auditor): review')
    expect(fixes.find((f) => f.ruleId === 'KSA-010')?.safety).toBe('safe')
    expect(fixes.find((f) => f.ruleId === 'KSA-001')?.safety).toBe('review')
    expect(output).not.toMatch(/allowPrivilegeEscalation: false #/)
  })

  it('is idempotent: a second run changes nothing', () => {
    const first = autoFix(input)
    const second = autoFix(first.output)
    expect(second.fixes).toEqual([])
    expect(second.output).toBe(first.output)
  })

  it('returns the input untouched when there is nothing to fix', () => {
    const clean = 'kind: ConfigMap\nmetadata:\n  name: c\ndata: {}\n'
    expect(autoFix(clean)).toEqual({ output: clean, fixes: [], errors: [] })
  })

  it('does not rewrite input with syntax errors', () => {
    const bad = 'kind: Pod\nmetadata: [unclosed\n'
    const r = autoFix(bad)
    expect(r.output).toBe(bad)
    expect(r.errors.length).toBeGreaterThan(0)
  })

  it('only applies the rules the caller includes', () => {
    const { output, fixes } = autoFix(input, { include: (id) => id === 'KSA-010' })
    expect(fixes.map((f) => f.ruleId)).toEqual(['KSA-010'])
    expect(ruleIds(output)).not.toContain('KSA-010')
    expect(ruleIds(output)).toContain('KSA-009')
  })
})

describe('odd manifests', () => {
  const withAnchor = `kind: Pod
metadata:
  name: p
spec:
  containers:
    - name: a
      image: x:1
      securityContext: &sc
        runAsNonRoot: true
    - name: b
      image: y:1
      securityContext: *sc
`

  it('does not throw when a fix has to go through a YAML alias', () => {
    const run = () => autoFix(withAnchor)
    expect(run).not.toThrow()
    expect(run().output).toContain('&sc')
  })

  it('does not throw when linting aliased and malformed structures', () => {
    expect(() => lint(withAnchor)).not.toThrow()
    expect(() => lint('kind: Pod\nmetadata: 5\nspec:\n  containers: [null, 5, "x", {name: 3, env: "s"}]\n')).not.toThrow()
  })
})

describe('autoFix details', () => {
  it('skips probes when the container exposes no port', () => {
    const { output } = autoFix(deployment(''))
    expect(ruleIds(output)).toEqual(expect.arrayContaining(['KSA-003', 'KSA-004']))
  })

  it('never sets a limit below an existing request, nor a request above an existing limit', () => {
    const { output } = autoFix(deployment('          resources:\n            requests: { memory: 1Gi }\n            limits: { cpu: 50m }\n'))
    const res = containerOf(output).toJSON().resources
    expect(res.limits.memory).toBe('1Gi')
    expect(res.requests.cpu).toBe('50m')
  })

  it('handles empty `resources:` and `securityContext:` keys', () => {
    const { output } = autoFix(deployment('          resources:\n          securityContext:\n'))
    const c = containerOf(output).toJSON()
    expect(c.resources.requests.cpu).toBeDefined()
    expect(c.securityContext.allowPrivilegeEscalation).toBe(false)
  })

  it('replaces runAsUser: 0 and explicit privileged / host flags', () => {
    const { output } = autoFix(
      deployment('          securityContext:\n            privileged: true\n            runAsUser: 0\n', '  # x\n'),
    )
    const sc = containerOf(output).toJSON().securityContext
    expect(sc.privileged).toBe(false)
    expect(sc.runAsUser).toBe(10001)
    expect(sc.runAsNonRoot).toBe(true)
  })

  it('keeps a pod-level non-root user instead of overriding it', () => {
    const y = `kind: Pod
metadata:
  name: p
spec:
  securityContext:
    runAsUser: 2000
  containers:
    - name: app
      image: nginx:1.27
      securityContext:
        runAsNonRoot: false
`
    const doc = parseManifests(autoFix(y).output).resources[0].doc
    expect(doc.getIn(['spec', 'containers', 0, 'securityContext', 'runAsUser'])).toBeUndefined()
    expect(doc.getIn(['spec', 'containers', 0, 'securityContext', 'runAsNonRoot'])).toBe(true)
  })

  it('keeps every document of a multi-doc file, with a single separator between them', () => {
    const y = `${deployment('')}---\nkind: Service\nmetadata:\n  name: s\nspec:\n  type: NodePort\n`
    const { output } = autoFix(y)
    expect(output.match(/^---$/gm)).toHaveLength(1)
    expect(output).toContain('type: NodePort')
    expect(parseManifests(output).resources.map((r) => r.kind)).toEqual(['Deployment', 'Service'])
  })

  it('disables token automount and turns host namespaces off', () => {
    expect(ruleIds(autoFix(deployment('')).output)).not.toContain('KSA-019')
    const y = `kind: Pod\nmetadata:\n  name: p\nspec:\n  hostPID: true\n  containers:\n    - name: a\n      image: x:1\n`
    expect(ruleIds(autoFix(y).output)).not.toContain('KSA-015')
  })
})
