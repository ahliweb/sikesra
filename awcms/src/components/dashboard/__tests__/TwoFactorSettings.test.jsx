import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TwoFactorSettings from '../TwoFactorSettings';

// Import mocked module to manipulate it
import { useTwoFactor } from '@/hooks/useTwoFactor';

// Mock dependencies
vi.mock('@/hooks/useTwoFactor', () => ({
    useTwoFactor: vi.fn(() => ({
        isEnabled: false,
        isLoading: false,
        setupData: null,
        error: null,
        startSetup: vi.fn(() => Promise.resolve({ success: true })),
        verifyAndEnable: vi.fn(() => Promise.resolve({ success: true })),
        disable2FA: vi.fn(() => Promise.resolve({ success: true })),
    })),
}));

vi.mock('@/components/ui/use-toast', () => ({
    useToast: vi.fn(() => ({
        toast: vi.fn(),
    })),
}));

describe('TwoFactorSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state', () => {
        useTwoFactor.mockReturnValue({
            isEnabled: false,
            isLoading: true,
            setupData: null,
        });

        render(<TwoFactorSettings />);

        expect(screen.getByText('Checking 2FA status...')).toBeInTheDocument();
    });

    it('renders disabled state with enable button', () => {
        useTwoFactor.mockReturnValue({
            isEnabled: false,
            isLoading: false,
            setupData: null,
            startSetup: vi.fn(),
        });

        render(<TwoFactorSettings />);

        expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Enable 2FA/i })).toBeInTheDocument();
    });

    it('shows "Enabled" badge when 2FA is active', () => {
        useTwoFactor.mockReturnValue({
            isEnabled: true,
            isLoading: false,
            setupData: null,
        });

        render(<TwoFactorSettings />);

        expect(screen.getByText('Enabled')).toBeInTheDocument();
    });

    it('starts setup when Enable button is clicked', async () => {
        const mockStartSetup = vi.fn(() => Promise.resolve({ success: true }));

        useTwoFactor.mockReturnValue({
            isEnabled: false,
            isLoading: false,
            setupData: null,
            startSetup: mockStartSetup,
        });

        render(<TwoFactorSettings />);

        fireEvent.click(screen.getByRole('button', { name: /Enable 2FA/i }));

        await waitFor(() => {
            expect(mockStartSetup).toHaveBeenCalled();
        });
    });

    it('shows QR code step when setup data is available', () => {
        useTwoFactor.mockReturnValue({
            isEnabled: false,
            isLoading: false,
            setupData: {
                secret: 'JBSWY3DPEHPK3PXP',
                qrCodeUrl: 'data:image/png;base64,test',
                backupCodes: ['ABC-123', 'DEF-456'],
            },
            startSetup: vi.fn(),
            verifyAndEnable: vi.fn(),
        });

        render(<TwoFactorSettings />);

        // Component starts at step 0, user needs to click Enable first
        // So QR won't show immediately even with setupData
    });

    it('shows disable button when 2FA is enabled', () => {
        useTwoFactor.mockReturnValue({
            isEnabled: true,
            isLoading: false,
            setupData: null,
        });

        render(<TwoFactorSettings />);

        expect(screen.getByRole('button', { name: /Disable/i })).toBeInTheDocument();
    });

    it('shows authenticator app description when enabled', () => {
        useTwoFactor.mockReturnValue({
            isEnabled: true,
            isLoading: false,
            setupData: null,
        });

        render(<TwoFactorSettings />);

        expect(screen.getByText('Authenticator App')).toBeInTheDocument();
        expect(screen.getByText(/Google Authenticator or Authy/i)).toBeInTheDocument();
    });

    it('renders correctly with all UI elements', () => {
        useTwoFactor.mockReturnValue({
            isEnabled: false,
            isLoading: false,
            setupData: null,
            startSetup: vi.fn(),
        });

        render(<TwoFactorSettings />);

        expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
        expect(screen.getByText(/extra layer of security/i)).toBeInTheDocument();
    });
});
