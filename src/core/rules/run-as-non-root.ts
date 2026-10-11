import { containersOfKinds, effectiveSC, makeFinding, WORKLOAD_KINDS } from './helpers'
import type { Rule } from '../types'

export const runAsNonRoot: Rule = {
  id: 'KSA-009',
  title: 'Container may run as root',
  severity: 'warning',
  appliesTo: WORKLOAD_KINDS,
  standards: [
    { name: 'PSS', ref: 'Restricted – Running as Non-root' },
    { name: 'CIS', ref: 'Minimize the admission of root containers' },
  ],
  check(resource) {
    const findings = []
    for (const c of containersOfKinds(resource, ['container', 'initContainer'])) {
      const nonRoot = effectiveSC(resource, c, 'runAsNonRoot')
      const user = effectiveSC(resource, c, 'runAsUser')
      const explicitRoot = nonRoot === false || user === 0
      const safe = !explicitRoot && (nonRoot === true || (typeof user === 'number' && user > 0))
      if (safe) continue
      findings.push(
        makeFinding(
          this,
          resource,
          c,
          ['securityContext', 'runAsNonRoot'],
          explicitRoot
            ? `Container "${c.name}" is explicitly configured to run as root.`
            : `Container "${c.name}" does not enforce runAsNonRoot; it runs as root if the image defaults to UID 0.`,
          'Set securityContext.runAsNonRoot: true (and a non-zero runAsUser) at container or pod level.',
          { explicit: String(explicitRoot) },
        ),
      )
    }
    return findings
  },
}
