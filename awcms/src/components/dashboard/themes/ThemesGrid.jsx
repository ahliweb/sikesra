import { LayoutTemplate } from 'lucide-react';
import ThemeCard from '@/components/dashboard/themes/ThemeCard';

function ThemesGrid({
  loading,
  filteredThemes,
  isPlatformAdmin,
  canUpdate,
  onEdit,
  onActivate,
  onExport,
  onDuplicate,
  onDeleteRequest,
}) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {loading ? (
        [...Array(4)].map((_, index) => (
          <div key={index} className="h-64 animate-pulse rounded-xl bg-muted/50"></div>
        ))
      ) : filteredThemes.length === 0 ? (
        <div className="col-span-full rounded-xl border border-dashed border-border bg-card py-20 text-center text-muted-foreground">
          <LayoutTemplate className="mx-auto mb-4 h-12 w-12 opacity-20" />
          <p>No themes found matching your search.</p>
        </div>
      ) : (
        filteredThemes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isPlatformAdmin={isPlatformAdmin}
            canUpdate={canUpdate}
            onEdit={onEdit}
            onActivate={onActivate}
            onExport={onExport}
            onDuplicate={onDuplicate}
            onDeleteRequest={onDeleteRequest}
          />
        ))
      )}
    </div>
  );
}

export default ThemesGrid;
