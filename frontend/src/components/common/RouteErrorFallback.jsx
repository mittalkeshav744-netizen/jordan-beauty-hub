import { Component } from 'react'

import Button from './Button'

/**
 * Catches lazy-route / chunk load failures (common after a rebuild with a stale tab)
 * so the owner portal does not go fully blank.
 */
export default class RouteErrorFallback extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'This page failed to load.',
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div role="alert" className="mx-auto max-w-lg space-y-4 rounded-card border border-line bg-cream p-6 text-center">
        <h2 className="font-display text-xl font-semibold text-ink">Page failed to load</h2>
        <p className="text-sm text-muted">
          The app was updated. Refresh once to load the latest files.
        </p>
        <p className="text-xs text-muted break-all">{this.state.message}</p>
        <Button type="button" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>
    )
  }
}
