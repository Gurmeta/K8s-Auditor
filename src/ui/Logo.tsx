export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M16 3 27 9.5v13L16 29 5 22.5v-13z" strokeWidth="2.2" />
      <path d="m11 16.5 3.2 3.2L21 12.5" strokeWidth="2.4" />
    </svg>
  )
}
