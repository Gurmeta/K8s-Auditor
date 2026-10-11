import { jsonAt, makeFinding, WORKLOAD_KINDS } from './helpers'
import type { Rule } from '../types'

export const hostPath: Rule = {
  id: 'KSA-016',
  title: 'hostPath volume mounted',
  severity: 'warning',
  appliesTo: WORKLOAD_KINDS,
  standards: [{ name: 'PSS', ref: 'Baseline – HostPath Volumes' }],
  check(resource) {
    if (!resource.podSpecPath) return []
    const volumes = jsonAt(resource, [...resource.podSpecPath, 'volumes'])
    if (!Array.isArray(volumes)) return []
    return volumes.flatMap((v, i) =>
      v && typeof v === 'object' && 'hostPath' in v
        ? [
            makeFinding(
              this,
              resource,
              undefined,
              ['volumes', i, 'hostPath'],
              `Volume "${(v as { name?: string }).name ?? i}" mounts a path from the node filesystem.`,
              'Use a PersistentVolumeClaim, emptyDir, configMap or secret volume instead of hostPath.',
              { volume: String((v as { name?: string }).name ?? i) },
            ),
          ]
        : [],
    )
  },
}
