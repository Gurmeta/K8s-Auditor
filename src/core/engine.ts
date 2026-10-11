import { checkInputSize, type TooLarge } from './limits'
import { parseManifests, type ParseError } from './parser'
import { rules as allRules } from './rules'
import type { Finding, ResourceCtx, Rule } from './types'

export interface ResourceSummary {
  index: number
  kind: string
  name: string
  /** At least one rule applies to this kind; resources nothing checks (ConfigMap...) don't affect the score. */
  applicable: boolean
}

export interface LintResult {
  findings: Finding[]
  errors: ParseError[]
  resources: ResourceSummary[]
  /** Set when the input is over the size limit; nothing was analysed. */
  tooLarge: TooLarge | null
}

/** Identifies one finding across runs: the same rule at the same spot in the same resource. */
export const findingKey = (f: Finding): string => `${f.ruleId}|${f.resourceIndex}|${f.path.join('.')}`

export function runRule(rule: Rule, resources: ResourceCtx[]): Finding[] {
  return resources.flatMap((resource, resourceIndex) => {
    if (!rule.appliesTo.includes(resource.kind)) return []
    try {
      return rule.check(resource).map((f) => ({ ...f, resourceIndex }))
    } catch (error) {
      // One rule choking on an odd manifest must not take the other rules down with it.
      console.error(`Rule ${rule.id} failed on ${resource.kind}/${resource.name}`, error)
      return []
    }
  })
}

export function lint(text: string, rules: Rule[] = allRules): LintResult {
  const tooLarge = checkInputSize(text)
  if (tooLarge) return { findings: [], errors: [], resources: [], tooLarge }

  const { resources, errors } = parseManifests(text, { expand: true })
  return {
    tooLarge: null,
    findings: rules.flatMap((rule) => runRule(rule, resources)),
    errors,
    resources: resources.map((r, index) => ({
      index,
      kind: r.kind,
      name: r.name,
      applicable: rules.some((rule) => rule.appliesTo.includes(r.kind)),
    })),
  }
}
