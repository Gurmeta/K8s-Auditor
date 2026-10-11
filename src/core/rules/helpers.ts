import { isNode } from 'yaml'
import { lineOfPath } from '../lines'
import type { ContainerCtx, Finding, ResourceCtx, Rule } from '../types'

type Path = (string | number)[]

export const WORKLOAD_KINDS = ['Pod', 'Deployment', 'StatefulSet', 'DaemonSet', 'ReplicaSet', 'Job', 'CronJob']
/** Long-running workloads, where probes make sense (Jobs/CronJobs run to completion). */
export const LONG_RUNNING_KINDS = ['Pod', 'Deployment', 'StatefulSet', 'DaemonSet', 'ReplicaSet']

export interface ImageRef {
  tag?: string
  digest?: string
  /** No digest and tag is missing or `latest`: the image can change under you. */
  mutable: boolean
}

/** Splits `registry:5000/repo/name:tag@sha256:...` without mistaking a registry port for a tag. */
export function parseImage(image: string): ImageRef {
  const [ref, digest] = image.split('@')
  const lastSegment = ref.slice(ref.lastIndexOf('/') + 1)
  const colon = lastSegment.indexOf(':')
  const tag = colon === -1 ? undefined : lastSegment.slice(colon + 1)
  return { tag, digest, mutable: !digest && (tag === undefined || tag === 'latest') }
}

export function imageOf(resource: ResourceCtx, container: ContainerCtx): string | undefined {
  const image = resource.doc.getIn([...container.path, 'image'])
  return typeof image === 'string' ? image : undefined
}

export function jsonAt(resource: ResourceCtx, path: Path): unknown {
  const node = resource.doc.getIn(path, true)
  return isNode(node) ? node.toJSON() : node
}

export function containerSC(resource: ResourceCtx, container: ContainerCtx, key: string): unknown {
  return resource.doc.getIn([...container.path, 'securityContext', key])
}

/**
 * Effective value of a securityContext field that exists at both levels (runAsNonRoot, runAsUser,
 * seccompProfile): the container value wins over the pod value, as in Kubernetes.
 */
export function effectiveSC(resource: ResourceCtx, container: ContainerCtx, key: string): unknown {
  const own = containerSC(resource, container, key)
  if (own !== undefined && own !== null) return own
  return resource.podSpecPath ? resource.doc.getIn([...resource.podSpecPath, 'securityContext', key]) : undefined
}

/** True when a value exists at `path` and is not null/empty-null (`key:` with no value). */
export function hasValue(resource: ResourceCtx, path: Path): boolean {
  const v = resource.doc.getIn(path)
  return v !== undefined && v !== null
}

export function containersOfKinds(resource: ResourceCtx, kinds: ContainerCtx['kind'][]): ContainerCtx[] {
  return resource.containers.filter((c) => kinds.includes(c.kind))
}

/** Builds a Finding at an absolute `path` in the resource (e.g. ['metadata','namespace']). */
export function makeResourceFinding(
  rule: Pick<Rule, 'id' | 'severity'>,
  resource: ResourceCtx,
  path: Path,
  message: string,
  recommendation: string,
  params?: Record<string, string>,
): Finding {
  return {
    ruleId: rule.id,
    severity: rule.severity,
    resource: { kind: resource.kind, name: resource.name },
    path,
    line: lineOfPath(resource.doc, resource.lineCounter, path),
    message,
    recommendation,
    params,
  }
}

export function makeFinding(
  rule: Pick<Rule, 'id' | 'severity'>,
  resource: ResourceCtx,
  container: ContainerCtx | undefined,
  relPath: Path,
  message: string,
  recommendation: string,
  params?: Record<string, string>,
): Finding {
  const path = [...(container?.path ?? resource.podSpecPath ?? []), ...relPath]
  return {
    ruleId: rule.id,
    severity: rule.severity,
    resource: { kind: resource.kind, name: resource.name },
    container: container?.name,
    containerPath: container?.path,
    path,
    line: lineOfPath(resource.doc, resource.lineCounter, path),
    message,
    recommendation,
    params,
  }
}
