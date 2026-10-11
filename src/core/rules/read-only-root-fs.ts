import { containerSC, containersOfKinds, makeFinding, WORKLOAD_KINDS } from './helpers'
import type { Rule } from '../types'

export const readOnlyRootFs: Rule = {
  id: 'KSA-012',
  title: 'Root filesystem is writable',
  severity: 'info',
  appliesTo: WORKLOAD_KINDS,
  standards: [{ name: 'NSA-CISA', ref: 'Kubernetes Hardening Guide – Immutable container file systems' }],
  check(resource) {
    return containersOfKinds(resource, ['container', 'initContainer'])
      .filter((c) => containerSC(resource, c, 'readOnlyRootFilesystem') !== true)
      .map((c) =>
        makeFinding(
          this,
          resource,
          c,
          ['securityContext', 'readOnlyRootFilesystem'],
          `Container "${c.name}" has a writable root filesystem, which lets an attacker drop binaries or modify config.`,
          'Set readOnlyRootFilesystem: true and mount emptyDir volumes for paths that must be writable (e.g. /tmp).',
        ),
      )
  },
}
