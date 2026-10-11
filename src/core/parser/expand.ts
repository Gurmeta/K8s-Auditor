import { isAlias, isCollection, isMap, isScalar, isSeq, type Document, type Pair, type YAMLMap } from 'yaml'

export const MAX_EXPANDED_NODES = 50_000
const MAX_DEPTH = 100

export class ExpansionError extends Error {}

const isMergeKey = (key: unknown): boolean =>
  isScalar(key) && typeof key.value === 'symbol' && key.value.description === '<<'

/**
 * Replaces aliases (`*a`) and merge keys (`<<`) with copies of what they point to, in place.
 * Run it on a throwaway parse used for analysis only: the copies keep the source position of
 * the anchor, and the document no longer serializes back to the original text.
 * Throws ExpansionError when the result would be too large (nested aliases grow exponentially).
 */
export function expandAliases(doc: Document): void {
  let budget = MAX_EXPANDED_NODES
  let anonymous = 0

  const spend = () => {
    if (--budget < 0) throw new ExpansionError(`YAML aliases expand to more than ${MAX_EXPANDED_NODES} nodes`)
  }

  const keyId = (key: unknown) => (isScalar(key) ? `s:${String(key.value)}` : `n:${anonymous++}`)

  const expand = (node: unknown, depth: number): unknown => {
    if (depth > MAX_DEPTH) throw new ExpansionError('YAML aliases are nested too deeply')
    spend()
    if (isAlias(node)) {
      const target = node.resolve(doc)
      if (!target) return node
      const copy = target.clone()
      if (isScalar(copy) || isCollection(copy)) copy.anchor = undefined
      return expand(copy, depth + 1)
    }
    if (isMap(node)) expandMap(node, depth)
    else if (isSeq(node)) node.items = node.items.map((item) => expand(item, depth + 1))
    return node
  }

  const mergeSources = (value: unknown): YAMLMap[] => {
    if (isMap(value)) return [value]
    if (isSeq(value)) return value.items.filter(isMap)
    return []
  }

  const expandMap = (map: YAMLMap, depth: number) => {
    const seen = new Set(map.items.filter((pair) => !isMergeKey(pair.key)).map((pair) => keyId(pair.key)))
    const items: Pair[] = []
    for (const pair of map.items) {
      if (!isMergeKey(pair.key)) {
        pair.key = expand(pair.key, depth + 1)
        pair.value = expand(pair.value, depth + 1)
        items.push(pair)
        continue
      }
      // The map's own keys win over merged ones, and earlier sources win over later ones.
      for (const source of mergeSources(expand(pair.value, depth + 1))) {
        for (const merged of source.items) {
          const id = keyId(merged.key)
          if (seen.has(id)) continue
          seen.add(id)
          spend()
          items.push(merged)
        }
      }
    }
    map.items = items
  }

  doc.contents = expand(doc.contents, 0) as typeof doc.contents
}
