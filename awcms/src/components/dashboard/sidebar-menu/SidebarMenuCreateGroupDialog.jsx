import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function SidebarMenuCreateGroupDialog({
  open,
  onOpenChange,
  t,
  newGroupForm,
  setNewGroupForm,
  onCreate,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('sidebar_manager.create_group')}</DialogTitle>
          <DialogDescription>
            {t('sidebar_manager.dialogs.create_group_desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('sidebar_manager.group_name')}</Label>
            <Input
              value={newGroupForm.label}
              onChange={(event) => setNewGroupForm({ ...newGroupForm, label: event.target.value })}
              placeholder="e.g., MARKETING"
            />
            <p className="text-[10px] text-slate-500">{t('sidebar_manager.dialogs.create_group_helper')}</p>
          </div>

          <div className="space-y-2">
            <Label>Order</Label>
            <Input
              type="number"
              value={newGroupForm.order}
              onChange={(event) => setNewGroupForm({ ...newGroupForm, order: event.target.value })}
              placeholder="10"
              min="1"
            />
            <p className="text-[10px] text-muted-foreground">{t('sidebar_manager.dialogs.create_group_order_helper')}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('sidebar_manager.cancel')}</Button>
          <Button
            onClick={onCreate}
            disabled={!newGroupForm.label.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {t('sidebar_manager.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SidebarMenuCreateGroupDialog;
