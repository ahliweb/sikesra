import { Loader2, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SchoolPagesHeaderActions({
  loadData,
  loading,
  handleSave,
  saving,
  hasChanges,
}) {
  return [
    <Button
      key="refresh"
      variant="outline"
      size="sm"
      onClick={loadData}
      disabled={loading}
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      Refresh
    </Button>,
    <Button
      key="save"
      size="sm"
      onClick={handleSave}
      disabled={saving || !hasChanges}
    >
      {saving ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Save className="mr-2 h-4 w-4" />
      )}
      Save Changes
    </Button>,
  ];
}

export default SchoolPagesHeaderActions;
