import { runRule } from '../engine'
import { checkInputSize } from '../limits'
import { parseManifests, type ParseError } from '../parser'
import { rules as allRules } from '../rules'
import type { Finding, FixSafety, Rule } from '../types'
import { FIXES } from './fixes'

export interface AppliedFix {
  ruleId: string
  resource: { kind: string; name: string }
  container?: string
  safety: FixSafety
  description: string
  params?: Record<string, string>
}

export interface FixOptions {
  include?: (ruleId: string) => boolean
  /** Fix only the findings this accepts, e.g. a single one picked in the editor. */
  only?: (finding: Finding) => boolean
  rules?: Rule[]
}

export interface FixResult {
  /** Fixed YAML; identical to the input when nothing was fixed or the input has syntax errors. */
  output: string
  fixes: AppliedFix[]
  errors: ParseError[]
}

export const fixableRuleIds = (): string[] => Object.keys(FIXES)

/**
 * Applies auto-fixes on the parsed YAML documents, so comments and key order survive.
 * Rules run in registry order and each sees the document as already patched by earlier fixes.
 */
export function autoFix(
  text: string,
  { include = () => true, only = () => true, rules = allRules }: FixOptions = {},
): FixResult {
  if (checkInputSize(text)) return { output: text, fixes: [], errors: [] }

  const { documents, resources, errors } = parseManifests(text)
  if (errors.length > 0) return { output: text, fixes: [], errors }

  const fixes: AppliedFix[] = []
  for (const rule of rules) {
    const fix = FIXES[rule.id]
    if (!fix || !include(rule.id)) continue
    for (const finding of runRule(rule, resources)) {
      if (!only(finding)) continue
      const resource = resources[finding.resourceIndex!]
      let outcome
      try {
        outcome = fix(resource, finding)
      } catch (error) {
        // e.g. a path that goes through a YAML alias: leave that spot for a manual fix.
        console.error(`Fix for ${rule.id} failed on ${finding.resource.kind}/${finding.resource.name}`, error)
        continue
      }
      if (outcome) {
        fixes.push({ ruleId: rule.id, resource: finding.resource, container: finding.container, ...outcome })
      }
    }
  }
  if (fixes.length === 0) return { output: text, fixes, errors }

  // The serializer prints `---` itself when docStart is set, so set it for every document but the first.
  // lineWidth 0 stops it from re-wrapping long strings.
  const output = documents
    .map((d, i) => {
      if (d.directives) d.directives.docStart = i > 0 ? true : null
      return d.toString({ lineWidth: 0 })
    })
    .join('')
  return { output, fixes, errors }
}
