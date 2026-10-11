import { describe, expect, it } from 'vitest'
import { lint } from '../src/core/engine'

/** Pod with optional pod-level and container-level securityContext (already indented YAML). */
const pod = (container = '', podLevel = '') => `kind: Pod
metadata:
  name: p
spec:
${podLevel}  containers:
    - name: app
      image: nginx:1.27
${container}`

const ids = (yaml: string) => lint(yaml).findings.map((f) => f.ruleId)

describe('KSA-008 privileged', () => {
  it('is Critical and flags privileged: true', () => {
    const f = lint(pod('      securityContext:\n        privileged: true')).findings.find((x) => x.ruleId === 'KSA-008')
    expect(f?.severity).toBe('critical')
    expect(f?.line).toBe(9)
  })
  it('passes when false or unset', () => {
    expect(ids(pod('      securityContext:\n        privileged: false'))).not.toContain('KSA-008')
    expect(ids(pod())).not.toContain('KSA-008')
  })
})

describe('KSA-009 runAsNonRoot', () => {
  it('flags when unset', () => expect(ids(pod())).toContain('KSA-009'))
  it('flags explicit root (runAsNonRoot false, runAsUser 0)', () => {
    expect(ids(pod('      securityContext:\n        runAsNonRoot: false'))).toContain('KSA-009')
    const f = lint(pod('      securityContext:\n        runAsUser: 0')).findings.find((x) => x.ruleId === 'KSA-009')
    expect(f?.message).toContain('explicitly')
  })
  it('passes with container-level runAsNonRoot: true', () =>
    expect(ids(pod('      securityContext:\n        runAsNonRoot: true'))).not.toContain('KSA-009'))
  it('passes with pod-level runAsNonRoot: true (effective value)', () =>
    expect(ids(pod('', '  securityContext:\n    runAsNonRoot: true\n'))).not.toContain('KSA-009'))
  it('passes with a non-zero runAsUser', () =>
    expect(ids(pod('      securityContext:\n        runAsUser: 10001'))).not.toContain('KSA-009'))
  it('container-level false overrides pod-level true', () =>
    expect(
      ids(pod('      securityContext:\n        runAsNonRoot: false', '  securityContext:\n    runAsNonRoot: true\n')),
    ).toContain('KSA-009'))
})

describe('KSA-010 allowPrivilegeEscalation', () => {
  it('flags when unset or true', () => {
    expect(ids(pod())).toContain('KSA-010')
    expect(ids(pod('      securityContext:\n        allowPrivilegeEscalation: true'))).toContain('KSA-010')
  })
  it('passes when false', () =>
    expect(ids(pod('      securityContext:\n        allowPrivilegeEscalation: false'))).not.toContain('KSA-010'))
})

describe('KSA-011 drop capabilities', () => {
  it('flags when not dropping ALL', () => {
    expect(ids(pod())).toContain('KSA-011')
    expect(ids(pod('      securityContext:\n        capabilities:\n          drop: [NET_RAW]'))).toContain('KSA-011')
  })
  it('passes when ALL is dropped', () =>
    expect(ids(pod('      securityContext:\n        capabilities:\n          drop: ["ALL"]'))).not.toContain('KSA-011'))
})

describe('KSA-012 readOnlyRootFilesystem', () => {
  it('flags when not true', () => expect(ids(pod())).toContain('KSA-012'))
  it('passes when true', () =>
    expect(ids(pod('      securityContext:\n        readOnlyRootFilesystem: true'))).not.toContain('KSA-012'))
})

describe('KSA-013 seccomp', () => {
  it('flags when missing', () => expect(ids(pod())).toContain('KSA-013'))
  it('flags Unconfined', () => {
    const y = pod('      securityContext:\n        seccompProfile:\n          type: Unconfined')
    expect(lint(y).findings.find((x) => x.ruleId === 'KSA-013')?.message).toContain('Unconfined')
  })
  it('passes with RuntimeDefault at container or pod level', () => {
    expect(ids(pod('      securityContext:\n        seccompProfile:\n          type: RuntimeDefault'))).not.toContain('KSA-013')
    expect(ids(pod('', '  securityContext:\n    seccompProfile:\n      type: RuntimeDefault\n'))).not.toContain('KSA-013')
  })
})

describe('KSA-014 missing securityContext', () => {
  it('flags when neither pod nor container has one', () => expect(ids(pod())).toContain('KSA-014'))
  it('passes when the container has one', () =>
    expect(ids(pod('      securityContext: {}\n'))).not.toContain('KSA-014'))
  it('passes when the pod has one', () =>
    expect(ids(pod('', '  securityContext:\n    fsGroup: 2000\n'))).not.toContain('KSA-014'))
})
