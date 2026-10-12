import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useI18n } from '../i18n/context'

type Theme = 'light' | 'dark'

const current = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Sun() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function Moon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}

export function ThemeToggle() {
  const { t } = useI18n()
  const [theme, setTheme] = useState<Theme>(current)
  const button = useRef<HTMLButtonElement>(null)
  const next: Theme = theme === 'dark' ? 'light' : 'dark'

  const commit = () => {
    document.documentElement.dataset.theme = next
    setTheme(next)
    try {
      localStorage.setItem('theme', next)
    } catch {
      // storage can be blocked; the choice then lasts until reload
    }
  }

  const toggle = () => {
    const root = document.documentElement

    if (!document.startViewTransition || prefersReducedMotion()) {
      root.setAttribute('data-theme-switching', '')
      commit()
      window.setTimeout(() => root.removeAttribute('data-theme-switching'), 200)
      return
    }

    const box = button.current!.getBoundingClientRect()
    const x = box.left + box.width / 2
    const y = box.top + box.height / 2
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

    const transition = document.startViewTransition(() => flushSync(commit))
    transition.ready.then(() =>
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 500, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      ),
    )
  }

  const dark = theme === 'dark'
  const icon = 'absolute top-1/2 grid size-[26px] -translate-y-1/2 place-items-center transition-[transform,color] duration-300'

  return (
    <button
      ref={button}
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={t(dark ? 'theme.toLight' : 'theme.toDark')}
      onClick={toggle}
      className="relative h-8 w-16 shrink-0 rounded-full border border-line bg-panel transition-[border-color,scale] duration-150 ease-out before:absolute before:-inset-1 before:content-[''] hover:border-dim active:scale-95"
    >
      <span
        aria-hidden="true"
        className="absolute top-[3px] left-[3px] size-[24px] rounded-full bg-k8s transition-transform duration-300 ease-out"
        style={{ transform: dark ? 'translateX(32px)' : 'none' }}
      />
      <span className={`${icon} left-[3px] ${dark ? 'rotate-90 scale-75 text-dim' : 'rotate-0 scale-100 text-ink'}`}>
        <Sun />
      </span>
      <span className={`${icon} right-[3px] ${dark ? 'rotate-0 scale-100 text-ink' : '-rotate-90 scale-75 text-dim'}`}>
        <Moon />
      </span>
    </button>
  )
}
