import { yaml } from '@codemirror/lang-yaml'
import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { useEffect, useState, type RefObject } from 'react'
import type { ParseError } from '../core/parser'
import type { Finding } from '../core/types'
import { annotationField, setAnnotations, type AnnotationHandlers, type AnnotationItem } from './annotations'
import { cmTheme } from './cmTheme'
import { lineMarkField, setLineMarks } from './lineMarks'

const extensions = [yaml(), cmTheme, EditorView.lineWrapping, annotationField, lineMarkField]

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
  // The wrapper creates its view after the first render, so the view is state: these run again once it exists
  // (and again for a new view when coming back from the diff).
  const [view, setView] = useState<EditorView | null>(null)
  useEffect(() => {
    view?.dispatch({ effects: setLineMarks.of({ findings, errors, focusLine, fresh }) })
  }, [view, findings, errors, focusLine, fresh])
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
