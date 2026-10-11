import { containersOfKinds, jsonAt, makeFinding, WORKLOAD_KINDS } from './helpers'
import type { Rule } from '../types'

export const seccompProfile: Rule = {
  id: 'KSA-013',
  title: 'No seccomp profile enforced',
  severity: 'warning',
  appliesTo: WORKLOAD_KINDS,
  standards: [{ name: 'PSS', ref: 'Restricted – Seccomp' }],
  check(resource) {
    const findings = []
    for (const c of containersOfKinds(resource, ['container', 'initContainer'])) {
      const own = jsonAt(resource, [...c.path, 'securityContext', 'seccompProfile', 'type'])
      const pod = resource.podSpecPath
        ? jsonAt(resource, [...resource.podSpecPath, 'securityContext', 'seccompProfile', 'type'])
        : undefined
      const type = own ?? pod
      if (type === 'RuntimeDefault' || type === 'Localhost') continue
      findings.push(
        makeFinding(
          this,
          resource,
          c,
          ['securityContext', 'seccompProfile'],
          type === 'Unconfined'
            ? `Container "${c.name}" runs with an Unconfined seccomp profile (all syscalls allowed).`
            : `Container "${c.name}" has no seccomp profile, so syscalls are not filtered.`,
          'Set securityContext.seccompProfile.type: RuntimeDefault at pod or container level.',
          { unconfined: String(type === 'Unconfined') },
        ),
      )
    }
    return findings
  },
}
