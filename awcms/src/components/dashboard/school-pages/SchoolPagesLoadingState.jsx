import { School } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPageLayout, PageHeader } from '@/templates/flowbite-admin';

function SchoolPagesLoadingState() {
  return (
    <AdminPageLayout requiredPermission={['tenant.school_pages.read', 'platform.school_pages.read']}>
      <PageHeader
        title="School Website Pages"
        description="Manage content for your school's public website"
        icon={School}
        breadcrumbs={[{ label: 'School Pages', icon: School }]}
      />

      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </AdminPageLayout>
  );
}

export default SchoolPagesLoadingState;
