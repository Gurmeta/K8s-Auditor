import { jsonAt, makeFinding, WORKLOAD_KINDS } from './helpers'
import type { Rule } from '../types'

export const defaultServiceAccount: Rule = {
  id: 'KSA-018',
  title: 'Uses the default ServiceAccount',
  severity: 'info',
  appliesTo: WORKLOAD_KINDS,
  standards: [{ name: 'CIS', ref: 'Ensure that default service accounts are not actively used' }],
  check(resource) {
    if (!resource.podSpecPath) return []
    const sa = jsonAt(resource, [...resource.podSpecPath, 'serviceAccountName'])
    if (sa !== undefined && sa !== null && sa !== 'default') return []
    return [
      makeFinding(
        this,
        resource,
        undefined,
        ['serviceAccountName'],
        'Pod runs with the default ServiceAccount, which is shared by everything in the namespace.',
        'Create a dedicated ServiceAccount with least-privilege RBAC and set serviceAccountName.',
      ),
    ]
  },
}
