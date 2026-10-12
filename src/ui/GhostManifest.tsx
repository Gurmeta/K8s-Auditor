import { useEffect, useRef } from 'react'
import type { Severity } from '../core/types'

interface Line {
  text: string
  mark?: { severity: Severity; rule: string }
}

const LINES: Line[] = [
  { text: 'apiVersion: apps/v1' },
  { text: 'kind: Deployment' },
  { text: 'metadata:' },
  { text: '  name: web' },
  { text: 'spec:' },
  { text: '  replicas: 1', mark: { severity: 'info', rule: 'KSA-021' } },
  { text: '  template:' },
  { text: '    spec:' },
  { text: '      containers:' },
  { text: '        - name: web', mark: { severity: 'warning', rule: 'KSA-002' } },
  { text: '          image: nginx:latest', mark: { severity: 'warning', rule: 'KSA-005' } },
  { text: '          ports:' },
  { text: '            - containerPort: 80' },
  { text: '          securityContext:' },
  { text: '            privileged: true', mark: { severity: 'critical', rule: 'KSA-008' } },
]

const CYCLE_SECONDS = 12
// Matches the scan keyframes: the line travels between 4% and 76% of the cycle.
const reachedAt = (row: number) => CYCLE_SECONDS * (0.04 + (0.72 * (row + 0.5)) / LINES.length)

const SEVERITY_VAR: Record<Severity, string> = {
  critical: 'var(--color-crit)',
  warning: 'var(--color-warn)',
  info: 'var(--color-info)',
}

export function GhostManifest() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) el.removeAttribute('data-idle')
      else el.setAttribute('data-idle', '')
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="ghost"
      style={{ '--cycle': `${CYCLE_SECONDS}s`, '--rows': LINES.length } as React.CSSProperties}
    >
      <div className="ghost-scan" />
      {LINES.map(({ text, mark }, row) => (
        <div key={row} className="ghost-line">
          {text}
          {mark && (
            <span
              className="ghost-mark"
              style={{ '--sev': SEVERITY_VAR[mark.severity], '--d': `${reachedAt(row).toFixed(2)}s` } as React.CSSProperties}
            >
              {mark.rule}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
