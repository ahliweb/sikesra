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

function SidebarMenuEditItemDialog({
  open,
  onOpenChange,
  t,
  editForm,
  setEditForm,
  existingGroups,
  editingItem,
  onSave,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('sidebar_manager.edit_item')}</DialogTitle>
          <DialogDescription>
            {t('sidebar_manager.dialogs.edit_item_desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('sidebar_manager.label')}</Label>
            <Input
              value={editForm.label}
              onChange={(event) => setEditForm({ ...editForm, label: event.target.value })}
              placeholder={t('sidebar_manager.label')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('sidebar_manager.group_label')}</Label>
              <div className="relative">
                <Input
                  list="sidebar-groups-list"
                  value={editForm.group_label}
                  onChange={(event) => setEditForm({ ...editForm, group_label: event.target.value })}
                  placeholder="General"
                />
                <datalist id="sidebar-groups-list">
                  {existingGroups.map((groupName) => (
                    <option key={groupName} value={groupName} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('sidebar_manager.group_order')}</Label>
              <Input
                type="number"
                value={editForm.group_order}
                onChange={(event) => setEditForm({ ...editForm, group_order: event.target.value })}
                placeholder="0"
                min="0"
              />
              <p className="text-[10px] text-slate-500">{t('sidebar_manager.dialogs.group_order_helper')}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('sidebar_manager.key')}</Label>
            <Input value={editingItem?.key || ''} disabled className="bg-muted" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('sidebar_manager.cancel')}</Button>
          <Button onClick={onSave}>{t('sidebar_manager.save_changes')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SidebarMenuEditItemDialog;
