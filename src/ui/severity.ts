import type { Severity } from '../core/types'

export const SEVERITIES: Severity[] = ['critical', 'warning', 'info']

export const SEVERITY_TEXT: Record<Severity, string> = { critical: 'text-crit', warning: 'text-warn', info: 'text-info' }

export const SEVERITY_GLYPH: Record<Severity, string> = { critical: '✕', warning: '!', info: 'i' }
