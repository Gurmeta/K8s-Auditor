import { containersOfKinds, hasValue, makeFinding, WORKLOAD_KINDS } from './helpers'
import type { Rule } from '../types'

export const resourceRequests: Rule = {
  id: 'KSA-001',
  title: 'CPU/memory requests not set',
  severity: 'warning',
  appliesTo: WORKLOAD_KINDS,
  standards: [{ name: 'NSA-CISA', ref: 'Kubernetes Hardening Guide – Resource policies' }],
  check(resource) {
    const findings = []
    for (const c of containersOfKinds(resource, ['container', 'initContainer'])) {
      const missing = ['cpu', 'memory'].filter((r) => !hasValue(resource, [...c.path, 'resources', 'requests', r]))
      if (missing.length === 0) continue
      findings.push(
        makeFinding(
          this,
          resource,
          c,
          ['resources', 'requests'],
          `Container "${c.name}" has no ${missing.join(' and ')} request.`,
          'Set resources.requests so the scheduler can place the pod correctly and capacity planning works.',
          { missing: missing.join(',') },
        ),
      )
    }
    return findings
  },
}
