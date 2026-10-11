import { containersOfKinds, hasValue, makeFinding, WORKLOAD_KINDS } from './helpers'
import type { Rule } from '../types'

export const missingSecurityContext: Rule = {
  id: 'KSA-014',
  title: 'No securityContext defined',
  severity: 'info',
  appliesTo: WORKLOAD_KINDS,
  standards: [{ name: 'NSA-CISA', ref: 'Kubernetes Hardening Guide – Pod security' }],
  check(resource) {
    if (!resource.podSpecPath) return []
    const podHasContext = hasValue(resource, [...resource.podSpecPath, 'securityContext'])
    return containersOfKinds(resource, ['container', 'initContainer'])
      .filter((c) => !podHasContext && !hasValue(resource, [...c.path, 'securityContext']))
      .map((c) =>
        makeFinding(
          this,
          resource,
          c,
          ['securityContext'],
          `Container "${c.name}" has no securityContext at container or pod level, so every hardening setting uses the insecure default.`,
          'Add a securityContext (runAsNonRoot, allowPrivilegeEscalation: false, drop ALL capabilities, seccomp RuntimeDefault).',
        ),
      )
  },
}
