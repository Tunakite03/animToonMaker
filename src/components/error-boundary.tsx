import { Component, Fragment, type ErrorInfo, type ReactNode } from "react"
import ErrorFallback from "@/app/error"

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  error: Error | null
  resetKey: number
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    error: null,
    resetKey: 0,
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[AnimToon ErrorBoundary]", error, errorInfo)
  }

  private handleReset = () => {
    this.setState((currentState) => ({
      error: null,
      resetKey: currentState.resetKey + 1,
    }))
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} reset={this.handleReset} />
    }

    return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>
  }
}
