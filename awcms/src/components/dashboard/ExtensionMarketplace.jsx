
import { useState } from 'react';
import { Download, Star, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { cn } from '@/lib/utils';

// Mock Data for Marketplace
const MARKETPLACE_EXTENSIONS = [
  {
    id: 'ext-analytics',
    name: 'Advanced Analytics',
    slug: 'advanced-analytics',
    description: 'Detailed dashboard analytics with charts, user journey tracking, and export capabilities.',
    version: '2.1.0',
    author: 'CMS Team',
    icon: '📊',
    rating: 4.8,
    downloads: '1.2k',
    verified: true
  },
  {
    id: 'ext-newsletter',
    name: 'Newsletter Manager',
    slug: 'newsletter-manager',
    description: 'Create, schedule, and send newsletters directly from your CMS. Includes templates.',
    version: '1.0.5',
    author: 'EmailPro',
    icon: '📧',
    rating: 4.5,
    downloads: '850',
    verified: true
  },
  {
    id: 'ext-backup',
    name: 'Auto Backup',
    slug: 'auto-backup',
    description: 'Automated daily backups of your content to secure storage. Restore with one click.',
    version: '1.2.0',
    author: 'SysAdmin',
    icon: '💾',
    rating: 4.9,
    downloads: '2k',
    verified: true
  },
  {
    id: 'ext-seo-pro',
    name: 'SEO Pro',
    slug: 'seo-pro',
    description: 'Advanced SEO tools, meta tag generator, sitemap management, and keyword analysis.',
    version: '3.0.1',
    author: 'SEO Master',
    icon: '🔍',
    rating: 4.7,
    downloads: '3.5k',
    verified: true
  }
];

function ExtensionMarketplace({ onInstall }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [installing, setInstalling] = useState(null);

  const handleInstall = async (ext) => {
    setInstalling(ext.id);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const payload = {
        name: ext.name,
        slug: ext.slug,
        description: ext.description,
        version: ext.version,
        author: ext.author,
        icon: ext.icon,
        is_active: true,
        created_by: user.id,
        config: { installed_from: 'marketplace', original_id: ext.id },
        tenant_id: currentTenant?.id || null
      };

      const { error } = await supabase
        .from('extensions')
        .insert([payload]);

      if (error) {
        if (error.code === '23505') { // Unique violation
          throw new Error("This extension is already installed.");
        }
        throw error;
      }

      toast({
        title: "Installation Complete",
        description: `${ext.name} has been successfully installed and activated.`
      });

      if (onInstall) onInstall();

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Installation Failed",
        description: error.message
      });
    } finally {
      setInstalling(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-8 py-10 shadow-sm">
        <div className="absolute right-0 top-0 p-12 opacity-10">
          <div className="h-64 w-64 rounded-full bg-primary/30 blur-3xl"></div>
        </div>
        <h2 className="text-3xl font-bold mb-2 text-foreground">Extension Marketplace</h2>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Discover and install plugins to supercharge your CMS. From analytics to SEO,
          find the tools you need to grow.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {MARKETPLACE_EXTENSIONS.map((ext) => (
          <div key={ext.id} className="group flex flex-col rounded-2xl border border-border/60 bg-card/75 shadow-sm transition-shadow hover:shadow-md">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/70 bg-background/80 text-2xl text-foreground shadow-sm">
                  {ext.icon}
                </div>
                {ext.verified && (
                  <Badge variant="secondary" className="flex gap-1 border-primary/20 bg-primary/10 text-primary">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </Badge>
                )}
              </div>

              <h3 className="mb-2 text-lg font-bold text-foreground transition-colors group-hover:text-primary">{ext.name}</h3>
              <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                {ext.description}
              </p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-3 w-3 fill-current" />
                  <span>{ext.rating}</span>
                </div>
                <span>{ext.downloads} installs</span>
                <span>v{ext.version}</span>
              </div>
            </div>

            <div className="rounded-b-2xl border-t border-border/60 bg-card/60 p-4">
              <Button
                className={cn(
                  'w-full rounded-xl',
                  installing === ext.id
                    ? 'bg-primary/80 text-primary-foreground'
                    : 'bg-primary text-primary-foreground hover:opacity-95'
                )}
                onClick={() => handleInstall(ext)}
                disabled={!!installing}
              >
                {installing === ext.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Installing...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Install Extension
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ExtensionMarketplace;
