import { StateEffect, StateField, type Text } from '@codemirror/state'
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view'
import type { DiffOp } from '../core/diff'
import type { Severity } from '../core/types'
import { SEVERITY_GLYPH } from './severity'

export interface AnnotationItem {
  key: string
  line: number
  severity: Severity
  severityLabel: string
  ruleId: string
  title: string
  how: string
  maps: string
  expanded: boolean
  fix: { tag: 'safe' | 'review'; tagLabel: string; suggestion: DiffOp[] | null } | null
  labels: { apply: string; how: string; maps: string; manual: string; suggestion: string }
}

export interface AnnotationHandlers {
  toggle: (key: string) => void
  apply: (key: string) => void
}

interface Payload {
  items: AnnotationItem[]
  handlers: AnnotationHandlers
}

function node<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  el.className = className
  if (text !== undefined) el.textContent = text
  return el
}

class AnnotationWidget extends WidgetType {
  private readonly item: AnnotationItem
  private readonly handlers: AnnotationHandlers

  constructor(item: AnnotationItem, handlers: AnnotationHandlers) {
    super()
    this.item = item
    this.handlers = handlers
  }

  // Handlers are one stable object that always calls the latest callbacks, so only the item decides equality.
  eq(other: AnnotationWidget) {
    return JSON.stringify(this.item) === JSON.stringify(other.item)
  }

  get estimatedHeight() {
    return this.item.expanded ? 150 : 40
  }

  toDOM() {
    const { item, handlers } = this
    // CodeMirror measures a block widget without its margins, so spacing lives in the padding of this wrapper.
    const root = node('div', `cm-ann cm-ann-${item.severity}`)
    const card = node('div', 'cm-ann-card')
    root.append(card)
    const head = node('div', 'cm-ann-head')

    const toggle = node('button', 'cm-ann-toggle')
    toggle.type = 'button'
    toggle.setAttribute('aria-expanded', String(item.expanded))
    toggle.addEventListener('click', () => handlers.toggle(item.key))
    const chevron = node('span', `cm-ann-chev${item.expanded ? ' open' : ''}`, '›')
    chevron.setAttribute('aria-hidden', 'true')
    const glyph = node('span', 'cm-ann-glyph', SEVERITY_GLYPH[item.severity])
    glyph.setAttribute('aria-hidden', 'true')
    toggle.append(chevron, glyph, node('span', 'cm-ann-sev', item.severityLabel), node('span', 'cm-ann-title', item.title))
    head.append(toggle, node('span', 'cm-ann-rule', item.ruleId))

    if (item.fix) {
      const apply = node('button', 'cm-ann-apply', item.labels.apply)
      apply.type = 'button'
      apply.addEventListener('click', () => handlers.apply(item.key))
      head.append(apply)
    }
    card.append(head)

    if (item.expanded) {
      const body = node('div', 'cm-ann-body')
      const how = node('p', 'cm-ann-p')
      how.append(node('span', 'cm-ann-dim', item.labels.how), document.createTextNode(item.how))
      body.append(how)
      if (item.maps) body.append(node('p', 'cm-ann-p cm-ann-dim', `${item.labels.maps} ${item.maps}`))

      if (item.fix?.suggestion?.length) {
        const diff = node('div', 'cm-ann-diff')
        diff.setAttribute('role', 'group')
        diff.setAttribute('aria-label', item.labels.suggestion)
        for (const op of item.fix.suggestion) {
          const prefix = op.type === 'add' ? '+ ' : op.type === 'del' ? '- ' : '  '
          diff.append(node('div', `cm-ann-${op.type}`, prefix + op.text))
        }
        body.append(diff)
      }
      body.append(
        item.fix
          ? node('p', `cm-ann-tag cm-ann-tag-${item.fix.tag}`, item.fix.tagLabel)
          : node('p', 'cm-ann-p cm-ann-dim', item.labels.manual),
      )
      card.append(body)
    }
    return root
  }

  // The widget handles its own clicks; the editor must not react to them.
  ignoreEvent() {
    return true
  }
}

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }

function build(doc: Text, { items, handlers }: Payload): DecorationSet {
  const ranges = items
    .filter((item) => item.line >= 1 && item.line <= doc.lines)
    .sort((a, b) => a.line - b.line || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .map((item) =>
      Decoration.widget({ widget: new AnnotationWidget(item, handlers), block: true, side: 1 }).range(doc.line(item.line).to),
    )
  return Decoration.set(ranges, true)
}

export const setAnnotations = StateEffect.define<Payload>()

// Block widgets can only come from a state field, not from a plugin or a function.
export const annotationField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, tr) {
    for (const effect of tr.effects) if (effect.is(setAnnotations)) return build(tr.state.doc, effect.value)
    return tr.docChanged ? decorations.map(tr.changes) : decorations
  },
  provide: (field) => EditorView.decorations.from(field),
})
