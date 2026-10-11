import { Component, type ReactNode } from 'react'
import { I18nContext } from '../i18n/context'

interface State {
  failed: boolean
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  static contextType = I18nContext
  declare context: React.ContextType<typeof I18nContext>

  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Unhandled UI error', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    const t = this.context?.t
    return (
      <div role="alert" className="mx-auto max-w-lg space-y-4 px-5 py-20">
        <h1 className="text-lg font-semibold text-crit">{t?.('error.title') ?? 'The analysis crashed'}</h1>
        <p className="text-sm text-dim">{t?.('error.text')}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          {t?.('error.reload') ?? 'Reload'}
        </button>
      </div>
    )
  }
}
