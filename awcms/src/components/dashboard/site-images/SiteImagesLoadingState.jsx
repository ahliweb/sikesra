import { Image as ImageIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPageLayout, PageHeader } from '@/templates/flowbite-admin';

function SiteImagesLoadingState() {
  return (
    <AdminPageLayout requiredPermission={['tenant.school_pages.read', 'platform.school_pages.read']}>
      <PageHeader
        title="Site Images"
        description="Manage hero images, section images, and gallery collections"
        icon={ImageIcon}
        breadcrumbs={[{ label: 'Site Images', icon: ImageIcon }]}
      />

      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </AdminPageLayout>
  );
}

export default SiteImagesLoadingState;
