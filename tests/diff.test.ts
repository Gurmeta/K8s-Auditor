import { describe, expect, it } from 'vitest'
import { lint, findingKey } from '../src/core/engine'
import { diffLines } from '../src/core/diff'
import { autoFix } from '../src/core/fixer'

describe('diffLines', () => {
  it('returns nothing for identical text', () => {
    expect(diffLines('a\nb\n', 'a\nb\n')).toEqual([])
  })

  it('reports inserted lines with their line numbers in the new text', () => {
    const ops = diffLines('a\nc\n', 'a\nb\nc\n')
    expect(ops).toEqual([{ type: 'add', text: 'b', line: 2 }])
  })

  it('reports a replaced line as a removal followed by an addition', () => {
    const ops = diffLines('a\nold\nc\n', 'a\nnew\nc\n')
    expect(ops).toEqual([
      { type: 'del', text: 'old' },
      { type: 'add', text: 'new', line: 2 },
    ])
  })

  it('keeps unchanged lines between two edits as context', () => {
    const ops = diffLines('x\nkeep\ny\n', 'X\nkeep\nY\n')
    expect(ops.map((o) => o.type)).toEqual(['del', 'add', 'same', 'del', 'add'])
  })

  it('falls back to one removal and one addition for very large rewrites', () => {
    const a = Array.from({ length: 700 }, (_, i) => `a${i}`).join('\n')
    const b = Array.from({ length: 700 }, (_, i) => `b${i}`).join('\n')
    const ops = diffLines(a, b)
    expect(ops.filter((o) => o.type === 'del')).toHaveLength(700)
    expect(ops.filter((o) => o.type === 'add')).toHaveLength(700)
  })
})

const pod = `kind: Pod
metadata:
  name: p
spec:
  containers:
    - name: a
      image: x:1
    - name: b
      image: y:1
`

describe('fixing a single finding', () => {
  it('gives every finding a unique key', () => {
    const keys = lint(pod).findings.map(findingKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('fixes only the chosen finding and leaves the same rule elsewhere alone', () => {
    const { findings } = lint(pod)
    const chosen = findings.find((f) => f.ruleId === 'KSA-010' && f.container === 'a')!
    const { output, fixes } = autoFix(pod, { only: (f) => findingKey(f) === findingKey(chosen) })

    expect(fixes).toHaveLength(1)
    const after = lint(output).findings.filter((f) => f.ruleId === 'KSA-010')
    expect(after.map((f) => f.container)).toEqual(['b'])
  })

  it('changes nothing when no finding matches', () => {
    expect(autoFix(pod, { only: () => false })).toMatchObject({ output: pod, fixes: [] })
  })
})
