import { isMap, LineCounter, parseAllDocuments, type Document } from 'yaml'
import { getPodSpecPath, listContainers } from '../podSpec'
import type { ResourceCtx } from '../types'

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

/** Parses a (possibly multi-document) YAML string into resource contexts. Never throws. */
export function parseManifests(text: string): ParseResult {
  const lineCounter = new LineCounter()
  const resources: ResourceCtx[] = []
  const errors: ParseError[] = []
  const documents = parseAllDocuments(text, { lineCounter }) as Document[]

  for (const doc of documents) {
    for (const err of doc.errors) {
      const pos = err.linePos?.[0]
      errors.push({ message: err.message, line: pos?.line ?? 1, col: pos?.col ?? 1 })
    }
    // Skip broken, empty and non-mapping documents (e.g. a lone comment between `---`).
    if (doc.errors.length > 0 || !isMap(doc.contents)) continue

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
