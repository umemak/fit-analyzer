import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-6">
              <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">エラーが発生しました</h1>
              <p className="text-muted-foreground">
                申し訳ございません。ページの読み込み中にエラーが発生しました。
              </p>
            </div>

            {this.state.error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <h2 className="font-semibold text-destructive mb-2">エラー詳細:</h2>
                <pre className="text-xs overflow-auto p-2 bg-background rounded whitespace-pre-wrap break-all">
                  {this.state.error.toString()}
                </pre>
              </div>
            )}

            {this.state.errorInfo && (
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <h2 className="font-semibold mb-2">スタックトレース:</h2>
                <pre className="text-xs overflow-auto p-2 bg-background rounded whitespace-pre-wrap break-all max-h-64">
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  window.location.reload();
                }}
              >
                ページを再読み込み
              </Button>
              <Button variant="outline" onClick={() => window.location.href = "/"}>
                ホームに戻る
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
