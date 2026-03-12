import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PublicFooter from '../PublicFooter';

// Mock dependencies
vi.mock('@/lib/customSupabaseClient', () => {
    const builder = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.is = vi.fn(() => builder);
    builder.order = vi.fn(() => Promise.resolve({ data: [], error: null }));
    builder.then = (resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject);

    return {
        supabase: {
            from: vi.fn(() => builder),
        },
    };
});

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
        i18n: {
            language: 'en',
            exists: () => false,
        },
    }),
}));

const mockTenant = {
    id: 'test-tenant-123',
    name: 'Test Tenant',
};

const renderWithRouter = (ui) => {
    return render(
        <MemoryRouter>
            {ui}
        </MemoryRouter>
    );
};

const renderFooter = async () => {
    renderWithRouter(<PublicFooter tenant={mockTenant} />);
    await waitFor(() => {
        expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });
};

describe('PublicFooter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders footer element', async () => {
        await renderFooter();

        expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('displays brand logo and name', async () => {
        await renderFooter();

        expect(screen.getByText('AWCMS')).toBeInTheDocument();
        expect(screen.getByAltText('AWCMS')).toBeInTheDocument();
    });

    it('displays copyright with current year', async () => {
        await renderFooter();

        const currentYear = new Date().getFullYear();
        expect(screen.getByText(new RegExp(`© ${currentYear}`))).toBeInTheDocument();
    });

    it('displays contact information section', async () => {
        await renderFooter();

        expect(screen.getByText('public.contact_us')).toBeInTheDocument();
    });

    it('displays footer navigation links', async () => {
        await renderFooter();

        expect(screen.getByText('public.privacy_policy')).toBeInTheDocument();
        expect(screen.getByText('public.terms_of_service')).toBeInTheDocument();
        expect(screen.getByText('public.sitemap')).toBeInTheDocument();
    });

    it('displays social media buttons', async () => {
        await renderFooter();

        // Check for social media icon buttons (4 buttons for Facebook, Twitter, Instagram, LinkedIn)
        const allButtons = screen.getAllByRole('button');
        // Should have at least 4 social buttons
        expect(allButtons.length).toBeGreaterThanOrEqual(4);
    });

    it('has proper footer styling', async () => {
        await renderFooter();

        const footer = screen.getByRole('contentinfo');
        expect(footer).toHaveClass('bg-muted/80');
        expect(footer).toHaveClass('border-t');
    });
});
