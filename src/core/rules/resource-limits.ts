import { containersOfKinds, hasValue, makeFinding, WORKLOAD_KINDS } from './helpers'
import type { Rule } from '../types'

export const resourceLimits: Rule = {
  id: 'KSA-002',
  title: 'CPU/memory limits not set',
  severity: 'warning',
  appliesTo: WORKLOAD_KINDS,
  standards: [{ name: 'NSA-CISA', ref: 'Kubernetes Hardening Guide – Resource policies' }],
  check(resource) {
    const findings = []
    for (const c of containersOfKinds(resource, ['container', 'initContainer'])) {
      const missing = ['cpu', 'memory'].filter((r) => !hasValue(resource, [...c.path, 'resources', 'limits', r]))
      if (missing.length === 0) continue
      findings.push(
        makeFinding(
          this,
          resource,
          c,
          ['resources', 'limits'],
          `Container "${c.name}" has no ${missing.join(' and ')} limit.`,
          'Set resources.limits to stop a single container from starving the node (noisy neighbour / DoS).',
          { missing: missing.join(',') },
        ),
      )
    }
    return findings
  },
}
