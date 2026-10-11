import { containerSC, containersOfKinds, makeFinding, WORKLOAD_KINDS } from './helpers'
import type { Rule } from '../types'

export const privileged: Rule = {
  id: 'KSA-008',
  title: 'Container runs in privileged mode',
  severity: 'critical',
  appliesTo: WORKLOAD_KINDS,
  standards: [
    { name: 'PSS', ref: 'Baseline – Privileged Containers' },
    { name: 'CIS', ref: 'Minimize the admission of privileged containers' },
  ],
  check(resource) {
    return containersOfKinds(resource, ['container', 'initContainer'])
      .filter((c) => containerSC(resource, c, 'privileged') === true)
      .map((c) =>
        makeFinding(
          this,
          resource,
          c,
          ['securityContext', 'privileged'],
          `Container "${c.name}" runs privileged: it has nearly all host capabilities and can escape to the node.`,
          'Remove privileged: true. Grant only the specific capabilities the workload needs via capabilities.add.',
        ),
      )
  },
}
