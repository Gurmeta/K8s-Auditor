import { containersOfKinds, imageOf, makeFinding, parseImage, WORKLOAD_KINDS } from './helpers'
import type { Rule } from '../types'

export const imageTag: Rule = {
  id: 'KSA-005',
  title: 'Image uses :latest or has no tag',
  severity: 'warning',
  appliesTo: WORKLOAD_KINDS,
  standards: [{ name: 'NSA-CISA', ref: 'Kubernetes Hardening Guide – Supply chain / image scanning' }],
  check(resource) {
    const findings = []
    for (const c of containersOfKinds(resource, ['container', 'initContainer'])) {
      const image = imageOf(resource, c)
      if (!image || !parseImage(image).mutable) continue
      const untagged = parseImage(image).tag === undefined
      findings.push(
        makeFinding(
          this,
          resource,
          c,
          ['image'],
          `Container "${c.name}" uses image "${image}" ${untagged ? 'without a tag (defaults to :latest)' : 'with the mutable :latest tag'}.`,
          'Pin an explicit version tag (ideally with a digest) so deployments are reproducible and rollbacks are possible.',
          { image, untagged: String(untagged) },
        ),
      )
    }
    return findings
  },
}
