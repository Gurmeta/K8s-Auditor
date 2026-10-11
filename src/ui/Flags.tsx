import { useId } from 'react'

const frame = { viewBox: '0 0 30 20', width: 20, height: 14, preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': true } as const

export function FlagBG() {
  return (
    <svg {...frame} className="rounded-[2px] border border-black/15">
      <rect width="30" height="20" fill="#ffffff" />
      <rect y="6.67" width="30" height="6.67" fill="#00966e" />
      <rect y="13.33" width="30" height="6.67" fill="#d62612" />
    </svg>
  )
}

export function FlagGB() {
  const id = useId()
  return (
    <svg viewBox="0 0 60 30" width="20" height="14" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="rounded-[2px] border border-black/15">
      <clipPath id={`${id}s`}>
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id={`${id}t`}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath={`url(#${id}s)`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${id}t)`} stroke="#c8102e" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#ffffff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
      </g>
    </svg>
  )
}
