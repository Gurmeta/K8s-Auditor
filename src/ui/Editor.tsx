import { yaml } from '@codemirror/lang-yaml'
import { RangeSetBuilder } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { useEffect, useMemo, useState, type RefObject } from 'react'
import type { ParseError } from '../core/parser'
import type { Finding, Severity } from '../core/types'
import { annotationField, setAnnotations, type AnnotationHandlers, type AnnotationItem } from './annotations'
import { cmTheme } from './cmTheme'

const RANK: Record<Severity | 'error', number> = { error: 4, critical: 3, warning: 2, info: 1 }

function lineMarks(findings: Finding[], errors: ParseError[], focusLine: number | null, fresh: ReadonlySet<number>) {
  const worst = new Map<number, Severity | 'error'>()
  const add = (line: number | undefined, sev: Severity | 'error') => {
    if (!line) return
    const current = worst.get(line)
    if (!current || RANK[sev] > RANK[current]) worst.set(line, sev)
  }
  findings.forEach((f) => add(f.line, f.severity))
  errors.forEach((e) => add(e.line, 'error'))

  return EditorView.decorations.of((view) => {
    const builder = new RangeSetBuilder<Decoration>()
    const lines = new Set([...worst.keys(), ...fresh])
    for (const line of [...lines].sort((a, b) => a - b)) {
      if (line < 1 || line > view.state.doc.lines) continue // text can be ahead of the deferred lint result
      const classes = []
      if (worst.has(line)) classes.push('cm-sev', `cm-sev-${worst.get(line)}`)
      if (line === focusLine) classes.push('cm-sev-focus')
      if (fresh.has(line)) classes.push('cm-fresh')
      const from = view.state.doc.line(line).from
      builder.add(from, from, Decoration.line({ class: classes.join(' ') }))
    }
    return builder.finish()
  })
}

interface Props {
  value: string
  onChange: (value: string) => void
  findings: Finding[]
  errors: ParseError[]
  focusLine: number | null
  /** Lines that were just changed by a fix; they flash briefly. */
  fresh: ReadonlySet<number>
  annotations: AnnotationItem[]
  handlers: AnnotationHandlers
  viewRef: RefObject<EditorView | null>
  label: string
  placeholder: string
}

export function Editor({
  value,
  onChange,
  findings,
  errors,
  focusLine,
  fresh,
  annotations,
  handlers,
  viewRef,
  label,
  placeholder,
}: Props) {
  const extensions = useMemo(
    () => [yaml(), cmTheme, EditorView.lineWrapping, annotationField, lineMarks(findings, errors, focusLine, fresh)],
    [findings, errors, focusLine, fresh],
  )

  // The wrapper creates its view after the first render, so the view is state: this runs again once it exists
  // (and again for a new view when coming back from the diff).
  const [view, setView] = useState<EditorView | null>(null)
  useEffect(() => {
    view?.dispatch({ effects: setAnnotations.of({ items: annotations, handlers }) })
  }, [view, annotations, handlers])

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme="none"
      height="100%"
      style={{ height: '100%' }}
      aria-label={label}
      placeholder={placeholder}
      basicSetup={{ foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false }}
      onCreateEditor={(created) => {
        viewRef.current = created
        setView(created)
      }}
    />
  )
}
