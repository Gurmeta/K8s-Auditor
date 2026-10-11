import { containersOfKinds, hasValue, LONG_RUNNING_KINDS, makeFinding } from './helpers'
import type { Rule } from '../types'

export const readinessProbe: Rule = {
  id: 'KSA-003',
  title: 'readinessProbe not set',
  severity: 'warning',
  appliesTo: LONG_RUNNING_KINDS,
  standards: [],
  check(resource) {
    return containersOfKinds(resource, ['container'])
      .filter((c) => !hasValue(resource, [...c.path, 'readinessProbe']))
      .map((c) =>
        makeFinding(
          this,
          resource,
          c,
          ['readinessProbe'],
          `Container "${c.name}" has no readinessProbe.`,
          'Add a readinessProbe so traffic is only routed to pods that can serve it (avoids errors during rollouts).',
        ),
      )
  },
}
