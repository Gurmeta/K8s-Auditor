import { jsonAt, makeResourceFinding, WORKLOAD_KINDS } from './helpers'
import type { Rule } from '../types'

export const defaultNamespace: Rule = {
  id: 'KSA-017',
  title: 'Resource explicitly uses the default namespace',
  severity: 'info',
  appliesTo: [...WORKLOAD_KINDS, 'Service'],
  standards: [{ name: 'CIS', ref: 'The default namespace should not be actively used' }],
  check(resource) {
    // Only an explicit `namespace: default` is flagged; an omitted namespace is usually set at apply time (-n).
    if (jsonAt(resource, ['metadata', 'namespace']) !== 'default') return []
    return [
      makeResourceFinding(
        this,
        resource,
        ['metadata', 'namespace'],
        `${resource.kind} "${resource.name}" is deployed to the default namespace.`,
        'Use a dedicated namespace per app/team so RBAC, quotas and network policies can be scoped.',
      ),
    ]
  },
}
