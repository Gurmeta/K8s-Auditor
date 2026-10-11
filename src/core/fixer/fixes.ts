import { isCollection, isScalar, type Document } from 'yaml'
import { jsonAt } from '../rules/helpers'
import type { Finding, FixOutcome, ResourceCtx } from '../types'

type Path = (string | number)[]

/** A fix mutates `resource.doc` and describes what it did; null means "cannot be fixed automatically". */
export type FixFn = (resource: ResourceCtx, finding: Finding) => FixOutcome | null

const REVIEW_TAG = 'TODO(k8s-auditor): review'

function ensureParents(doc: Document, path: Path): void {
  for (let i = 1; i < path.length; i++) {
    const prefix = path.slice(0, i)
    const node = doc.getIn(prefix, true)
    if (node === undefined || (isScalar(node) && node.value === null)) doc.setIn(prefix, doc.createNode({}))
  }
}

function setValue(doc: Document, path: Path, value: unknown, note?: string): void {
  ensureParents(doc, path)
  const node = doc.createNode(value)
  if (note) {
    const text = ` ${REVIEW_TAG} – ${note}`
    if (isCollection(node)) node.commentBefore = text
    else node.comment = text
  }
  doc.setIn(path, node)
}

const cpath = (finding: Finding): Path => finding.containerPath ?? []

const RESOURCES = ['cpu', 'memory'] as const
/** Placeholders only; real values depend on the workload and must be reviewed. */
const REQUEST_DEFAULT = { cpu: '100m', memory: '128Mi' }
const LIMIT_DEFAULT = { cpu: '500m', memory: '256Mi' }

const fixRequests: FixFn = (resource, finding) => {
  const base = cpath(finding)
  let noted = false
  for (const r of RESOURCES) {
    if (jsonAt(resource, [...base, 'resources', 'requests', r]) != null) continue
    // A request above an existing limit is invalid, so reuse the limit when there is one.
    const limit = jsonAt(resource, [...base, 'resources', 'limits', r])
    setValue(resource.doc, [...base, 'resources', 'requests', r], limit ?? REQUEST_DEFAULT[r], noted ? undefined : 'placeholder values, size from real usage')
    noted = true
  }
  return { safety: 'review', description: 'Added placeholder resource requests' }
}

const fixLimits: FixFn = (resource, finding) => {
  const base = cpath(finding)
  let noted = false
  for (const r of RESOURCES) {
    if (jsonAt(resource, [...base, 'resources', 'limits', r]) != null) continue
    // Never set a limit below the request; a request still equal to our placeholder is not a real one.
    const request = jsonAt(resource, [...base, 'resources', 'requests', r])
    const limit = request != null && request !== REQUEST_DEFAULT[r] ? request : LIMIT_DEFAULT[r]
    setValue(resource.doc, [...base, 'resources', 'limits', r], limit, noted ? undefined : 'placeholder values, size from real usage')
    noted = true
  }
  return { safety: 'review', description: 'Added placeholder resource limits' }
}

function firstContainerPort(resource: ResourceCtx, finding: Finding): number | undefined {
  const ports = jsonAt(resource, [...cpath(finding), 'ports'])
  if (!Array.isArray(ports)) return undefined
  const port = (ports[0] as { containerPort?: unknown } | undefined)?.containerPort
  return typeof port === 'number' ? port : undefined
}

const probeFix =
  (field: 'readinessProbe' | 'livenessProbe', initialDelaySeconds: number, periodSeconds: number): FixFn =>
  (resource, finding) => {
    const port = firstContainerPort(resource, finding)
    if (port === undefined) return null // no containerPort to probe: needs a human
    setValue(
      resource.doc,
      [...cpath(finding), field],
      { tcpSocket: { port }, initialDelaySeconds, periodSeconds },
      'generic TCP probe, switch to an HTTP health endpoint if the app has one',
    )
    return { safety: 'review', description: `Added a TCP ${field} on port ${port}`, params: { port: String(port) } }
  }

const sc = (finding: Finding, key: string): Path => [...cpath(finding), 'securityContext', key]

const fixPrivileged: FixFn = (resource, finding) => {
  setValue(resource.doc, sc(finding, 'privileged'), false, 'privileged was removed, verify the workload still works')
  return { safety: 'review', description: 'Set privileged: false' }
}

const fixRunAsNonRoot: FixFn = (resource, finding) => {
  const user = jsonAt(resource, [...cpath(finding), 'securityContext', 'runAsUser']) ?? jsonAt(resource, [...(resource.podSpecPath ?? []), 'securityContext', 'runAsUser'])
  setValue(resource.doc, sc(finding, 'runAsNonRoot'), true, 'the image must support running as a non-root user')
  if (user === undefined || user === 0) setValue(resource.doc, sc(finding, 'runAsUser'), 10001)
  return { safety: 'review', description: 'Set runAsNonRoot: true (and a non-root runAsUser)' }
}

const fixPrivilegeEscalation: FixFn = (resource, finding) => {
  setValue(resource.doc, sc(finding, 'allowPrivilegeEscalation'), false)
  return { safety: 'safe', description: 'Set allowPrivilegeEscalation: false' }
}

const fixDropCapabilities: FixFn = (resource, finding) => {
  setValue(resource.doc, [...sc(finding, 'capabilities'), 'drop'], ['ALL'], 'add back only the capabilities the app needs')
  return { safety: 'review', description: 'Set capabilities.drop: [ALL]' }
}

const fixReadOnlyRootFs: FixFn = (resource, finding) => {
  setValue(resource.doc, sc(finding, 'readOnlyRootFilesystem'), true, 'mount emptyDir volumes for paths the app writes to')
  return { safety: 'review', description: 'Set readOnlyRootFilesystem: true' }
}

const fixSeccomp: FixFn = (resource, finding) => {
  const unconfined = jsonAt(resource, [...sc(finding, 'seccompProfile'), 'type']) === 'Unconfined'
  setValue(resource.doc, sc(finding, 'seccompProfile'), { type: 'RuntimeDefault' })
  return { safety: unconfined ? 'review' : 'safe', description: 'Set seccompProfile: RuntimeDefault' }
}

const fixHostNamespace: FixFn = (resource, finding) => {
  setValue(resource.doc, finding.path, false, 'verify the workload does not need host access')
  const field = String(finding.path.at(-1))
  return { safety: 'review', description: `Set ${field}: false`, params: { field } }
}

const fixAutomount: FixFn = (resource) => {
  setValue(
    resource.doc,
    [...(resource.podSpecPath ?? []), 'automountServiceAccountToken'],
    false,
    'set back to true only if the app calls the Kubernetes API',
  )
  return { safety: 'review', description: 'Set automountServiceAccountToken: false' }
}

/**
 * Auto-fixes by rule id. Rules missing here are manual-only on purpose: :latest tags, digests,
 * hostPath, ServiceAccounts, namespaces, secrets, replicas and Services all need a human decision.
 */
export const FIXES: Record<string, FixFn> = {
  'KSA-001': fixRequests,
  'KSA-002': fixLimits,
  'KSA-003': probeFix('readinessProbe', 5, 10),
  'KSA-004': probeFix('livenessProbe', 15, 20),
  'KSA-008': fixPrivileged,
  'KSA-009': fixRunAsNonRoot,
  'KSA-010': fixPrivilegeEscalation,
  'KSA-011': fixDropCapabilities,
  'KSA-012': fixReadOnlyRootFs,
  'KSA-013': fixSeccomp,
  'KSA-015': fixHostNamespace,
  'KSA-019': fixAutomount,
}
