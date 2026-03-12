import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import Turnstile from '../Turnstile';

describe('Turnstile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clean up window.turnstile
        delete window.turnstile;
        delete window.turnstileReset;
    });

    afterEach(() => {
        // Clean up any created scripts
        const script = document.getElementById('turnstile-script');
        if (script) script.remove();
    });

    it('renders loading state initially', () => {
        render(<Turnstile siteKey="test-key" onVerify={vi.fn()} />);

        expect(screen.getByText('Loading security check...')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
        const { container } = render(
            <Turnstile siteKey="test-key" onVerify={vi.fn()} className="custom-class" />
        );

        // Loading state should include custom class
        const loadingDiv = container.querySelector('.custom-class');
        expect(loadingDiv).toBeInTheDocument();
    });

    it('shows error state when hasError is triggered', async () => {
        // Simulate script load timeout by mocking
        vi.useFakeTimers();
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<Turnstile siteKey="test-key" onVerify={vi.fn()} onError={vi.fn()} />);

        // Advance past the 15 second timeout
        await act(async () => {
            await vi.advanceTimersByTimeAsync(16000);
        });

        // Should show error message
        expect(screen.getByText(/Security check failed/i)).toBeInTheDocument();

        vi.useRealTimers();
        consoleError.mockRestore();
    });

    it('calls onVerify callback when token is received', async () => {
        const onVerify = vi.fn();
        const mockToken = 'test-token-123';

        // Simulate turnstile being available
        window.turnstile = {
            render: vi.fn((container, options) => {
                // Simulate successful verification
                setTimeout(() => {
                    options.callback(mockToken);
                }, 10);
                return 'widget-123';
            }),
            reset: vi.fn(),
            remove: vi.fn(),
        };

        render(<Turnstile siteKey="test-key" onVerify={onVerify} />);

        await waitFor(() => {
            expect(onVerify).toHaveBeenCalledWith(mockToken);
        }, { timeout: 1000 });
    });

    it('calls onExpire callback when token expires', async () => {
        const onExpire = vi.fn();

        window.turnstile = {
            render: vi.fn((container, options) => {
                // Simulate token expiration
                setTimeout(() => {
                    options['expired-callback']();
                }, 10);
                return 'widget-123';
            }),
            reset: vi.fn(),
            remove: vi.fn(),
        };

        render(<Turnstile siteKey="test-key" onVerify={vi.fn()} onExpire={onExpire} />);

        await waitFor(() => {
            expect(onExpire).toHaveBeenCalled();
        }, { timeout: 1000 });
    });

    it('exposes reset function on window', async () => {
        window.turnstile = {
            render: vi.fn(() => 'widget-123'),
            reset: vi.fn(),
            remove: vi.fn(),
        };

        render(<Turnstile siteKey="test-key" onVerify={vi.fn()} />);

        await waitFor(() => {
            expect(typeof window.turnstileReset).toBe('function');
        });
    });

    it('cleans up on unmount', async () => {
        window.turnstile = {
            render: vi.fn(() => 'widget-123'),
            reset: vi.fn(),
            remove: vi.fn(),
        };

        const { unmount } = render(<Turnstile siteKey="test-key" onVerify={vi.fn()} />);

        await waitFor(() => {
            expect(window.turnstileReset).toBeDefined();
        });

        unmount();

        // turnstileReset should be undefined after unmount
        expect(window.turnstileReset).toBeUndefined();
    });

    it('handles error callback from widget', async () => {
        const onError = vi.fn();
        const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        window.turnstile = {
            render: vi.fn((container, options) => {
                // Simulate critical error (600010 = invalid site key)
                setTimeout(() => {
                    options['error-callback']('600010');
                }, 10);
                return 'widget-123';
            }),
            reset: vi.fn(),
            remove: vi.fn(),
        };

        render(<Turnstile siteKey="test-key" onVerify={vi.fn()} onError={onError} />);

        await waitFor(() => {
            expect(onError).toHaveBeenCalled();
        }, { timeout: 1000 });

        consoleWarn.mockRestore();
        consoleError.mockRestore();
    });
});
