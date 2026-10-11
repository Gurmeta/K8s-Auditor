import { jsonAt, makeResourceFinding } from './helpers'
import type { Rule } from '../types'

export const singleReplica: Rule = {
  id: 'KSA-021',
  title: 'Only one replica configured',
  severity: 'info',
  appliesTo: ['Deployment', 'StatefulSet'],
  standards: [],
  check(resource) {
    // An omitted `replicas` may be managed by an HPA, so only an explicit 1 is flagged.
    if (jsonAt(resource, ['spec', 'replicas']) !== 1) return []
    return [
      makeResourceFinding(
        this,
        resource,
        ['spec', 'replicas'],
        `${resource.kind} "${resource.name}" runs a single replica: any restart or node failure causes downtime.`,
        'Run at least 2 replicas (with a PodDisruptionBudget) for anything that must stay available.',
      ),
    ]
  },
}
