import type { Document, LineCounter } from 'yaml'

export type Severity = 'critical' | 'warning' | 'info'

export type FixSafety = 'safe' | 'review'

export interface StandardRef {
  name: 'PSS' | 'CIS' | 'NSA-CISA'
  ref: string
}

export interface ContainerCtx {
  name: string
  kind: 'container' | 'initContainer' | 'ephemeralContainer'
  path: (string | number)[]
}

export interface ResourceCtx {
  doc: Document
  lineCounter: LineCounter
  kind: string
  name: string
  namespace?: string
  /** Path to the pod spec, e.g. ['spec','template','spec']; undefined for non-workload kinds. */
  podSpecPath?: (string | number)[]
  containers: ContainerCtx[]
}

export interface Finding {
  ruleId: string
  severity: Severity
  resource: { kind: string; name: string }
  container?: string
  /** Path to the container map, when the finding belongs to a container. */
  containerPath?: (string | number)[]
  /** Index into the parsed resources; set by the engine. */
  resourceIndex?: number
  path: (string | number)[]
  line?: number
  message: string
  recommendation: string
  /** Values the message was built from, so the UI can phrase it in another language. */
  params?: Record<string, string>
}

/** What an auto-fix did. `safe` fixes are low-risk; `review` fixes may change behaviour. */
export interface FixOutcome {
  safety: FixSafety
  description: string
  params?: Record<string, string>
}

export interface Rule {
  id: string
  title: string
  severity: Severity
  appliesTo: string[]
  standards: StandardRef[]
  check(resource: ResourceCtx): Finding[]
}
