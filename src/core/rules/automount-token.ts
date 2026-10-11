import { jsonAt, makeFinding, WORKLOAD_KINDS } from './helpers'
import type { Rule } from '../types'

export const automountToken: Rule = {
  id: 'KSA-019',
  title: 'ServiceAccount token auto-mounted',
  severity: 'info',
  appliesTo: WORKLOAD_KINDS,
  standards: [{ name: 'CIS', ref: 'Ensure that Service Account Tokens are only mounted where necessary' }],
  check(resource) {
    if (!resource.podSpecPath) return []
    if (jsonAt(resource, [...resource.podSpecPath, 'automountServiceAccountToken']) === false) return []
    return [
      makeFinding(
        this,
        resource,
        undefined,
        ['automountServiceAccountToken'],
        'The ServiceAccount token is mounted into the pod; a compromised container can use it against the API server.',
        'Set automountServiceAccountToken: false unless the workload needs to call the Kubernetes API.',
      ),
    ]
  },
}
