import { Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ThemesHeaderActions({
  canUpdate,
  onImport,
  onCreate,
}) {
  return (
    <div className="flex w-full gap-2 sm:w-auto">
      <div className="relative">
        <input
          type="file"
          accept=".json"
          className="absolute inset-0 w-full cursor-pointer opacity-0"
          onChange={onImport}
          disabled={!canUpdate}
        />
        <Button variant="outline" className="w-full sm:w-auto">
          <Upload className="mr-2 h-4 w-4" /> Import
        </Button>
      </div>

      {canUpdate && (
        <Button onClick={onCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> New Theme
        </Button>
      )}
    </div>
  );
}

export default ThemesHeaderActions;
