import { yaml } from '@codemirror/lang-yaml'
import { unifiedMergeView } from '@codemirror/merge'
import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers } from '@codemirror/view'
import { useEffect, useRef } from 'react'
import { cmTheme } from './cmTheme'
import { hangingIndent } from './hangingIndent'

const readOnly = [
  yaml(),
  cmTheme,
  lineNumbers(),
  EditorView.lineWrapping,
  hangingIndent,
  EditorView.editable.of(false),
  EditorState.readOnly.of(true),
]

// One column on every screen: two side by side panes get ~35 characters each next to the results list,
// which wraps most YAML lines and the review comments the fixer adds.
export function DiffView({ original, modified, label }: { original: string; modified: string; label: string }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const view = new EditorView({
      parent: host.current!,
      doc: modified,
      extensions: [
        ...readOnly,
        unifiedMergeView({
          original,
          mergeControls: false,
          highlightChanges: true,
          gutter: true,
          collapseUnchanged: { margin: 2, minSize: 4 },
        }),
      ],
    })
    return () => view.destroy()
  }, [original, modified])

  return <div ref={host} className="h-full overflow-auto" role="region" aria-label={label} />
}
