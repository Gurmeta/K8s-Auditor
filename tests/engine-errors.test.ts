import { describe, expect, it, vi } from 'vitest'
import { lint } from '../src/core/engine'
import { rules } from '../src/core/rules'
import type { Rule } from '../src/core/types'

const POD = `apiVersion: v1
kind: Pod
metadata:
  name: web
spec:
  containers:
    - name: app
      image: nginx
`

const broken: Rule = {
  id: 'KSA-TEST',
  title: 'Always fails',
  severity: 'info',
  appliesTo: ['Pod'],
  standards: [],
  check: () => {
    throw new Error('boom')
  },
}

describe('recovering from a failing rule', () => {
  it('keeps the other rules running and reports the failure to the caller', () => {
    const onError = vi.fn()
    const result = lint(POD, [broken, ...rules], onError)

    expect(result.findings.length).toBeGreaterThan(0)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0]).toContain('KSA-TEST')
  })

  it('stays silent when nobody listens, because the core never logs on its own', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => lint(POD, [broken])).not.toThrow()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
