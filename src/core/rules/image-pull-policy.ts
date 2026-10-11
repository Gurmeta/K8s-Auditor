import { containersOfKinds, imageOf, makeFinding, parseImage, WORKLOAD_KINDS } from './helpers'
import type { Rule } from '../types'

export const imagePullPolicy: Rule = {
  id: 'KSA-007',
  title: 'imagePullPolicy does not re-pull a mutable image',
  severity: 'info',
  appliesTo: WORKLOAD_KINDS,
  standards: [],
  check(resource) {
    const findings = []
    for (const c of containersOfKinds(resource, ['container', 'initContainer'])) {
      const image = imageOf(resource, c)
      const policy = resource.doc.getIn([...c.path, 'imagePullPolicy'])
      // An omitted policy defaults to Always for :latest, so only an explicit override is a problem.
      if (!image || !parseImage(image).mutable || typeof policy !== 'string' || policy === 'Always') continue
      findings.push(
        makeFinding(
          this,
          resource,
          c,
          ['imagePullPolicy'],
          `Container "${c.name}" uses a mutable image with imagePullPolicy "${policy}", so nodes may run stale or differing copies.`,
          'Pin a version tag; or remove imagePullPolicy / set it to Always if you must keep :latest.',
          { policy: String(policy) },
        ),
      )
    }
    return findings
  },
}
