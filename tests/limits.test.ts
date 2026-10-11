import { describe, expect, it } from 'vitest'
import { lint } from '../src/core/engine'
import { autoFix } from '../src/core/fixer'
import { checkInputSize, MAX_INPUT_BYTES } from '../src/core/limits'

const POD = `apiVersion: v1
kind: Pod
metadata:
  name: web
spec:
  containers:
    - name: app
      image: nginx
`

const padded = (bytes: number) => POD + '#'.repeat(bytes - POD.length)

describe('input size limit', () => {
  it('accepts input exactly at the limit', () => {
    const text = padded(MAX_INPUT_BYTES)
    expect(checkInputSize(text)).toBeNull()
    const result = lint(text)
    expect(result.tooLarge).toBeNull()
    expect(result.findings.length).toBeGreaterThan(0)
  })

  it('rejects input one byte over the limit without analysing it', () => {
    const text = padded(MAX_INPUT_BYTES + 1)
    const result = lint(text)
    expect(result.tooLarge).toEqual({ bytes: MAX_INPUT_BYTES + 1, limit: MAX_INPUT_BYTES })
    expect(result.findings).toEqual([])
    expect(result.resources).toEqual([])
    expect(result.errors).toEqual([])
  })

  it('counts bytes, not characters', () => {
    const text = POD + '#' + 'ж'.repeat(MAX_INPUT_BYTES / 2)
    expect(text.length).toBeLessThan(MAX_INPUT_BYTES)
    expect(checkInputSize(text)?.bytes).toBeGreaterThan(MAX_INPUT_BYTES)
  })

  it('leaves oversized input untouched in autoFix', () => {
    const text = padded(MAX_INPUT_BYTES + 1)
    const result = autoFix(text)
    expect(result.output).toBe(text)
    expect(result.fixes).toEqual([])
  })
})
