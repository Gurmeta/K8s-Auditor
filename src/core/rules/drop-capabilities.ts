import { containersOfKinds, jsonAt, makeFinding, WORKLOAD_KINDS } from './helpers'
import type { Rule } from '../types'

export const dropCapabilities: Rule = {
  id: 'KSA-011',
  title: 'Linux capabilities not dropped',
  severity: 'warning',
  appliesTo: WORKLOAD_KINDS,
  standards: [{ name: 'PSS', ref: 'Restricted – Capabilities' }],
  check(resource) {
    return containersOfKinds(resource, ['container', 'initContainer'])
      .filter((c) => {
        const drop = jsonAt(resource, [...c.path, 'securityContext', 'capabilities', 'drop'])
        return !(Array.isArray(drop) && drop.includes('ALL'))
      })
      .map((c) =>
        makeFinding(
          this,
          resource,
          c,
          ['securityContext', 'capabilities', 'drop'],
          `Container "${c.name}" does not drop ALL Linux capabilities.`,
          'Set capabilities.drop: ["ALL"] and add back only what is strictly required (e.g. NET_BIND_SERVICE).',
        ),
      )
  },
}
