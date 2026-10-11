import { describe, expect, it } from 'vitest'
import { lint } from '../src/core/engine'

const pod = (podLevel = '', env = '') => `kind: Pod
metadata:
  name: p
spec:
${podLevel}  containers:
    - name: app
      image: nginx:1.27
${env}`

const ids = (yaml: string) => lint(yaml).findings.map((f) => f.ruleId)

describe('KSA-015 host namespaces', () => {
  it('is Critical and reports one finding per shared namespace', () => {
    const f = lint(pod('  hostNetwork: true\n  hostPID: true\n')).findings.filter((x) => x.ruleId === 'KSA-015')
    expect(f).toHaveLength(2)
    expect(f.every((x) => x.severity === 'critical')).toBe(true)
    expect(f[0].line).toBe(5)
  })
  it('passes when false or unset', () => {
    expect(ids(pod('  hostNetwork: false\n'))).not.toContain('KSA-015')
    expect(ids(pod())).not.toContain('KSA-015')
  })
})

describe('KSA-016 hostPath', () => {
  it('flags hostPath volumes only', () => {
    const y = pod(`  volumes:
    - name: docker
      hostPath: { path: /var/run/docker.sock }
    - name: tmp
      emptyDir: {}
`)
    const f = lint(y).findings.filter((x) => x.ruleId === 'KSA-016')
    expect(f).toHaveLength(1)
    expect(f[0].message).toContain('docker')
  })
})

describe('KSA-017 default namespace', () => {
  it('flags explicit default namespace only', () => {
    const base = (ns: string) => `kind: Service\nmetadata:\n  name: s\n${ns}`
    const f = lint(base('  namespace: default\n')).findings.find((x) => x.ruleId === 'KSA-017')
    expect(f?.line).toBe(4)
    expect(ids(base('  namespace: prod\n'))).not.toContain('KSA-017')
    expect(ids(base(''))).not.toContain('KSA-017')
  })
})

describe('KSA-018 / KSA-019 service account', () => {
  it('flags the default or unset ServiceAccount', () => {
    expect(ids(pod())).toContain('KSA-018')
    expect(ids(pod('  serviceAccountName: default\n'))).toContain('KSA-018')
  })
  it('passes for a dedicated ServiceAccount', () =>
    expect(ids(pod('  serviceAccountName: web-sa\n'))).not.toContain('KSA-018'))
  it('flags token automount unless disabled', () => {
    expect(ids(pod())).toContain('KSA-019')
    expect(ids(pod('  automountServiceAccountToken: false\n'))).not.toContain('KSA-019')
  })
})

describe('KSA-020 plaintext secrets', () => {
  it('flags sensitive names with literal values', () => {
    const f = lint(pod('', '      env:\n        - { name: DB_PASSWORD, value: hunter2 }\n        - { name: LOG_LEVEL, value: debug }'))
      .findings.filter((x) => x.ruleId === 'KSA-020')
    expect(f).toHaveLength(1)
    expect(f[0].message).toContain('DB_PASSWORD')
  })
  it('ignores valueFrom references and empty values', () => {
    const env = `      env:
        - name: API_TOKEN
          valueFrom: { secretKeyRef: { name: s, key: t } }
        - { name: EMPTY_SECRET, value: "" }`
    expect(ids(pod('', env))).not.toContain('KSA-020')
  })
})

describe('KSA-021 single replica', () => {
  const dep = (replicas: string) =>
    `kind: Deployment\nmetadata:\n  name: d\nspec:\n${replicas}  template:\n    spec:\n      containers:\n        - name: a\n          image: x:1\n`
  it('flags an explicit replicas: 1', () => {
    const f = lint(dep('  replicas: 1\n')).findings.find((x) => x.ruleId === 'KSA-021')
    expect(f?.line).toBe(5)
  })
  it('passes for 2+ or an omitted value', () => {
    expect(ids(dep('  replicas: 3\n'))).not.toContain('KSA-021')
    expect(ids(dep(''))).not.toContain('KSA-021')
  })
})

describe('KSA-022 exposed service', () => {
  const svc = (type: string) => `kind: Service\nmetadata:\n  name: s\nspec:\n  type: ${type}\n`
  it('flags NodePort and LoadBalancer', () => {
    expect(ids(svc('NodePort'))).toContain('KSA-022')
    expect(lint(svc('LoadBalancer')).findings.find((x) => x.ruleId === 'KSA-022')?.line).toBe(5)
  })
  it('passes for ClusterIP', () => expect(ids(svc('ClusterIP'))).not.toContain('KSA-022'))
})
