import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function TagsHeaderActions({
  showTrash,
  canSoftDelete,
  canCreate,
  onToggleTrash,
  onCreate,
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {(canSoftDelete || showTrash) && (
        <Button
          variant={showTrash ? 'destructive' : 'outline'}
          onClick={onToggleTrash}
          className={showTrash ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'text-muted-foreground hover:text-foreground'}
        >
          {showTrash ? 'View Active Tags' : 'Trash / Deleted'}
          <Trash2 className="ml-2 h-4 w-4" />
        </Button>
      )}

      {!showTrash && canCreate && (
        <Button onClick={onCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Create Tag
        </Button>
      )}
    </div>
  );
}

export default TagsHeaderActions;
