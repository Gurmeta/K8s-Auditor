import { RangeSetBuilder } from '@codemirror/state'
import { Decoration, ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from '@codemirror/view'

// Wrapped continuation lines sit this many columns deeper than the line they belong to.
const CONTINUATION_COLUMNS = 2

function build(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  let lastLine = 0
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to; ) {
      const line = view.state.doc.lineAt(pos)
      pos = line.to + 1
      if (line.number <= lastLine) continue
      lastLine = line.number
      const indent = line.text.length - line.text.trimStart().length
      if (indent === 0) continue
      const hang = indent + CONTINUATION_COLUMNS
      builder.add(
        line.from,
        line.from,
        Decoration.line({ attributes: { style: `padding-left: calc(6px + ${hang}ch); text-indent: -${hang}ch` } }),
      )
    }
  }
  return builder.finish()
}

/** Makes a wrapped YAML line continue under its own indentation instead of at the left edge. */
export const hangingIndent = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = build(view)
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) this.decorations = build(update.view)
    }
  },
  { decorations: (plugin) => plugin.decorations },
)
