import { containerSC, containersOfKinds, makeFinding, WORKLOAD_KINDS } from './helpers'
import type { Rule } from '../types'

export const privilegeEscalation: Rule = {
  id: 'KSA-010',
  title: 'Privilege escalation not disabled',
  severity: 'warning',
  appliesTo: WORKLOAD_KINDS,
  standards: [
    { name: 'PSS', ref: 'Restricted – Privilege Escalation' },
    { name: 'CIS', ref: 'Minimize the admission of containers with allowPrivilegeEscalation' },
  ],
  check(resource) {
    return containersOfKinds(resource, ['container', 'initContainer'])
      .filter((c) => containerSC(resource, c, 'allowPrivilegeEscalation') !== false)
      .map((c) =>
        makeFinding(
          this,
          resource,
          c,
          ['securityContext', 'allowPrivilegeEscalation'],
          `Container "${c.name}" does not set allowPrivilegeEscalation: false (the default is true).`,
          'Set securityContext.allowPrivilegeEscalation: false so processes cannot gain more privileges than their parent.',
        ),
      )
  },
}
