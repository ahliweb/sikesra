import { RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SidebarMenuHeaderActions({
  t,
  fetchMenu,
  loading,
  hasChanges,
  handleSaveOrder,
  isSaving,
}) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" onClick={() => fetchMenu()} disabled={loading}>
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {t('sidebar_manager.refresh')}
      </Button>
      {hasChanges && (
        <Button onClick={handleSaveOrder} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? t('sidebar_manager.saving') : t('sidebar_manager.save_order')}
        </Button>
      )}
    </div>
  );
}

export default SidebarMenuHeaderActions;
