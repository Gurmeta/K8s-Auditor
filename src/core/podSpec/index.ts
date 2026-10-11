import { isMap, isSeq, type Document } from 'yaml'
import type { ContainerCtx } from '../types'

type Path = (string | number)[]

const POD_SPEC_PATHS: Record<string, Path> = {
  Pod: ['spec'],
  Deployment: ['spec', 'template', 'spec'],
  StatefulSet: ['spec', 'template', 'spec'],
  DaemonSet: ['spec', 'template', 'spec'],
  ReplicaSet: ['spec', 'template', 'spec'],
  Job: ['spec', 'template', 'spec'],
  CronJob: ['spec', 'jobTemplate', 'spec', 'template', 'spec'],
}

export const SUPPORTED_WORKLOAD_KINDS = Object.keys(POD_SPEC_PATHS)

export function getPodSpecPath(kind: string): Path | undefined {
  return POD_SPEC_PATHS[kind]
}

const CONTAINER_LISTS = [
  ['containers', 'container'],
  ['initContainers', 'initContainer'],
  ['ephemeralContainers', 'ephemeralContainer'],
] as const

export function listContainers(doc: Document, podSpecPath: Path): ContainerCtx[] {
  const result: ContainerCtx[] = []
  for (const [field, kind] of CONTAINER_LISTS) {
    const seq = doc.getIn([...podSpecPath, field], true)
    if (!isSeq(seq)) continue
    seq.items.forEach((item, index) => {
      if (!isMap(item)) return
      const name = item.get('name')
      result.push({
        name: typeof name === 'string' ? name : `${field}[${index}]`,
        kind,
        path: [...podSpecPath, field, index],
      })
    })
  }
  return result
}
