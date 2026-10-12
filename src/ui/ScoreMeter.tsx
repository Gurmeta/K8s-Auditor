import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/context'
import { gradeOf } from '../core/scoring'

const SEGMENTS = 40

const tone = (score: number) => (score >= 80 ? 'var(--color-ok)' : score >= 60 ? 'var(--color-warn)' : 'var(--color-crit)')

function useCountUp(target: number | null): number | null {
  const [value, setValue] = useState(target)
  const from = useRef(target)

  useEffect(() => {
    const start = from.current
    if (target === null || start === null || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = target
      setValue(target)
      return
    }
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 700)
      const v = Math.round(start + (target - start) * (1 - (1 - p) ** 3))
      from.current = v
      setValue(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  return value
}

interface Props {
  score: number | null
  caption: string
}

export function ScoreMeter({ score, caption }: Props) {
  const { t } = useI18n()
  const shown = useCountUp(score)
  const filled = score === null ? 0 : Math.round((score / 100) * SEGMENTS)
  const color = score === null ? 'var(--color-dim)' : tone(score)

  return (
    <section aria-label={t('meter.region')} className="border-b border-line px-4 py-5 sm:px-5 lg:border-l">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-1 transition-colors duration-300" style={{ color }}>
          <span className="font-mono text-6xl leading-none font-semibold tabular-nums" aria-live="polite" aria-atomic="true">
            <span className="sr-only">{score === null ? t('meter.none') : t('meter.scoreOf', { score })}</span>
            <span aria-hidden="true">{shown ?? '--'}</span>
          </span>
          <span className="font-mono text-lg text-dim" aria-hidden="true">/100</span>
        </div>
        {score !== null && (
          <div
            key={gradeOf(score)}
            className="grade-swap font-mono text-3xl leading-none font-semibold"
            style={{ color }}
            aria-label={t('meter.grade', { grade: gradeOf(score) })}
          >
            {gradeOf(score)}
          </div>
        )}
      </div>
      <div className="mt-4 flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className="h-3 flex-1 rounded-[1px] transition-colors duration-150"
            style={{ backgroundColor: i < filled ? color : 'var(--color-line)', transitionDelay: `${i * 9}ms` }}
          />
        ))}
      </div>
      <p className="mt-3 text-sm text-dim">{caption}</p>
    </section>
  )
}
