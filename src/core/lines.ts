import { isNode, type Document, type LineCounter } from 'yaml'

/**
 * 1-based source line of a node at `path`. If the path does not exist (e.g. a missing
 * securityContext), falls back to the closest existing parent so findings still point somewhere.
 */
export function lineOfPath(
  doc: Document,
  lineCounter: LineCounter,
  path: (string | number)[],
): number | undefined {
  for (let end = path.length; end >= 0; end--) {
    const node = end === 0 ? doc.contents : doc.getIn(path.slice(0, end), true)
    if (isNode(node) && node.range) return lineCounter.linePos(node.range[0]).line
  }
  return undefined
}
