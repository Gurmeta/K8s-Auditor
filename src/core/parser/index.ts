import { isMap, LineCounter, parseAllDocuments, type Document } from 'yaml'
import { getPodSpecPath, listContainers } from '../podSpec'
import type { ResourceCtx } from '../types'
import { ExpansionError, expandAliases } from './expand'

export interface ParseError {
  message: string
  line: number
  col: number
}

export interface ParseResult {
  /** Every YAML document in source order, including ones that are not resources (needed to re-serialize). */
  documents: Document[]
  resources: ResourceCtx[]
  errors: ParseError[]
}

export interface ParseOptions {
  /**
   * Resolve aliases and merge keys so rules see the values they point to. The returned documents
   * are then only good for reading: use the default for anything that gets serialized back.
   */
  expand?: boolean
}

/** Parses a (possibly multi-document) YAML string into resource contexts. Never throws. */
export function parseManifests(text: string, { expand = false }: ParseOptions = {}): ParseResult {
  const lineCounter = new LineCounter()
  const resources: ResourceCtx[] = []
  const errors: ParseError[] = []
  const documents = parseAllDocuments(text, { lineCounter, merge: expand }) as Document[]

  for (const doc of documents) {
    for (const err of doc.errors) {
      const pos = err.linePos?.[0]
      errors.push({ message: err.message, line: pos?.line ?? 1, col: pos?.col ?? 1 })
    }
    // Skip broken, empty and non-mapping documents (e.g. a lone comment between `---`).
    if (doc.errors.length > 0 || !isMap(doc.contents)) continue

    if (expand) {
      try {
        expandAliases(doc)
      } catch (error) {
        if (!(error instanceof ExpansionError)) throw error
        const pos = lineCounter.linePos(doc.range?.[0] ?? 0)
        errors.push({ message: error.message, line: pos.line, col: pos.col })
        continue
      }
    }

    const kind = doc.getIn(['kind'])
    if (typeof kind !== 'string') continue
    const name = doc.getIn(['metadata', 'name'])
    const namespace = doc.getIn(['metadata', 'namespace'])
    const podSpecPath = getPodSpecPath(kind)

    resources.push({
      doc,
      lineCounter,
      kind,
      name: typeof name === 'string' ? name : '(unnamed)',
      namespace: typeof namespace === 'string' ? namespace : undefined,
      podSpecPath,
      containers: podSpecPath ? listContainers(doc, podSpecPath) : [],
    })
  }

  return { documents, resources, errors }
}
