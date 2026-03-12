import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service here
        console.error("GlobalErrorBoundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });

        // Optional: Log to Supabase or other service
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    handleHome = () => {
        window.location.href = '/';
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                    <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full border border-slate-200">
                        <div className="mb-6 flex justify-center">
                            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                                <AlertTriangle className="h-8 w-8" />
                            </div>
                        </div>

                        <h1 className="text-2xl font-bold text-slate-800 mb-2">Something went wrong</h1>
                        <p className="text-slate-600 mb-6">
                            The application encountered an unexpected error. We apologize for the inconvenience.
                        </p>

                        {this.state.error && (
                            <div className="mb-6 p-4 bg-red-50 rounded-lg text-left overflow-auto max-h-48 border border-red-100">
                                <p className="font-mono text-xs text-red-800 break-words">
                                    {this.state.error.toString()}
                                </p>
                                {this.state.errorInfo && (
                                    <pre className="mt-2 font-mono text-[10px] text-red-700 whitespace-pre-wrap">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button onClick={this.handleReset} className="bg-blue-600 hover:bg-blue-700">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Reload Page
                            </Button>
                            <Button onClick={this.handleHome} variant="outline">
                                <Home className="mr-2 h-4 w-4" />
                                Return Home
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
