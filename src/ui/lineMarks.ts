import { StateEffect, StateField, type Text } from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'
import type { ParseError } from '../core/parser'
import type { Finding, Severity } from '../core/types'

const RANK: Record<Severity | 'error', number> = { error: 4, critical: 3, warning: 2, info: 1 }

export interface LineMarkInput {
  findings: Finding[]
  errors: ParseError[]
  focusLine: number | null
  /** Lines that were just changed by a fix; they flash briefly. */
  fresh: ReadonlySet<number>
}

function build(doc: Text, { findings, errors, focusLine, fresh }: LineMarkInput): DecorationSet {
  const worst = new Map<number, Severity | 'error'>()
  const add = (line: number | undefined, severity: Severity | 'error') => {
    if (!line) return
    const current = worst.get(line)
    if (!current || RANK[severity] > RANK[current]) worst.set(line, severity)
  }
  findings.forEach((f) => add(f.line, f.severity))
  errors.forEach((e) => add(e.line, 'error'))

  const lines = [...new Set([...worst.keys(), ...fresh])].sort((a, b) => a - b)
  const ranges = []
  for (const line of lines) {
    if (line < 1 || line > doc.lines) continue // text can be ahead of the deferred lint result
    const classes = []
    if (worst.has(line)) classes.push('cm-sev', `cm-sev-${worst.get(line)}`)
    if (line === focusLine) classes.push('cm-sev-focus')
    if (fresh.has(line)) classes.push('cm-fresh')
    ranges.push(Decoration.line({ class: classes.join(' ') }).range(doc.line(line).from))
  }
  return Decoration.set(ranges)
}

export const setLineMarks = StateEffect.define<LineMarkInput>()

// A state field keeps the extension list constant, so a new lint result does not reconfigure the whole editor.
export const lineMarkField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, tr) {
    for (const effect of tr.effects) if (effect.is(setLineMarks)) return build(tr.state.doc, effect.value)
    return tr.docChanged ? decorations.map(tr.changes) : decorations
  },
  provide: (field) => EditorView.decorations.from(field),
})
