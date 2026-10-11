import { describe, expect, it } from 'vitest'
import { lint } from '../src/core/engine'

const deployment = (container: string, kind = 'Deployment') => `
apiVersion: apps/v1
kind: ${kind}
metadata:
  name: web
spec:
  template:
    spec:
      containers:
        - name: app
          image: nginx:1.27
${container}`

const ids = (yaml: string) => lint(yaml).findings.map((f) => f.ruleId)

describe('KSA-001 / KSA-002 resources', () => {
  it('flags missing requests and limits', () => {
    expect(ids(deployment(''))).toEqual(expect.arrayContaining(['KSA-001', 'KSA-002']))
  })

  it('names exactly which resource is missing', () => {
    const y = deployment(`          resources:
            requests: { cpu: 100m }
            limits: { memory: 128Mi }`)
    const f = lint(y).findings
    expect(f.find((x) => x.ruleId === 'KSA-001')?.message).toContain('memory request')
    expect(f.find((x) => x.ruleId === 'KSA-002')?.message).toContain('cpu limit')
  })

  it('passes when everything is set', () => {
    const y = deployment(`          resources:
            requests: { cpu: 100m, memory: 64Mi }
            limits: { cpu: 500m, memory: 128Mi }`)
    expect(ids(y)).not.toContain('KSA-001')
    expect(ids(y)).not.toContain('KSA-002')
  })

  it('treats empty (null) values as missing', () => {
    const y = deployment(`          resources:
            requests:
            limits:`)
    expect(ids(y)).toEqual(expect.arrayContaining(['KSA-001', 'KSA-002']))
  })

  it('also checks initContainers and reports the container line', () => {
    const y = `kind: Pod
metadata:
  name: p
spec:
  initContainers:
    - name: init
      image: busybox:1.36
  containers:
    - name: app
      image: nginx:1.27
`
    const f = lint(y).findings.filter((x) => x.ruleId === 'KSA-002')
    expect(f.map((x) => x.container)).toEqual(['app', 'init'])
    expect(f.find((x) => x.container === 'init')?.line).toBe(6)
  })
})

describe('KSA-003 / KSA-004 probes', () => {
  it('flags missing probes on a Deployment', () => {
    expect(ids(deployment(''))).toEqual(expect.arrayContaining(['KSA-003', 'KSA-004']))
  })

  it('passes when probes are defined', () => {
    const y = deployment(`          readinessProbe: { httpGet: { path: /, port: 80 } }
          livenessProbe: { httpGet: { path: /, port: 80 } }`)
    expect(ids(y)).not.toContain('KSA-003')
    expect(ids(y)).not.toContain('KSA-004')
  })

  it('does not apply probes rules to Jobs', () => {
    const y = `kind: Job
metadata:
  name: j
spec:
  template:
    spec:
      containers:
        - name: c
          image: busybox:1.36
`
    expect(ids(y)).not.toContain('KSA-003')
    expect(ids(y)).not.toContain('KSA-004')
  })

  it('does not require probes on initContainers', () => {
    const y = `kind: Pod
metadata:
  name: p
spec:
  initContainers:
    - name: init
      image: busybox:1.36
  containers:
    - name: app
      image: nginx:1.27
      readinessProbe: { tcpSocket: { port: 80 } }
      livenessProbe: { tcpSocket: { port: 80 } }
`
    expect(ids(y)).not.toContain('KSA-003')
    expect(ids(y)).not.toContain('KSA-004')
  })
})
