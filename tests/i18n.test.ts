import { describe, expect, it } from 'vitest'
import { lint } from '../src/core/engine'
import { autoFix, fixableRuleIds } from '../src/core/fixer'
import { rules } from '../src/core/rules'
import { bg } from '../src/i18n/bg'
import { en } from '../src/i18n/en'
import { findingBg, fixBg, fixesBg, rulesBg } from '../src/i18n/rules-bg'
import { RULE_GROUPS } from '../src/ui/ruleGroups'

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

const triggersEveryRule = `apiVersion: apps/v1
kind: Deployment
metadata: { name: bad, namespace: default }
spec:
  replicas: 1
  template:
    spec:
      hostNetwork: true
      hostPID: true
      hostIPC: true
      volumes:
        - name: sock
          hostPath: { path: /var/run/docker.sock }
      containers:
        - name: a
          image: nginx:latest
          imagePullPolicy: IfNotPresent
          env:
            - { name: DB_PASSWORD, value: hunter2 }
          securityContext: { privileged: true, runAsUser: 0 }
        - name: b
          image: nginx:1.27
          resources: { requests: { cpu: 100m }, limits: { memory: 64Mi } }
          securityContext: { seccompProfile: { type: Unconfined } }
        - name: c
          image: redis
---
apiVersion: v1
kind: Service
metadata: { name: svc, namespace: default }
spec: { type: NodePort }
`

describe('messages', () => {
  it('has the same keys in English and Bulgarian, none empty', () => {
    expect(Object.keys(bg).sort()).toEqual(Object.keys(en).sort())
    for (const [key, value] of Object.entries(bg)) expect(value.trim(), key).not.toBe('')
  })

  it('keeps the same {placeholders} in both languages', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(bg[key]), key).toEqual(placeholders(en[key]))
    }
  })

  it('has a singular and a plural form for every counted message', () => {
    for (const key of Object.keys(en)) {
      if (key.endsWith('.one')) expect(en, key).toHaveProperty(key.replace(/\.one$/, '.other'))
    }
  })
})

describe('rule texts', () => {
  it('covers every rule and every fixable rule in Bulgarian', () => {
    expect(Object.keys(rulesBg).sort()).toEqual(rules.map((r) => r.id).sort())
    expect(Object.keys(fixesBg).sort()).toEqual(fixableRuleIds().sort())
  })

  it('groups every rule exactly once', () => {
    const grouped = RULE_GROUPS.flatMap((g) => g.ids)
    expect([...grouped].sort()).toEqual(rules.map((r) => r.id).sort())
  })

  it('renders every finding in Bulgarian without missing values', () => {
    const { findings } = lint(triggersEveryRule)
    expect(new Set(findings.map((f) => f.ruleId)).size).toBe(rules.length)
    for (const f of findings) {
      const text = findingBg(f)
      expect(text, f.ruleId).not.toBeNull()
      expect(text!.message, f.ruleId).not.toMatch(/undefined|\{|„“/)
      expect(text!.how.length, f.ruleId).toBeGreaterThan(10)
    }
  })

  it('renders every applied fix in Bulgarian without missing values', () => {
    const { fixes } = autoFix(triggersEveryRule)
    expect(fixes.length).toBeGreaterThan(0)
    for (const fix of fixes) {
      const text = fixBg(fix)
      expect(text, fix.ruleId).not.toBeNull()
      expect(text, fix.ruleId).not.toMatch(/undefined|\{/)
    }
  })

  it('describes which resource is missing in the right words', () => {
    const f = lint(triggersEveryRule).findings.find((x) => x.ruleId === 'KSA-001' && x.container === 'b')
    expect(findingBg(f!)!.message).toContain('памет')
    expect(findingBg(f!)!.message).not.toContain('CPU')
  })
})
