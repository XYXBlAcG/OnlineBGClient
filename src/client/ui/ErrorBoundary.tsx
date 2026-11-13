import { Component, type ErrorInfo, type ReactNode } from "react";
import { recordClientLog } from "../diagnostics";

export class ErrorBoundary extends Component<
  {
    scope: string;
    children: ReactNode;
    onReset?: () => void;
  },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    recordClientLog(
      "render",
      `${this.props.scope}\n${error.stack ?? error.message}\n${info.componentStack ?? ""}`,
    );
  }

  private reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="error-boundary" role="alert">
        <h2>界面加载失败</h2>
        <p>
          {this.props.scope === "game"
            ? "牌桌遇到了问题，可以重新加载；对局不会因此丢失。"
            : "界面遇到了问题，重新加载后可以继续。"}
        </p>
        <div className="error-boundary-actions">
          <button type="button" className="primary-button" onClick={this.reset}>
            重新加载
          </button>
        </div>
      </section>
    );
  }
}
