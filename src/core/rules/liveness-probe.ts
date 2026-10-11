import { containersOfKinds, hasValue, LONG_RUNNING_KINDS, makeFinding } from './helpers'
import type { Rule } from '../types'

export const livenessProbe: Rule = {
  id: 'KSA-004',
  title: 'livenessProbe not set',
  severity: 'warning',
  appliesTo: LONG_RUNNING_KINDS,
  standards: [],
  check(resource) {
    return containersOfKinds(resource, ['container'])
      .filter((c) => !hasValue(resource, [...c.path, 'livenessProbe']))
      .map((c) =>
        makeFinding(
          this,
          resource,
          c,
          ['livenessProbe'],
          `Container "${c.name}" has no livenessProbe.`,
          'Add a livenessProbe so Kubernetes restarts the container if it hangs or deadlocks.',
        ),
      )
  },
}
