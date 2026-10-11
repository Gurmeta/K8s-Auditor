import { jsonAt, makeFinding, WORKLOAD_KINDS } from './helpers'
import type { Finding, Rule } from '../types'

const FIELDS = [
  ['hostNetwork', 'shares the node network namespace (can sniff traffic and reach node-local services)'],
  ['hostPID', 'shares the node PID namespace (can see and signal host processes)'],
  ['hostIPC', 'shares the node IPC namespace (can access host shared memory)'],
] as const

export const hostNamespaces: Rule = {
  id: 'KSA-015',
  title: 'Pod shares host namespaces',
  severity: 'critical',
  appliesTo: WORKLOAD_KINDS,
  standards: [{ name: 'PSS', ref: 'Baseline – Host Namespaces' }],
  check(resource) {
    if (!resource.podSpecPath) return []
    const findings: Finding[] = []
    for (const [field, risk] of FIELDS) {
      if (jsonAt(resource, [...resource.podSpecPath, field]) !== true) continue
      findings.push(
        makeFinding(
          this,
          resource,
          undefined,
          [field],
          `Pod sets ${field}: true and ${risk}.`,
          `Remove ${field}: true unless this is a node-level agent that truly requires it.`,
          { field },
        ),
      )
    }
    return findings
  },
}
