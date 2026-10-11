import { yaml } from '@codemirror/lang-yaml'
import { MergeView, unifiedMergeView } from '@codemirror/merge'
import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers } from '@codemirror/view'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { cmTheme } from './cmTheme'

const WIDE = '(min-width: 1024px)'

const readOnly = [
  yaml(),
  cmTheme,
  lineNumbers(),
  EditorView.lineWrapping,
  EditorView.editable.of(false),
  EditorState.readOnly.of(true),
]

function useIsWide() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(WIDE)
      query.addEventListener('change', notify)
      return () => query.removeEventListener('change', notify)
    },
    () => window.matchMedia(WIDE).matches,
  )
}

export function DiffView({ original, modified, label }: { original: string; modified: string; label: string }) {
  const host = useRef<HTMLDivElement>(null)
  const wide = useIsWide()

  useEffect(() => {
    const parent = host.current!
    const collapseUnchanged = { margin: 2, minSize: 4 }

    if (wide) {
      const view = new MergeView({
        a: { doc: original, extensions: readOnly },
        b: { doc: modified, extensions: readOnly },
        parent,
        highlightChanges: true,
        gutter: true,
        collapseUnchanged,
      })
      return () => view.destroy()
    }

    const view = new EditorView({
      parent,
      doc: modified,
      extensions: [
        ...readOnly,
        unifiedMergeView({ original, mergeControls: false, highlightChanges: true, gutter: true, collapseUnchanged }),
      ],
    })
    return () => view.destroy()
  }, [original, modified, wide])

  return <div ref={host} className="h-full overflow-auto" role="region" aria-label={label} />
}
