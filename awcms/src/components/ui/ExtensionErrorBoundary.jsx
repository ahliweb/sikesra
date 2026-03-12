import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

class ExtensionErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error(`[Extension Error] ${this.props.extensionName || 'Unknown Module'}:`, error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Alert variant="destructive" className="my-4 border-red-200 bg-red-50 text-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Extension Error</AlertTitle>
                    <AlertDescription>
                        <p>Module <strong>{this.props.extensionName || 'External Component'}</strong> encountered a crash.</p>
                        {this.state.error && <p className="text-xs mt-2 opacity-80 break-words font-mono bg-red-100 p-2 rounded">{this.state.error.message}</p>}

                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 border-red-300 text-red-700 hover:bg-red-100"
                            onClick={() => this.setState({ hasError: false })}
                        >
                            <RefreshCcw className="w-3 h-3 mr-2" />
                            Try Reloading
                        </Button>
                    </AlertDescription>
                </Alert>
            );
        }

        return this.props.children;
    }
}

export default ExtensionErrorBoundary;
