import { containersOfKinds, jsonAt, makeFinding, WORKLOAD_KINDS } from './helpers'
import type { Finding, Rule } from '../types'

const SENSITIVE_NAME = /(password|passwd|secret|token|api[_-]?key|private[_-]?key|credential)/i

export const plaintextSecrets: Rule = {
  id: 'KSA-020',
  title: 'Sensitive value set in plaintext env var',
  severity: 'warning',
  appliesTo: WORKLOAD_KINDS,
  standards: [{ name: 'CIS', ref: 'Prefer using secrets as files over secrets as environment variables' }],
  check(resource) {
    const findings: Finding[] = []
    for (const c of containersOfKinds(resource, ['container', 'initContainer'])) {
      const env = jsonAt(resource, [...c.path, 'env'])
      if (!Array.isArray(env)) continue
      env.forEach((e, i) => {
        const { name, value } = (e ?? {}) as { name?: unknown; value?: unknown }
        // `valueFrom` (secretKeyRef etc.) has no `value`, so it is correctly ignored.
        if (typeof name !== 'string' || !SENSITIVE_NAME.test(name) || typeof value !== 'string' || value === '') return
        findings.push(
          makeFinding(
            this,
            resource,
            c,
            ['env', i],
            `Env var "${name}" in container "${c.name}" holds a hard-coded value that looks like a secret.`,
            'Store it in a Secret (or an external secret manager) and reference it with valueFrom.secretKeyRef.',
            { env: name },
          ),
        )
      })
    }
    return findings
  },
}
