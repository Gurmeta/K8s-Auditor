import { jsonAt, makeResourceFinding } from './helpers'
import type { Rule } from '../types'

export const exposedService: Rule = {
  id: 'KSA-022',
  title: 'Service exposed outside the cluster',
  severity: 'info',
  appliesTo: ['Service'],
  standards: [],
  check(resource) {
    const type = jsonAt(resource, ['spec', 'type'])
    if (type !== 'NodePort' && type !== 'LoadBalancer') return []
    return [
      makeResourceFinding(
        this,
        resource,
        ['spec', 'type'],
        `Service "${resource.name}" is of type ${type} and is reachable from outside the cluster.`,
        'Prefer ClusterIP behind an Ingress/Gateway with TLS; if exposure is intended, restrict sources (loadBalancerSourceRanges, NetworkPolicy).',
        { type: String(type) },
      ),
    ]
  },
}
