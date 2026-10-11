import { describe, expect, it } from 'vitest'
import { lint } from '../src/core/engine'
import { CRITICAL_CAP, computeScore, gradeOf } from '../src/core/scoring'

const secure = `kind: Pod
metadata:
  name: good
  namespace: prod
spec:
  serviceAccountName: sa
  automountServiceAccountToken: false
  securityContext:
    runAsNonRoot: true
    seccompProfile: { type: RuntimeDefault }
  containers:
    - name: app
      image: nginx:1.27@sha256:abc
      resources:
        requests: { cpu: 100m, memory: 64Mi }
        limits: { cpu: 200m, memory: 128Mi }
      readinessProbe: { tcpSocket: { port: 80 } }
      livenessProbe: { tcpSocket: { port: 80 } }
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities: { drop: [ALL] }
`

const container = (i: number) => `    - name: c${i}\n      image: nginx:1.27\n`
const pod = (n: number) =>
  `kind: Pod\nmetadata:\n  name: p\nspec:\n  containers:\n${Array.from({ length: n }, (_, i) => container(i)).join('')}`

describe('computeScore', () => {
  it('gives a fully hardened pod 100 / A', () => {
    const result = lint(secure)
    expect(result.findings).toEqual([])
    expect(computeScore(result)).toMatchObject({ overall: 100, grade: 'A' })
  })

  it('deducts by severity', () => {
    const s = computeScore(lint(pod(1)))
    expect(s.overall).toBeLessThan(100)
    expect(s.counts.warning).toBeGreaterThan(0)
    expect(s.counts.critical).toBe(0)
  })

  it('caps the deduction per rule so many containers do not zero the score', () => {
    // The same rules fire for 1 and 20 containers; repeats cost at most 2x a rule's weight in total.
    const one = computeScore(lint(pod(1))).overall
    const many = computeScore(lint(pod(20))).overall
    expect(many).toBeGreaterThan(0)
    expect(many).toBeLessThan(one)
    expect(100 - many).toBeLessThanOrEqual(2 * (100 - one))
  })

  it('caps the score at 60 when any critical finding exists', () => {
    const y = secure.replace('  containers:', '  hostNetwork: true\n  containers:')
    const s = computeScore(lint(y))
    expect(s.counts.critical).toBe(1)
    expect(s.overall).toBeLessThanOrEqual(CRITICAL_CAP)
    expect(s.grade).not.toBe('A')
  })

  it('ignores resources no rule checks (e.g. ConfigMap)', () => {
    const s = computeScore(lint('kind: ConfigMap\nmetadata:\n  name: c\ndata: {}\n'))
    expect(s.resources).toEqual([])
    expect(s.overall).toBe(100)
  })

  it('scores each resource separately', () => {
    const s = computeScore(lint(`${secure}---\n${pod(1)}`))
    expect(s.resources.map((r) => r.score)[0]).toBe(100)
    expect(s.resources[1].score).toBeLessThan(100)
    expect(s.overall).toBe(Math.round((s.resources[0].score + s.resources[1].score) / 2))
  })
})

describe('gradeOf', () => {
  it.each([[100, 'A'], [90, 'A'], [89, 'B'], [80, 'B'], [70, 'C'], [60, 'D'], [59, 'F'], [0, 'F']])('%i -> %s', (n, g) => {
    expect(gradeOf(n)).toBe(g)
  })
})
