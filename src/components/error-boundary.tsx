import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { reportLovableError } from "@/lib/lovable-error-reporting";

interface Props {
  children: ReactNode;
  /** Changing this value resets the boundary (e.g. the current pathname). */
  resetKey?: unknown;
  title?: string;
}

interface State {
  error: Error | null;
}

/** Catches render errors in a section and shows a recoverable fallback instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
    reportLovableError(error, { boundary: "section_error_boundary" });
  }

  override componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <AlertTriangle className="size-6 text-destructive" />
        <div>
          <p className="text-sm font-semibold text-card-foreground">{this.props.title ?? "This section couldn't be displayed"}</p>
          <p className="mt-1 text-xs text-muted-foreground">Something went wrong while rendering it. Your data wasn't changed.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => this.setState({ error: null })}>
          <RotateCcw /> Try again
        </Button>
      </div>
    );
  }
}
