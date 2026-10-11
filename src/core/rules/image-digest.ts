import { containersOfKinds, imageOf, makeFinding, parseImage, WORKLOAD_KINDS } from './helpers'
import type { Rule } from '../types'

export const imageDigest: Rule = {
  id: 'KSA-006',
  title: 'Image not pinned by digest',
  severity: 'info',
  appliesTo: WORKLOAD_KINDS,
  standards: [{ name: 'NSA-CISA', ref: 'Kubernetes Hardening Guide – Supply chain / image scanning' }],
  check(resource) {
    const findings = []
    for (const c of containersOfKinds(resource, ['container', 'initContainer'])) {
      const image = imageOf(resource, c)
      // Mutable (:latest / untagged) images are already reported by KSA-005.
      if (!image || parseImage(image).digest || parseImage(image).mutable) continue
      findings.push(
        makeFinding(
          this,
          resource,
          c,
          ['image'],
          `Image "${image}" is pinned by tag only; tags can be re-pushed to different content.`,
          'Reference the image by digest (image@sha256:...) for immutable, verifiable deployments.',
          { image },
        ),
      )
    }
    return findings
  },
}
