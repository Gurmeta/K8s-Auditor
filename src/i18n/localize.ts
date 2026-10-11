import type { AppliedFix } from '../core/fixer'
import type { Finding, Rule } from '../core/types'
import { findingBg, fixBg, rulesBg } from './rules-bg'
import type { Lang } from './messages'

export const ruleTitle = (lang: Lang, rule: Rule): string =>
  (lang === 'bg' && rulesBg[rule.id]?.title) || rule.title

export const findingText = (lang: Lang, finding: Finding): { message: string; how: string } =>
  (lang === 'bg' && findingBg(finding)) || { message: finding.message, how: finding.recommendation }

export const fixText = (lang: Lang, fix: AppliedFix): string =>
  (lang === 'bg' && fixBg(fix)) || fix.description
