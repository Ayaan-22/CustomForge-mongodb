"use client";

import type React from "react";
import { Component } from "react";
import { ErrorState } from "@/components/patterns/error-state";

type State = { hasError: boolean; error: Error | null };
export class ErrorBoundary extends Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error) { console.error("[CustomForge] Error caught by boundary:", error); }
  render() {
    if (this.state.hasError) {
      return <ErrorState title="This view couldn’t display" message="Please reload the view to continue." onRetry={() => this.setState({ hasError: false, error: null })} />;
    }
    return this.props.children;
  }
}
