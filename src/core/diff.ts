export interface DiffOp {
  type: 'same' | 'add' | 'del'
  text: string
  /** 1-based line in the new text, for `same` and `add`. */
  line?: number
}

// Past this many table cells the exact diff is skipped and shown as one removal plus one addition.
const MAX_CELLS = 250_000

/**
 * Line diff between two texts. The common start and end are trimmed first, so a fix that touches a few
 * lines costs almost nothing even in a long file. Only the differing middle is returned.
 */
export function diffLines(before: string, after: string): DiffOp[] {
  const a = before.split('\n')
  const b = after.split('\n')

  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }

  const midA = a.slice(start, endA)
  const midB = b.slice(start, endB)
  const n = midA.length
  const m = midB.length
  const ops: DiffOp[] = []

  if (n * m > MAX_CELLS) {
    midA.forEach((text) => ops.push({ type: 'del', text }))
    midB.forEach((text, j) => ops.push({ type: 'add', text, line: start + j + 1 }))
    return ops
  }

  const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = midA[i] === midB[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (midA[i] === midB[j]) {
      ops.push({ type: 'same', text: midA[i], line: start + j + 1 })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ type: 'del', text: midA[i++] })
    } else {
      ops.push({ type: 'add', text: midB[j], line: start + j + 1 })
      j++
    }
  }
  while (i < n) ops.push({ type: 'del', text: midA[i++] })
  while (j < m) {
    ops.push({ type: 'add', text: midB[j], line: start + j + 1 })
    j++
  }
  return ops
}
