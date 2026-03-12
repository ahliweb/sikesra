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

function SidebarMenuEditGroupDialog({
  open,
  onOpenChange,
  t,
  groupEditForm,
  setGroupEditForm,
  onSave,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('sidebar_manager.edit_group')}</DialogTitle>
          <DialogDescription>
            {t('sidebar_manager.dialogs.edit_group_desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('sidebar_manager.group_label')}</Label>
            <Input
              value={groupEditForm.label}
              onChange={(event) => setGroupEditForm({ ...groupEditForm, label: event.target.value })}
              placeholder={t('sidebar_manager.group_name')}
            />
          </div>

          <div className="space-y-2">
            <Label>Order</Label>
            <Input
              type="number"
              value={groupEditForm.order}
              onChange={(event) => setGroupEditForm({ ...groupEditForm, order: event.target.value })}
              placeholder="0"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('sidebar_manager.cancel')}</Button>
          <Button onClick={onSave}>{t('sidebar_manager.save_group')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SidebarMenuEditGroupDialog;
